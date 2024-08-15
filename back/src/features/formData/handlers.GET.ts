import type { FastifyRequest, RouteHandler } from 'fastify';
import { Types } from 'mongoose';

import type { FormDataGetRoute, FormDataGetReply, GetQuerystring } from './routes';
import DBFormModel, { type DBForm } from '../../dbModels/form';
import { type DBFormData } from '../../dbModels/formData';
import getFormDataModel from '../../dbModels/formData/';
import DBPrivilegeModel, { type DBPrivilege } from '../../dbModels/privilege';
import type { AllPrivilegeProps, FormElem, UserId } from '../../dbModels/_modelTypePartials';
import { errors } from '../../core/errors';
import { isCsrfGood } from '../../hooks/csrf';
import {
  type UserData,
  getUserData,
  isPrivBlocked,
  dataPrivilegesQuery,
  combinePrivileges,
  emptyPrivilege,
  combineBasicPrivileges,
} from '../../utils/userAndPrivilegeChecks';
import {
  createPaginationPayload,
  getApiPathFromReqUrl,
  parseFormDataSortStringFromQueryString,
  parseSearchQuery,
} from '../../utils/parsingAndConverting';
import { decryptData, getSysSetting } from '../../core/config';
import type { TransText } from '../../@types/form';
import { afterFns } from '../../customFunctions/afterFn';
import { getRequiredActions } from '../../utils/requiredLoginChecks';

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
  const { getForm, dataId } = req.query;
  const url = getApiPathFromReqUrl(req.url);

  // Get user data
  const userData = await getUserData(req);

  // Check required actions
  const requiredActions = await getRequiredActions(req, userData);
  if (requiredActions !== null) {
    return res.send(
      new errors.REQUIRED_ACTIONS_ERR(
        `required actions: ${JSON.stringify(requiredActions)}, formData GET url "${req.url}"`
      )
    );
  }

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

  // Get CSRF result
  const csrfIsGood = isCsrfGood(req);

  // Get form and/or formData and possible metadata
  const returnObject = await getFormData(req.query, form, userData, csrfIsGood, req);

  return res.send(returnObject);
};

const checkAndSetReadData = (
  rawData: DBFormData['data'],
  formElems: FormElem[],
  mainPrivileges: {
    read: AllPrivilegeProps;
    edit: AllPrivilegeProps;
    create: AllPrivilegeProps;
    delete: AllPrivilegeProps;
  },
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
  formDataOwner: UserId,
  hasElemPrivileges?: boolean,
  includePrivs?: boolean
): Data[] => {
  const returnData: Data[] = [];
  const embedIds = dataId ? { dataId } : {};
  const embedMeta = meta ? { dataMetaData: meta } : {};
  for (let i = 0; i < rawData.length; i++) {
    const elem = JSON.parse(JSON.stringify(rawData[i])) as {
      elemId: string;
      value: unknown;
      privileges?: { read?: AllPrivilegeProps; edit?: AllPrivilegeProps };
    };
    let privError = null;
    if (hasElemPrivileges && elem.privileges?.read) {
      const elemPrivileges = combinePrivileges(mainPrivileges.read, elem.privileges.read);
      privError = isPrivBlocked(elemPrivileges, userData, csrfIsGood, formDataOwner);
    }
    // Data can be accessed if there is not a mainPrivError or if there is,
    // the elem has overriding elem privileges that does not have an error
    if (!privError && (!elemId || elemId.includes(elem.elemId))) {
      const formElem = formElems.find((formElem) => formElem.elemId === elem.elemId);
      const privs =
        includePrivs && elem.privileges
          ? {
              ...(elem.privileges.read ? { read: elem.privileges.read } : {}),
              ...(elem.privileges.edit ? { edit: elem.privileges.edit } : {}),
            }
          : null;
      let value = elem.value;
      if (formElem?.elemType === 'inputSecret') value = decryptData(String(value));
      // White list the data props to be returned
      returnData.push({
        elemId: elem.elemId,
        value,
        orderNr: returnData.length,
        valueType: formElem?.valueType || 'unknown',
        ...embedIds,
        ...(labels ? { label: labels[elem.elemId] } : {}),
        ...embedMeta,
        ...(includePrivs && privs ? { privileges: privs } : {}),
      });
    }
  }
  return returnData;
};

