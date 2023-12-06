import type { RouteHandler } from 'fastify';
import { Types } from 'mongoose';

import type { FormDataGetRoute, FormDataGetReply } from './routes';
import DBFormModel, { type DBForm } from '../../dbModels/form';
import DBFormDataModel, { type DBFormData } from '../../dbModels/formData';
import DBPrivilegeModel, { type DBPrivilege } from '../../dbModels/privilege';
import type { AllPrivilegeProps, FormElem } from '../../dbModels/_modelTypePartials';
import { errors } from '../../core/errors';
import { isCsrfGood } from '../../hooks/csrf';
import {
  type UserData,
  getUserData,
  isPrivBlocked,
  readDataPrivilegesQuery,
  combinePrivileges,
} from '../../utils/userAndPrivilegeChecks';
import {
  createPaginationPayload,
  getApiPathFromReqUrl,
  parseFormDataSortStringFromQueryString,
  parseSearchQuery,
} from '../../utils/parsingAndConverting';
import { getConfig } from '../../core/config';
import type { TransText } from '../../@types/form';

export type Data = {
  elemId: string;
  orderNr: number;
  value: unknown;
  valueType: string;
  label?: TransText;
  dataId?: string;
  dataMetaData?: {
    created: Date | undefined;
    edited: Date | null;
    owner?: string | null;
    createdBy?: string | null;
    editedBy?: string | null;
  };
};

