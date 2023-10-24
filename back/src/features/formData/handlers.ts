import type { RouteHandler } from 'fastify';
import { Types } from 'mongoose';

import type { FormDataGetRoute, FormDataPostRoute, FormDataGetReply } from './routes';
import DBFormModel, { type DBForm } from '../../dbModels/form';
import DBFormDataModel, { type DBFormData } from '../../dbModels/formData';
import DBPrivilegeModel, { type DBPrivilege } from '../../dbModels/privilege';
import type { AllPrivilegeProps } from '../../dbModels/_modelTypePartials';
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

export const formDataPost: RouteHandler<FormDataPostRoute> = async (req, res) => {
  const body = req.body;

  // @TODO: get current form
  const form = await DBFormModel.findOne<unknown>({ simpleId: body.formId || null });
  if (!form) {
    return res.send(new errors.NOT_FOUND(`Could not find formData with formId: '${body.formId}'`));
  }
  console.log('formData', form);
  // @TODO: check CSRF header (if enabled in form data)
  // @TODO: check authorization
  // @TODO: validate incoming body fields against the form data

  console.log('TADAAAAAAAAAAA POST');
  return res.send({ ok: true });
};

type Data = {
  elemId: string;
  orderNr: number;
  value: unknown;
  valueType: string;
};

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
    includeDataIds,
    includeLabels,
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
    // White list the props to be returned with the form
    returnObject['$form'] = privError?.code || {
      ...form.form,
      formElems: form.form.formElems.map((elem) => ({
        elemId: elem.elemId,
        orderNr: elem.orderNr,
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

    if (dataId && dataId[0] === 'all') {
      // Get all possible formData (paginated)

      const searchQuery = parseSearchQuery(s, sOper, form);

      const paginatedData = await DBFormDataModel.paginate<DBFormData>(
        {
          $and: [
            { formId: form.simpleId },
            ...readDataPrivilegesQuery(userData, csrfIsGood),
            ...searchQuery,
          ],
        },
        paginationOptions
      );
      formData = paginatedData.docs || [];
      paginationData = paginatedData;
    } else if (Array.isArray(dataId) && dataId?.length > 1) {
      // Get specific multiple formData items (paginated)

      const searchQuery = parseSearchQuery(s, sOper, form);

      const dataObjectIds = dataId.map((id) => new Types.ObjectId(id));
      const paginatedData = await DBFormDataModel.paginate<DBFormData>(
        {
          $and: [
            { formId: form.simpleId },
            { _id: { $in: dataObjectIds } },
            ...readDataPrivilegesQuery(userData, csrfIsGood),
            ...searchQuery,
          ],
        },
        paginationOptions
      );
      formData = paginatedData.docs;
      paginationData = paginatedData;
    } else if (dataId) {
      oneItem = true;
      // Get one formData item with dataId (search is ignored)
      formData = await DBFormDataModel.findOne<DBFormData>({
        $and: [
          { formId: form.simpleId },
          { _id: dataId[0] },
          ...readDataPrivilegesQuery(userData, csrfIsGood),
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
        dataIds.push(dataId);
        const dataSet = checkAndSetReadData(
          rawData,
          mainPrivileges,
          userData,
          csrfIsGood,
          includeDataIds === 'embed' ? dataId : null,
          includeLabels === 'embed' ? labels : null,
          elemId,
          fd.hasElemPrivileges
        );
        if (dataSet.length) {
          data.push(dataSet);
        }
      }
      if (paginationData) {
        returnObject['$pagination'] = createPaginationPayload(paginationData);
      }
      if (includeDataIds === 'true') {
        returnObject['$dataIds'] = dataIds;
      }
    } else {
      const mainPrivileges = combinePrivileges(
        form.formDataDefaultPrivileges.read,
        formData?.privileges?.read || {}
      );
      const mainPrivError = isPrivBlocked(mainPrivileges, userData, csrfIsGood);
      const rawData = formData?.data || [];
      const formDataId = formData ? formData._id?.toString() : null;
      const dataSet = checkAndSetReadData(
        rawData,
        mainPrivileges,
        userData,
        csrfIsGood,
        includeDataIds === 'embed' && formDataId ? formDataId : null,
        includeLabels === 'embed' ? labels : null,
        elemId,
        formData?.hasElemPrivileges
      );
      if (!mainPrivError && dataSet.length) {
        data.push(dataSet);
      }
      if (includeDataIds === 'true') {
        returnObject['$dataIds'] = [formDataId];
      }
    }

    if (includeLabels === 'true' && data[0]?.length) {
      for (let i = 0; i < data[0].length; i++) {
        labels[data[0][i].elemId] = (form.form.formElems[i].label as TransText) || {};
      }
      returnObject['$labels'] = labels;
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
  mainPrivileges: AllPrivilegeProps,
  userData: UserData,
  csrfIsGood: boolean,
  dataId: string | null,
  labels: { [key: string]: TransText } | null,
  elemId: string | string[] | undefined,
  hasElemPrivileges?: boolean
): Data[] => {
  const returnData: Data[] = [];
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
      // White list the data props to be returned
      returnData.push({
        elemId: elem.elemId,
        orderNr: i,
        value: elem.value,
        valueType: elem.valueType,
        ...(dataId ? { dataId } : {}),
        ...(labels ? { label: labels[elem.elemId] } : {}),
      });
    }
  }
  return returnData;
};