export const getFormData = async (
  params: GetQuerystring,
  form: DBForm,
  userData: UserData,
  csrfIsGood: boolean,
  req: FastifyRequest
) => {
  const DBFormDataModel = getFormDataModel(form.url);
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
    includePrivileges,
    meAsCreator,
    meAsOwner,
    meAsEditor,
  } = params;
  let dataIdsForAfterFn;

  // Create possible labels (for embedding them into data)
  const labels: { [key: string]: TransText } = {};
  if (includeLabels === 'embed') {
    for (let i = 0; i < form.form.formElems.length; i++) {
      const elem = form.form.formElems[i];
      labels[elem.elemId] = (elem.label as TransText) || {};
    }
  }

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
            !elem.privileges?.read ||
            !isPrivBlocked(elem.privileges?.read, userData, csrfIsGood, form.owner)
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
    const privs: {
      read?: Partial<AllPrivilegeProps>;
      edit?: Partial<AllPrivilegeProps>;
      create?: Partial<AllPrivilegeProps>;
      delete?: Partial<AllPrivilegeProps>;
    }[] = [];

    const MAX_LIMIT = (await getSysSetting<number>('dataItemsMaxLimit')) || 500;
    const limiter = limit && limit < MAX_LIMIT ? Math.abs(limit) : MAX_LIMIT;
    const sorter = parseFormDataSortStringFromQueryString(sort, form);
    const populate = [
      { path: 'created.user', select: 'simpleId' },
      { path: 'owner', select: 'simpleId' },
      { path: 'edited.0.user', select: 'simpleId' },
      { path: 'privileges.read.users', select: 'simpleId' },
      { path: 'privileges.read.groups', select: 'simpleId name' },
      { path: 'privileges.read.excludeUsers', select: 'simpleId' },
      { path: 'privileges.read.excludeGroups', select: 'simpleId name' },
      { path: 'privileges.edit.users', select: 'simpleId' },
      { path: 'privileges.edit.groups', select: 'simpleId name' },
      { path: 'privileges.edit.excludeUsers', select: 'simpleId' },
      { path: 'privileges.edit.excludeGroups', select: 'simpleId name' },
      { path: 'privileges.delete.users', select: 'simpleId' },
      { path: 'privileges.delete.groups', select: 'simpleId name' },
      { path: 'privileges.delete.excludeUsers', select: 'simpleId' },
      { path: 'privileges.delete.excludeGroups', select: 'simpleId name' },
      { path: 'data.privileges.read.users', select: 'simpleId' },
      { path: 'data.privileges.read.groups', select: 'simpleId name' },
      { path: 'data.privileges.read.excludeUsers', select: 'simpleId' },
      { path: 'data.privileges.read.excludeGroups', select: 'simpleId name' },
      { path: 'data.privileges.edit.users', select: 'simpleId' },
      { path: 'data.privileges.edit.groups', select: 'simpleId name' },
      { path: 'data.privileges.edit.excludeUsers', select: 'simpleId' },
      { path: 'data.privileges.edit.excludeGroups', select: 'simpleId name' },
    ];
    const paginationOptions = {
      offset: offset || 0,
      limit: limiter,
      sort: sorter,
      collation: {
        // https://www.mongodb.com/docs/manual/reference/collation-locales-defaults/#std-label-collation-languages-locales
        locale: (await getSysSetting<string>('dataCollationLocale')) || 'en',
      },
      populate,
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
            ...dataPrivilegesQuery(userData, csrfIsGood, 'read'),
            ...searchQuery,
            ...(elemId ? [{ 'data.elemId': { $in: elemId } }] : []),
          ],
        },
        paginationOptions
      );
      formData = paginatedData.docs || [];
      paginationData = paginatedData;
    } else {
      oneItem = true;
      // Get one formData item with dataId (search params are ignored)
      formData = await DBFormDataModel.findOne<DBFormData>({
        $and: [
          { formId: form.simpleId },
          { _id: dataId[0] },
          ...dataPrivilegesQuery(userData, csrfIsGood, 'read'),
          ...(elemId ? [{ 'data.elemId': { $in: elemId } }] : []),
        ],
      }).populate(populate);
    }

    if (Array.isArray(formData)) {
      // Check multiple formData privileges
      const dataIds: string[] = [];
      for (let i = 0; i < formData.length; i++) {
        const fd = formData[i];
        const mainPrivileges = {
          read: combinePrivileges(
            form.formDataDefaultPrivileges?.read || {},
            fd.privileges?.read || {}
          ),
          edit: emptyPrivilege,
          create: emptyPrivilege,
          delete: emptyPrivilege,
        };
        const rawData = fd.data || [];
        const dataId = fd._id.toString();
        let dataMetaData = null;
        let dataSetPrivileges = null;
        let includePrivs = false;
        // Get owner
        let owner = null;
        if (fd.owner && userData.userId && userData.userId.equals(fd.owner._id)) {
          owner = fd.owner;
        }
        if (!owner && form.owner && userData.userId && userData.userId.equals(form.owner._id)) {
          owner = form.owner;
        }
        // Check if privs can be shown
        const showPrivs = !isPrivBlocked(
          combineBasicPrivileges(form.canEditPrivileges || {}, fd.canEditPrivileges || {}),
          userData,
          csrfIsGood,
          owner
        );
        if (includePrivileges) {
          includePrivs = showPrivs;
        }
        if (includePrivs) {
          dataSetPrivileges = {
            ...form.formDataDefaultPrivileges,
            ...(fd.privileges || {}),
            ...{
              canEditPrivileges: combineBasicPrivileges(
                form.canEditPrivileges || {},
                fd.canEditPrivileges || {}
              ),
            },
          };
        }
        // Include possible meta
        if (includeMeta === 'embed' || includeMeta === 'true') {
          dataMetaData = {
            created: fd.created.date,
            edited: fd.edited.length ? fd.edited[0].date : null,
            ...(showPrivs
              ? {
                  owner: fd?.owner && 'simpleId' in fd.owner ? fd.owner.simpleId : null,
                  createdBy:
                    fd?.created.user && 'simpleId' in fd.created.user
                      ? fd.created.user?.simpleId
                      : null,
                  editedBy:
                    fd?.edited.length && fd.edited[0].user && 'simpleId' in fd.edited[0].user
                      ? fd.edited[0].user.simpleId
                      : null,
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
          fd.owner && userData.userId && userData.userId.equals(fd.owner._id)
            ? fd.owner
            : form.owner,
          fd.hasElemPrivileges,
          includePrivs
        );
        if (dataSet.length) {
          dataIds.push(dataId);
          data.push(dataSet);
          if (includeMeta === 'true' && dataMetaData) {
            meta.push(dataMetaData);
          }
          if (includePrivs && dataSetPrivileges) {
            privs.push(dataSetPrivileges);
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
      if (includePrivileges && privs?.length) {
        returnObject['$dataPrivileges'] = privs;
      }
      dataIdsForAfterFn = dataIds;
    } else {
      // Check single dataSet's privileges
      const mainPrivileges = {
        read: combinePrivileges(
          form.formDataDefaultPrivileges?.read || {},
          formData?.privileges?.read || {}
        ),
        edit: emptyPrivilege,
        create: emptyPrivilege,
        delete: emptyPrivilege,
      };
      const mainPrivError = isPrivBlocked(
        mainPrivileges.read,
        userData,
        csrfIsGood,
        formData?.owner && userData.userId && userData.userId.equals(formData.owner._id)
          ? formData.owner
          : form.owner
      );
      const rawData = formData?.data || [];
      const formDataId = formData ? formData._id?.toString() : null;
      let dataMetaData = null;
      let includePrivs = false;
      // Get owner
      let owner = null;
      if (formData?.owner && userData.userId && userData.userId.equals(formData.owner._id)) {
        owner = formData.owner;
      }
      if (!owner && form.owner && userData.userId && userData.userId.equals(form.owner._id)) {
        owner = form.owner;
      }
      // Check if privs can be shown
      const showPrivs = !isPrivBlocked(
        combineBasicPrivileges(form.canEditPrivileges || {}, formData?.canEditPrivileges || {}),
        userData,
        csrfIsGood,
        owner
      );
      if (includePrivileges) {
        includePrivs = showPrivs;
      }
      if ((includeMeta === 'embed' || includeMeta === 'true') && formData) {
        dataMetaData = {
          created: formData?.created.date,
          edited: formData?.edited.length ? formData.edited[0].date : null,
          ...(showPrivs
            ? {
                owner:
                  formData?.owner && 'simpleId' in formData.owner ? formData.owner.simpleId : null,
                createdBy:
                  formData?.created.user && 'simpleId' in formData.created.user
                    ? formData.created.user?.simpleId
                    : null,
                editedBy:
                  formData?.edited.length &&
                  formData.edited[0].user &&
                  'simpleId' in formData.edited[0].user
                    ? formData.edited[0].user.simpleId
                    : null,
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
        formData?.owner && userData.userId && userData.userId.equals(formData.owner._id)
          ? formData.owner
          : form.owner,
        formData?.hasElemPrivileges,
        includePrivs
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
      if (includePrivs && dataSet.length) {
        returnObject['$dataPrivileges'] = {
          ...form.formDataDefaultPrivileges,
          ...(formData?.privileges || {}),
          canEditPrivileges: combineBasicPrivileges(
            form.canEditPrivileges || {},
            formData?.canEditPrivileges || {}
          ),
        };
      }
      dataIdsForAfterFn = formDataId || undefined;
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

  if (form.afterReadFn?.length && dataId) {
    for (let i = 0; i < form.afterReadFn.length; i++) {
      const afterFn = afterFns[form.afterReadFn[i]];
      if (afterFn) {
        const result = await afterFn.afterFn({ req, dataId: dataIdsForAfterFn, userData, form });
        if (!result.ok) {
          returnObject['$afterFnError'] =
            result.error || new errors.AFTER_FN_ERR("Form's afterEditFn error");
        }
      }
    }
  }

  return returnObject;
};