// Read (GET)
export const formDataGet: RouteHandler<FormDataGetRoute> = async (req, res) => {
  // Query string
  const {
    getForm,
    dataId,
    elemId,
    flat,
    offset,
    limit,
    sort,
    s,
    sOper,
    sCase,
    includeDataIds,
    includeLabels,
    includeMeta,
    meAsCreator,
    meAsOwner,
    meAsEditor,
  } = req.query;
  const url = getApiPathFromReqUrl(req.url);

  // Get form and check that form exists
  const form = await DBFormModel.findOne<DBForm>({ url });
  if (!form) {
    return res.send(new errors.NOT_FOUND(`Could not find form with url "${req.url}"`));
  }

  if (!getForm && !dataId) {
    return res.send(
      new errors.FORM_DATA_BAD_REQUEST(
        `Both, "getForm" and "dataId" query string values were missing with url "${req.url}"`
      )
    );
  }

  // Create possible labels (for embedding them into data)
  const labels: { [key: string]: TransText } = {};
  if (includeLabels === 'embed') {
    for (let i = 0; i < form.form.formElems.length; i++) {
      const elem = form.form.formElems[i];
      labels[elem.elemId] = (elem.label as TransText) || {};
    }
  }

  // Get CSRF result
  const csrfIsGood = isCsrfGood(req);

  // Get user data
  const userData = await getUserData(req);

  const returnObject: FormDataGetReply = {};
  if (getForm) {
    const privilegeId = `form__${form.simpleId}__canUseForm`;
    const privilege = await DBPrivilegeModel.findOne<DBPrivilege>({ simpleId: privilegeId });
    const privError = isPrivBlocked(privilege?.privilegeAccess, userData, csrfIsGood);
    returnObject['$form'] = privError?.code || {
      ...form.form,
      formElems: form.form.formElems
        .filter(
          (elem) =>
            !elem.privileges?.read || !isPrivBlocked(elem.privileges?.read, userData, csrfIsGood)
        )
        // White list the formElem props to be returned with the form and normalize orderNr
        .map((elem, index) => ({
          elemId: elem.elemId,
          orderNr: index,
          elemType: elem.elemType,
          valueType: elem.valueType,
          classes: elem.classes,
          elemData: elem.elemData,
          label: elem.label,
          required: elem.required,
          validationRegExp: elem.validationRegExp,
          mustMatchValue: elem.mustMatchValue,
          validationFn: elem.validationFn,
          inputErrors: elem.inputErrors,
          doNotSave: elem.doNotSave,
        })),
    };
  }

  if (dataId) {
    let formData = null,
      paginationData = null,
      oneItem = false;
    const data: Data[][] = [];
    const meta: { owner?: string | null; created: Date; edited: Date | null }[] = [];

    const MAX_LIMIT = getConfig<number>('dataItemsMaxLimit', 500);
    const limiter = limit && limit < MAX_LIMIT ? Math.abs(limit) : MAX_LIMIT;
    const sorter = parseFormDataSortStringFromQueryString(sort, form);
    const paginationOptions = {
      offset: offset || 0,
      limit: limiter,
      sort: sorter,
      collation: {
        // https://www.mongodb.com/docs/manual/reference/collation-locales-defaults/#std-label-collation-languages-locales
        locale: getConfig<string>('dataCollationLocale', 'en'), // @TODO: add locale support (as a systemSetting and possibly to form as well)
      },
    };

    const isMultipleDataIds = Array.isArray(dataId) && dataId?.length > 1;
    if (dataId[0] === 'all' || isMultipleDataIds) {
      // Get all possible paginated formData

      const searchQuery = await parseSearchQuery(
        s,
        sOper,
        form,
        userData,
        csrfIsGood,
        sCase,
        meAsCreator,
        meAsOwner,
        meAsEditor
      );

      const dataObjectIds = isMultipleDataIds ? dataId.map((id) => new Types.ObjectId(id)) : null;
      const paginatedData = await DBFormDataModel.paginate<DBFormData>(
        {
          $and: [
            { formId: form.simpleId },
            ...(isMultipleDataIds ? [{ _id: { $in: dataObjectIds } }] : []),
            ...readDataPrivilegesQuery(userData, csrfIsGood),
            ...searchQuery,
            ...(elemId ? [{ 'data.elemId': { $in: elemId } }] : []),
          ],
        },
        paginationOptions
      );
      formData = paginatedData.docs || [];
      paginationData = paginatedData;
    } else if (dataId) {
      oneItem = true;
      // Get one formData item with dataId (search is ignored)
      formData = await DBFormDataModel.findOne<DBFormData>({
        $and: [
          { formId: form.simpleId },
          { _id: dataId[0] },
          ...readDataPrivilegesQuery(userData, csrfIsGood),
          ...(elemId ? [{ 'data.elemId': { $in: elemId } }] : []),
        ],
      });
    }

    if (Array.isArray(formData)) {
      // Check multiple formData privileges
      const dataIds: string[] = [];
      for (let i = 0; i < formData.length; i++) {
        const fd = formData[i];
        const mainPrivileges = combinePrivileges(
          form.formDataDefaultPrivileges.read,
          fd.privileges?.read || {}
        );
        const rawData = fd.data || [];
        const dataId = fd._id.toString();
        let dataMetaData = null;
        if (includeMeta === 'embed' || includeMeta === 'true') {
          dataMetaData = {
            created: fd.created.date,
            edited: fd.edited.length ? fd.edited[0].date : null,
            // @TODO: get actual usernames
            ...(userData.isSysAdmin
              ? {
                  owner: fd?.owner?.toString() || null,
                  createdBy: fd?.created.user?.toString() || null,
                  editedBy: fd?.edited[0]?.user?.toString() || null,
                }
              : {}),
          };
        }
        const dataSet = checkAndSetReadData(
          rawData,
          form.form.formElems,
          mainPrivileges,
          userData,
          csrfIsGood,
          includeDataIds === 'embed' ? dataId : null,
          includeLabels === 'embed' ? labels : null,
          includeMeta === 'embed' ? dataMetaData : null,
          elemId,
          fd.hasElemPrivileges
        );
        if (dataSet.length) {
          dataIds.push(dataId);
          data.push(dataSet);
          if (includeMeta === 'true' && dataMetaData) {
            meta.push(dataMetaData);
          }
        }
      }
      if (paginationData) {
        returnObject['$pagination'] = createPaginationPayload(paginationData);
      }
      if (includeDataIds === 'true') {
        returnObject['$dataIds'] = dataIds;
      }
      if (includeMeta === 'true') {
        returnObject['$dataMetaData'] = meta;
      }
    } else {
      const mainPrivileges = combinePrivileges(
        form.formDataDefaultPrivileges.read,
        formData?.privileges?.read || {}
      );
      const mainPrivError = isPrivBlocked(mainPrivileges, userData, csrfIsGood);
      const rawData = formData?.data || [];
      const formDataId = formData ? formData._id?.toString() : null;
      let dataMetaData = null;
      if ((includeMeta === 'embed' || includeMeta === 'true') && formData) {
        dataMetaData = {
          created: formData?.created.date,
          edited: formData?.edited.length ? formData.edited[0].date : null,
          // @TODO: get actual usernames (maybe)
          ...(userData.isSysAdmin
            ? {
                owner: formData?.owner?.toString() || null,
                createdBy: formData?.created.user?.toString() || null,
                editedBy: formData?.edited[0]?.user?.toString() || null,
              }
            : {}),
        };
      }
      const dataSet = checkAndSetReadData(
        rawData,
        form.form.formElems,
        mainPrivileges,
        userData,
        csrfIsGood,
        includeDataIds === 'embed' && formDataId ? formDataId : null,
        includeLabels === 'embed' ? labels : null,
        includeMeta === 'embed' ? dataMetaData : null,
        elemId,
        formData?.hasElemPrivileges
      );
      if (!mainPrivError && dataSet.length) {
        data.push(dataSet);
      }
      if (includeDataIds === 'true' && dataSet.length) {
        returnObject['$dataIds'] = formDataId ? [formDataId] : [];
      }
      if (includeMeta === 'true' && dataSet.length) {
        returnObject['$dataMetaData'] = dataMetaData ? [dataMetaData] : [];
      }
    }

    if (includeLabels === 'true' && data[0]?.length) {
      for (let i = 0; i < data[0].length; i++) {
        const elemId = data[0][i].elemId;
        const formElem = form.form.formElems.find((elem) => elem.elemId === elemId);
        labels[elemId] = (formElem?.label as TransText) || {};
      }
      returnObject['$dataLabels'] = labels;
    } else if (includeLabels === 'true') {
      returnObject['$dataLabels'] = labels;
    }

    if (oneItem && flat) {
      if (data?.length) {
        for (let i = 0; i < data[0].length; i++) {
          returnObject[data[0][i].elemId] = data[0][i].value;
        }
      }
    } else if (oneItem) {
      returnObject['data'] = data[0] || [];
    } else {
      returnObject['data'] = data;
    }
  }

  return res.send(returnObject);
};

