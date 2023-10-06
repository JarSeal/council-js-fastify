import type { FastifyInstance } from 'fastify';
import mongoose from 'mongoose';

import initApp from '../../core/app';
import type { FormDataGetReply, GetFormReply } from './routes';
import { createForm, createFormData, csrfHeader, emptyFormDataPrivileges } from '../../test/utils';
import type { PublicPrivilegeProp } from '../../dbModels/_modelTypePartials';

describe('formData', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await initApp();
  });

  afterEach(async () => {
    await app.close();
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  });

  it('should test the formData GET route with a non-existing route', async () => {
    const response = await app.inject({
      method: 'GET',
      path: '/api/v1/someweirdapi',
    });
    const body = JSON.parse(response.body) as FormDataGetReply;
    expect(response.statusCode).toBe(404);
    expect(body.code).toEqual('NOT_FOUND');
    expect(body.message).toEqual('Could not find form with url "/api/v1/someweirdapi"');
  });

  it("should fail to GET existing formData when there isn't a form it", async () => {
    const url = '/myformdata';
    await createFormData('myFormData', url, emptyFormDataPrivileges, [
      {
        elemId: 'myElem',
        orderNr: 0,
        value: 1,
        valueType: 'number',
      },
    ]);

    const response = await app.inject({
      method: 'GET',
      path: '/api/v1' + url,
    });
    const body = JSON.parse(response.body) as FormDataGetReply;
    expect(response.statusCode).toBe(404);
    expect(body.code).toEqual('NOT_FOUND');
    expect(body.message).toEqual(`Could not find form with url "/api/v1${url}"`);
  });

  it('should fail when body "getForm" and "dataId" are empty', async () => {
    const url = '/myform';
    const formId = 'myForm';
    const privilege = {
      priCategoryId: 'form',
      priTargetId: formId,
      priAccessId: 'canUseForm',
      privilegeAccess: { public: 'true' as PublicPrivilegeProp },
    };
    await createForm(
      formId,
      url,
      [
        {
          elemId: 'myElem',
          orderNr: 0,
          elemType: 'inputNumber',
          valueType: 'number',
        },
      ],
      [privilege]
    );

    const response = await app.inject({
      method: 'GET',
      path: '/api/v1' + url,
    });
    const body = JSON.parse(response.body) as FormDataGetReply;
    expect(response.statusCode).toBe(400);
    expect(body.code).toEqual('FORM_DATA_BAD_REQUEST');
    expect(body.message).toEqual(
      `Both, "getForm" and "dataId" query string values were missing with url "/api/v1${url}"`
    );
  });

  it('should fail to GET a public form when CSRF header is required and missing', async () => {
    const url = '/myform';
    const formId = 'myForm';
    const privilege = {
      priCategoryId: 'form',
      priTargetId: formId,
      priAccessId: 'canUseForm',
      privilegeAccess: { public: 'true' as PublicPrivilegeProp, requireCsrfHeader: true },
    };
    await createForm(
      'myForm',
      url,
      [
        {
          elemId: 'myElem',
          orderNr: 0,
          elemType: 'inputNumber',
          valueType: 'number',
        },
      ],
      [privilege]
    );

    const response = await app.inject({
      method: 'GET',
      path: `/api/v1${url}?getForm=true`,
    });
    const body = JSON.parse(response.body) as FormDataGetReply;
    expect(response.statusCode).toBe(200);
    expect(Object.keys(body).length).toBe(1);
    expect(body.$form).toBe('UNAUTHORIZED');
  });

  it('should succesfully GET a public form and nothing else', async () => {
    const url = '/myform';
    const formId = 'myForm';
    const privilege = {
      priCategoryId: 'form',
      priTargetId: formId,
      priAccessId: 'canUseForm',
      privilegeAccess: { public: 'true' as PublicPrivilegeProp },
    };
    await createForm(
      'myForm',
      url,
      [
        {
          elemId: 'myElem',
          orderNr: 0,
          elemType: 'inputNumber',
          valueType: 'number',
          label: { langKey: 'Number of something' },
        },
      ],
      [privilege],
      { formTitle: 'My Form', formText: 'This is my form' }
    );

    const response = await app.inject({
      method: 'GET',
      path: `/api/v1${url}?getForm=true`,
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as FormDataGetReply;
    const form = body.$form as GetFormReply;
    const formElems = form.formElems;
    expect(response.statusCode).toBe(200);
    expect(Object.keys(body).length).toBe(1);
    expect(form.formTitle?.langKey).toBe('My Form');
    expect(form.formText?.langKey).toBe('This is my form');
    expect(formElems.length).toBe(1);
    expect(formElems[0].elemId).toBe('myElem');
    expect(formElems[0].orderNr).toBe(0);
    expect(formElems[0].elemType).toBe('inputNumber');
    expect(formElems[0].valueType).toBe('number');
    expect(formElems[0].classes?.length).toBe(0);
    expect(formElems[0].label?.langKey).toBe('Number of something');
    expect(formElems[0].inputErrors?.length).toBe(0);
    expect(formElems[0].doNotSave).toBeFalsy();
    const keys = Object.keys(formElems[0]);
    expect(keys.includes('privileges')).toBeFalsy();
  });
});
