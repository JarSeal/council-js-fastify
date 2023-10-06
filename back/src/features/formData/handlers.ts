import type { FastifyError, RouteHandler } from 'fastify';
import { Types } from 'mongoose';

import type { FormDataGetRoute, FormDataPostRoute, FormDataGetReply } from './routes';
import DBFormModel, { type DBForm } from '../../dbModels/form';
import DBFormDataModel, { type DBFormData } from '../../dbModels/formData';
import DBPrivilegeModel, { type DBPrivilege } from '../../dbModels/privilege';
import type { AllPrivilegeProps } from '../../dbModels/_modelTypePartials';
import { errors } from '../../core/errors';
import { isCsrfGood } from '../../hooks/csrf';
import { type UserData, getUserData, isPrivBlocked } from '../../utils/userAndPrivilegeChecks';
import { getApiPathFromReqUrl } from '../../utils/parsingAndConverting';

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
    const formElemsWithoutPrivileges = privError
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
      formElems: formElemsWithoutPrivileges,
    };
  }

  if (dataId) {
    let formData = null,
      oneItem = false;
    const data: Data[][] = [];

    // @TODO: set a upper limit of maximum dataItems per request
    const MAX_LIMIT = 500;
    const limiter = limit && limit < MAX_LIMIT ? Math.abs(limit) : MAX_LIMIT;

    if (dataId && dataId[0] === 'all') {
      // Get all formData (respects possible search, orderBy, orderDir, offset, and limit)
      // @TODO: implement search, orderBy, orderDir, and offset
      // USE: https://github.com/aravindnc/mongoose-paginate-v2
      formData = await DBFormDataModel.find<DBFormData>({ formId: form.simpleId }).limit(limiter);
    } else if (Array.isArray(dataId) && dataId?.length > 1) {
      // Get specific multiple formData items (respects possible search, orderBy, orderDir, offset, and limit)
      // @TODO: implement search, orderBy, orderDir, and offset
      const dataObjectIds = dataId.map((id) => new Types.ObjectId(id));
      formData = await DBFormDataModel.find<DBFormData>({
        $and: [{ formId: form.simpleId }, { _id: { $in: dataObjectIds } }],
      }).limit(limiter);
    } else if (dataId) {
      oneItem = true;
      // Get one formData item
      formData = await DBFormDataModel.findById<DBFormData>(dataId[0]).limit(1);
    }

    if (Array.isArray(formData)) {
      // Check multiple formData privileges
      for (let i = 0; i < formData.length; i++) {
        const fd = formData[i];
        const mainPrivileges = {
          ...form.formDataDefaultPrivileges.read,
          ...(fd.privileges?.read || {}),
        };
        const mainPrivError = isPrivBlocked(mainPrivileges, userData, csrfIsGood);
        const rawData = fd.data || [];
        const dataSet = checkAndSetReadData(
          rawData,
          mainPrivileges,
          mainPrivError,
          userData,
          csrfIsGood
        );
        if (dataSet.length) {
          data.push(dataSet);
        }
      }
    } else {
      // Check single formData privileges
      const mainPrivileges = {
        ...form.formDataDefaultPrivileges.read,
        ...(formData?.privileges?.read || {}),
      };
      const mainPrivError = isPrivBlocked(mainPrivileges, userData, csrfIsGood);
      const rawData = formData?.data || [];
      const dataSet = checkAndSetReadData(
        rawData,
        mainPrivileges,
        mainPrivError,
        userData,
        csrfIsGood
      );
      data.push(dataSet);
    }

    if (oneItem && flat) {
      for (let i = 0; i < data.length; i++) {
        returnObject[data[0][i].elemId] = data[0][i].value;
      }
    } else if (oneItem) {
      returnObject['data'] = data[0];
    } else {
      returnObject['data'] = data;
    }
  }

  console.log('TADAAAAAAAAAAA GET', elemId, offset, orderBy, orderDir, s);
  return res.send(returnObject);
};

const checkAndSetReadData = (
  rawData: DBFormData['data'],
  mainPrivileges: AllPrivilegeProps,
  mainPrivError: null | FastifyError,
  userData: UserData,
  csrfIsGood: boolean
): Data[] => {
  const returnData: Data[] = [];
  for (let i = 0; i < rawData.length; i++) {
    const elem = rawData[i];
    let privError = null;
    if (elem.privileges?.read) {
      const elemPrivileges = { ...mainPrivileges, ...elem.privileges.read };
      privError = isPrivBlocked(elemPrivileges, userData, csrfIsGood);
    }
    // Data can be accessed if there is not a mainPrivError or if there is,
    // the elem has overriding elem privileges that does not have an error
    if (!privError && (!mainPrivError || elem.privileges?.read)) {
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