const checkAndSetReadData = (
  rawData: DBFormData['data'],
  formElems: FormElem[],
  mainPrivileges: AllPrivilegeProps,
  userData: UserData,
  csrfIsGood: boolean,
  dataId: string | null,
  labels: { [key: string]: TransText } | null,
  meta: {
    owner?: string | null;
    created: Date | undefined;
    edited: Date | null;
    createdBy?: string | null;
    editedBy?: string | null;
  } | null,
  elemId: string | string[] | undefined,
  hasElemPrivileges?: boolean
): Data[] => {
  const returnData: Data[] = [];
  const embedIds = dataId ? { dataId } : {};
  const embedMeta = meta ? { dataMetaData: meta } : {};
  for (let i = 0; i < rawData.length; i++) {
    const elem = rawData[i];
    let privError = null;
    if (hasElemPrivileges && elem.privileges?.read) {
      const elemPrivileges = combinePrivileges(mainPrivileges, elem.privileges.read);
      privError = isPrivBlocked(elemPrivileges, userData, csrfIsGood);
    }
    // Data can be accessed if there is not a mainPrivError or if there is,
    // the elem has overriding elem privileges that does not have an error
    if (!privError && (!elemId || elemId.includes(elem.elemId))) {
      const formElem = formElems.find((formElem) => formElem.elemId === elem.elemId);
      // White list the data props to be returned
      returnData.push({
        elemId: elem.elemId,
        orderNr: returnData.length,
        value: elem.value,
        valueType: formElem?.valueType || 'unknown',
        ...embedIds,
        ...(labels ? { label: labels[elem.elemId] } : {}),
        ...embedMeta,
      });
    }
  }
  return returnData;
};
