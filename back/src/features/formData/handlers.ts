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
import { createPaginationPayload, getApiPathFromReqUrl } from '../../utils/parsingAndConverting';
import { getConfig } from '../../core/config';

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
  const { getForm, dataId, elemId, flat, offset, limit, orderBy, orderDir, s } = req.query;
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
    const formElemsWithoutPrivilegesProp = privError
      ? []
      : form.form.formElems.map((elem) => ({
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
        }));
    returnObject['$form'] = privError?.code || {
      ...form.form,
      formElems: formElemsWithoutPrivilegesProp,
    };
  }

  if (dataId) {
    let formData = null,
      paginationData = null,
      oneItem = false;
    const data: Data[][] = [];

    const MAX_LIMIT = getConfig<number>('dataItemsMaxLimit', 500);
    const limiter = limit && limit < MAX_LIMIT ? Math.abs(limit) : MAX_LIMIT;
    // @TODO: create a helper function to white list these orderBy parameters:
    // 'created', 'edited', 'value', 'elemId', 'valueTypeAndValue'
    const sorter = { [orderBy || 'created.date']: orderDir !== '-' ? 1 : -1 };
    const paginationOptions = {
      offset: offset || 0,
      limit: limiter,
      sort: sorter,
      collation: {
        locale: 'en', // @TODO: add locale support (to config file, as a systemSetting, and possibly to form as well)
      },
    };

    if (dataId && dataId[0] === 'all') {
      // Get all formData (respects possible search, orderBy, orderDir, offset, and limit)
      // @TODO: implement search, orderBy, orderDir, and offset
      const paginatedData = await DBFormDataModel.paginate<DBFormData>(
        {
          $and: [{ formId: form.simpleId }, ...readDataPrivilegesQuery(userData, csrfIsGood)],
        },
        paginationOptions
      );
      formData = paginatedData.docs || [];
      paginationData = paginatedData;
    } else if (Array.isArray(dataId) && dataId?.length > 1) {
      // Get specific multiple formData items (respects possible search, orderBy, orderDir, offset, and limit)
      // @TODO: implement search, orderBy, orderDir, and offset
      const dataObjectIds = dataId.map((id) => new Types.ObjectId(id));
      const paginatedData = await DBFormDataModel.paginate<DBFormData>(
        {
          $and: [
            { formId: form.simpleId },
            { _id: { $in: dataObjectIds } },
            ...readDataPrivilegesQuery(userData, csrfIsGood),
          ],
        },
        paginationOptions
      );
      formData = paginatedData.docs;
      paginationData = paginatedData;
    } else if (dataId) {
      oneItem = true;
      // Get one formData item
      // formData = await DBFormDataModel.find<DBFormData>(dataId[0]).limit(1);
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
      for (let i = 0; i < formData.length; i++) {
        const fd = formData[i];
        const mainPrivileges = combinePrivileges(
          form.formDataDefaultPrivileges.read,
          fd.privileges?.read || {}
        );
        const rawData = fd.data || [];
        const dataSet = checkAndSetReadData(
          rawData,
          mainPrivileges,
          userData,
          csrfIsGood,
          fd.hasElemPrivileges
        );
        if (dataSet.length) {
          data.push(dataSet);
        }
      }
      if (paginationData) {
        returnObject['$pagination'] = createPaginationPayload(paginationData);
      }
    } else {
      const mainPrivileges = combinePrivileges(
        form.formDataDefaultPrivileges.read,
        formData?.privileges?.read || {}
      );
      const mainPrivError = isPrivBlocked(mainPrivileges, userData, csrfIsGood);
      const rawData = formData?.data || [];
      const dataSet = checkAndSetReadData(
        rawData,
        mainPrivileges,
        userData,
        csrfIsGood,
        formData?.hasElemPrivileges
      );
      if (!mainPrivError && dataSet.length) {
        data.push(dataSet);
      }
    }

    if (oneItem && flat) {
      if (data?.length) {
        for (let i = 0; i < data[0].length; i++) {
          returnObject[data[0][i].elemId] = data[0][i].value;
        }
      }
    } else if (oneItem) {
      returnObject['data'] = data[0];
    } else {
      returnObject['data'] = data;
    }
  }

  console.log('TADAAAAAAAAAAA GET', elemId, s);
  return res.send(returnObject);
};

const checkAndSetReadData = (
  rawData: DBFormData['data'],
  mainPrivileges: AllPrivilegeProps,
  userData: UserData,
  csrfIsGood: boolean,
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
    if (!privError) {
      // White list the data props to be returned
      returnData.push({
        elemId: elem.elemId,
        orderNr: i,
        value: elem.value,
        valueType: elem.valueType,
      });
    }
  }
  return returnData;
};
