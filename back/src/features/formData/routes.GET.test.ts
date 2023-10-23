import type { FastifyInstance } from 'fastify';
import mongoose from 'mongoose';

import initApp from '../../core/app';
import type { FormDataGetReply, GetFormReply } from './routes';
import {
  createForm,
  createFormData,
  createGroup,
  createSysAdmin,
  createUser,
  csrfHeader,
  validAgentId,
} from '../../test/utils';
import type { PublicPrivilegeProp } from '../../dbModels/_modelTypePartials';
import { SESSION_COOKIE_NAME } from '../../core/config';
import type { PaginationData } from '../../utils/parsingAndConverting';
import { emptyFormDataPrivileges } from '../../utils/userAndPrivilegeChecks';

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

  it('should fail to GET onlyPublic form when CSRF header is required and missing', async () => {
    const url = '/myform';
    const formId = 'myForm';
    const privilege = {
      priCategoryId: 'form',
      priTargetId: formId,
      priAccessId: 'canUseForm',
      privilegeAccess: { public: 'onlyPublic' as PublicPrivilegeProp, requireCsrfHeader: true },
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

  it('should fail to GET non-public (public=false) form when CSRF header is required and missing', async () => {
    const url = '/myform';
    const formId = 'myForm';
    const privilege = {
      priCategoryId: 'form',
      priTargetId: formId,
      priAccessId: 'canUseForm',
      privilegeAccess: { public: 'false' as PublicPrivilegeProp, requireCsrfHeader: true },
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
          label: { langKey: 'Number' },
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
    expect(formElems[0].label?.langKey).toBe('Number');
    expect(formElems[0].inputErrors?.length).toBe(0);
    expect(formElems[0].doNotSave).toBeFalsy();
    const keys = Object.keys(formElems[0]);
    expect(keys.includes('privileges')).toBeFalsy();
  });

  it('should succesfully GET a public formData (dataId=all) and form', async () => {
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
          elemId: 'myElem1',
          orderNr: 0,
          elemType: 'inputNumber',
          valueType: 'number',
          label: { langKey: 'Number' },
        },
        {
          elemId: 'myElem2',
          orderNr: 1,
          elemType: 'inputText',
          valueType: 'string',
          label: { langKey: 'String' },
        },
      ],
      [privilege],
      { formTitle: 'My Form', formText: 'This is my form' }
    );
    await createFormData(
      formId,
      url,
      {
        read: { public: 'true', requireCsrfHeader: true },
      },
      [
        { elemId: 'myElem1', orderNr: 0, value: 12, valueType: 'number' },
        { elemId: 'myElem2', orderNr: 1, value: 'Some string', valueType: 'string' },
      ]
    );
    await createFormData(
      formId,
      url,
      {
        read: { public: 'true', requireCsrfHeader: true },
      },
      [
        { elemId: 'myElem1', orderNr: 0, value: 15, valueType: 'number' },
        { elemId: 'myElem2', orderNr: 1, value: 'Some other string', valueType: 'string' },
      ]
    );

    const response = await app.inject({
      method: 'GET',
      path: `/api/v1${url}?getForm=true&dataId=all`,
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as FormDataGetReply;
    const form = body.$form as GetFormReply;
    const formElems = form.formElems;
    expect(response.statusCode).toBe(200);
    expect(Object.keys(body).length).toBe(3);
    expect(form.formTitle?.langKey).toBe('My Form');
    expect(form.formText?.langKey).toBe('This is my form');
    expect(formElems.length).toBe(2);
    expect(formElems[0].elemId).toBe('myElem1');
    expect(formElems[0].orderNr).toBe(0);
    expect(formElems[0].elemType).toBe('inputNumber');
    expect(formElems[0].valueType).toBe('number');
    expect(formElems[0].classes?.length).toBe(0);
    expect(formElems[0].label?.langKey).toBe('Number');
    expect(formElems[0].inputErrors?.length).toBe(0);
    expect(formElems[0].doNotSave).toBeFalsy();
    expect(formElems[1].elemId).toBe('myElem2');
    expect(formElems[1].orderNr).toBe(1);
    expect(formElems[1].elemType).toBe('inputText');
    expect(formElems[1].valueType).toBe('string');
    expect(formElems[1].classes?.length).toBe(0);
    expect(formElems[1].label?.langKey).toBe('String');
    expect(formElems[1].inputErrors?.length).toBe(0);
    expect(formElems[1].doNotSave).toBeFalsy();
    const keys = Object.keys(formElems[0]);
    expect(keys.includes('privileges')).toBeFalsy();

    const data = body.data as FormDataGetReply[][];
    expect(data.length).toBe(2);
    expect(data[0][0].elemId).toBe('myElem1');
    expect(data[0][0].orderNr).toBe(0);
    expect(data[0][0].value).toBe(12);
    expect(data[0][0].valueType).toBe('number');
    expect(data[0][1].elemId).toBe('myElem2');
    expect(data[0][1].orderNr).toBe(1);
    expect(data[0][1].value).toBe('Some string');
    expect(data[0][1].valueType).toBe('string');
    expect(data[1][0].elemId).toBe('myElem1');
    expect(data[1][0].orderNr).toBe(0);
    expect(data[1][0].value).toBe(15);
    expect(data[1][0].valueType).toBe('number');
    expect(data[1][1].elemId).toBe('myElem2');
    expect(data[1][1].orderNr).toBe(1);
    expect(data[1][1].value).toBe('Some other string');
    expect(data[1][1].valueType).toBe('string');
  });

  it('should succesfully GET a non-public form and nothing else', async () => {
    const userId = await createUser('myusername');
    const url = '/myform';
    const formId = 'myForm';
    const privilege = {
      priCategoryId: 'form',
      priTargetId: formId,
      priAccessId: 'canUseForm',
      privilegeAccess: { public: 'false' as PublicPrivilegeProp, users: [userId] },
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
          label: { langKey: 'Number' },
        },
      ],
      [privilege],
      { formTitle: 'My Form', formText: 'This is my form' }
    );

    const loginResponse = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: {
        usernameOrEmail: 'myusername',
        pass: 'password',
        loginMethod: 'username',
        agentId: validAgentId,
      },
      ...csrfHeader,
    });
    const sessionCookie = loginResponse.cookies.find((c) => c.name === SESSION_COOKIE_NAME);

    const response = await app.inject({
      method: 'GET',
      path: `/api/v1${url}?getForm=true`,
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as FormDataGetReply;
    expect(response.statusCode).toBe(200);
    expect(Object.keys(body).length).toBe(1);
    const form = body.$form as GetFormReply;
    const formElems = form.formElems;
    expect(form.formTitle?.langKey).toBe('My Form');
    expect(form.formText?.langKey).toBe('This is my form');
    expect(formElems.length).toBe(1);
    expect(formElems[0].elemId).toBe('myElem');
    expect(formElems[0].orderNr).toBe(0);
    expect(formElems[0].elemType).toBe('inputNumber');
    expect(formElems[0].valueType).toBe('number');
    expect(formElems[0].classes?.length).toBe(0);
    expect(formElems[0].label?.langKey).toBe('Number');
    expect(formElems[0].inputErrors?.length).toBe(0);
    expect(formElems[0].doNotSave).toBeFalsy();
    const keys = Object.keys(formElems[0]);
    expect(keys.includes('privileges')).toBeFalsy();
  });

  it('should succesfully GET a non-public form and nothing else as a super admin', async () => {
    await createSysAdmin(true);
    const url = '/myform';
    const formId = 'myForm';
    const privilege = {
      priCategoryId: 'form',
      priTargetId: formId,
      priAccessId: 'canUseForm',
      privilegeAccess: { public: 'false' as PublicPrivilegeProp },
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
          label: { langKey: 'Number' },
        },
      ],
      [privilege],
      { formTitle: 'My Form', formText: 'This is my form' }
    );

    const loginResponse = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: {
        usernameOrEmail: 'superadmin',
        pass: 'password',
        loginMethod: 'username',
        agentId: validAgentId,
      },
      ...csrfHeader,
    });
    const sessionCookie = loginResponse.cookies.find((c) => c.name === SESSION_COOKIE_NAME);

    const response = await app.inject({
      method: 'GET',
      path: `/api/v1${url}?getForm=true`,
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as FormDataGetReply;
    expect(response.statusCode).toBe(200);
    expect(Object.keys(body).length).toBe(1);
    const form = body.$form as GetFormReply;
    const formElems = form.formElems;
    expect(form.formTitle?.langKey).toBe('My Form');
    expect(form.formText?.langKey).toBe('This is my form');
    expect(formElems.length).toBe(1);
    expect(formElems[0].elemId).toBe('myElem');
    expect(formElems[0].orderNr).toBe(0);
    expect(formElems[0].elemType).toBe('inputNumber');
    expect(formElems[0].valueType).toBe('number');
    expect(formElems[0].classes?.length).toBe(0);
    expect(formElems[0].label?.langKey).toBe('Number');
    expect(formElems[0].inputErrors?.length).toBe(0);
    expect(formElems[0].doNotSave).toBeFalsy();
    const keys = Object.keys(formElems[0]);
    expect(keys.includes('privileges')).toBeFalsy();
  });

  it('should succesfully GET non-public formData (dataId=all) and form when in privilege users', async () => {
    const userId = await createUser('myusername');
    const url = '/myform';
    const formId = 'myForm';
    const privilege = {
      priCategoryId: 'form',
      priTargetId: formId,
      priAccessId: 'canUseForm',
      privilegeAccess: { public: 'false' as PublicPrivilegeProp, users: [userId] },
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
          label: { langKey: 'Number' },
        },
      ],
      [privilege],
      { formTitle: 'My Form', formText: 'This is my form' }
    );
    await createFormData(
      formId,
      url,
      {
        read: { public: 'false', requireCsrfHeader: true },
      },
      [
        { elemId: 'myElem1', orderNr: 0, value: 12, valueType: 'number' },
        { elemId: 'myElem2', orderNr: 1, value: 'Some string', valueType: 'string' },
      ]
    );
    await createFormData(
      formId,
      url,
      {
        read: { public: 'false', requireCsrfHeader: true, users: [userId] },
      },
      [
        { elemId: 'myElem1', orderNr: 0, value: 15, valueType: 'number' },
        { elemId: 'myElem2', orderNr: 1, value: 'Some other string', valueType: 'string' },
      ]
    );

    const loginResponse = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: {
        usernameOrEmail: 'myusername',
        pass: 'password',
        loginMethod: 'username',
        agentId: validAgentId,
      },
      ...csrfHeader,
    });
    const sessionCookie = loginResponse.cookies.find((c) => c.name === SESSION_COOKIE_NAME);

    const response = await app.inject({
      method: 'GET',
      path: `/api/v1${url}?getForm=true&dataId=all`,
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as FormDataGetReply;
    expect(response.statusCode).toBe(200);
    expect(Object.keys(body).length).toBe(3);
    const form = body.$form as GetFormReply;
    const formElems = form.formElems;
    expect(form.formTitle?.langKey).toBe('My Form');
    expect(form.formText?.langKey).toBe('This is my form');
    expect(formElems.length).toBe(1);
    expect(formElems[0].elemId).toBe('myElem');
    expect(formElems[0].orderNr).toBe(0);
    expect(formElems[0].elemType).toBe('inputNumber');
    expect(formElems[0].valueType).toBe('number');
    expect(formElems[0].classes?.length).toBe(0);
    expect(formElems[0].label?.langKey).toBe('Number');
    expect(formElems[0].inputErrors?.length).toBe(0);
    expect(formElems[0].doNotSave).toBeFalsy();
    const keys = Object.keys(formElems[0]);
    expect(keys.includes('privileges')).toBeFalsy();

    const data = body.data as FormDataGetReply[][];
    expect(data.length).toBe(1);
    expect(data[0][0].elemId).toBe('myElem1');
    expect(data[0][0].orderNr).toBe(0);
    expect(data[0][0].value).toBe(15);
    expect(data[0][0].valueType).toBe('number');
    expect(data[0][1].elemId).toBe('myElem2');
    expect(data[0][1].orderNr).toBe(1);
    expect(data[0][1].value).toBe('Some other string');
    expect(data[0][1].valueType).toBe('string');
  });

  it('should succesfully GET non-public formData (dataId=all) only when in privilege groups (and user is in that group)', async () => {
    const userId = await createUser('myusername');
    const groupId = await createGroup('mygroup', undefined, [userId]);
    const url = '/myform';
    const formId = 'myForm';
    const privilege = {
      priCategoryId: 'form',
      priTargetId: formId,
      priAccessId: 'canUseForm',
      privilegeAccess: { public: 'false' as PublicPrivilegeProp, groups: [groupId] },
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
          label: { langKey: 'Number' },
        },
      ],
      [privilege],
      { formTitle: 'My Form', formText: 'This is my form' }
    );
    await createFormData(
      formId,
      url,
      {
        read: { public: 'false', requireCsrfHeader: true },
      },
      [
        { elemId: 'myElem1', orderNr: 0, value: 12, valueType: 'number' },
        { elemId: 'myElem2', orderNr: 1, value: 'Some string', valueType: 'string' },
      ]
    );
    await createFormData(
      formId,
      url,
      {
        read: { public: 'false', requireCsrfHeader: true, groups: [groupId] },
      },
      [
        { elemId: 'myElem1', orderNr: 0, value: 15, valueType: 'number' },
        { elemId: 'myElem2', orderNr: 1, value: 'Some other string', valueType: 'string' },
      ]
    );

    const loginResponse = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: {
        usernameOrEmail: 'myusername',
        pass: 'password',
        loginMethod: 'username',
        agentId: validAgentId,
      },
      ...csrfHeader,
    });
    const sessionCookie = loginResponse.cookies.find((c) => c.name === SESSION_COOKIE_NAME);

    const response = await app.inject({
      method: 'GET',
      path: `/api/v1${url}?getForm=true&dataId=all`,
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as FormDataGetReply;
    expect(response.statusCode).toBe(200);
    expect(Object.keys(body).length).toBe(3);
    const form = body.$form as GetFormReply;
    const formElems = form.formElems;
    expect(form.formTitle?.langKey).toBe('My Form');
    expect(form.formText?.langKey).toBe('This is my form');
    expect(formElems.length).toBe(1);
    expect(formElems[0].elemId).toBe('myElem');
    expect(formElems[0].orderNr).toBe(0);
    expect(formElems[0].elemType).toBe('inputNumber');
    expect(formElems[0].valueType).toBe('number');
    expect(formElems[0].classes?.length).toBe(0);
    expect(formElems[0].label?.langKey).toBe('Number');
    expect(formElems[0].inputErrors?.length).toBe(0);
    expect(formElems[0].doNotSave).toBeFalsy();
    const keys = Object.keys(formElems[0]);
    expect(keys.includes('privileges')).toBeFalsy();

    const data = body.data as FormDataGetReply[][];
    expect(data.length).toBe(1);
    expect(data[0][0].elemId).toBe('myElem1');
    expect(data[0][0].orderNr).toBe(0);
    expect(data[0][0].value).toBe(15);
    expect(data[0][0].valueType).toBe('number');
    expect(data[0][1].elemId).toBe('myElem2');
    expect(data[0][1].orderNr).toBe(1);
    expect(data[0][1].value).toBe('Some other string');
    expect(data[0][1].valueType).toBe('string');
  });

  it('should succesfully GET non-public formData (dataId=all) and form as super admin', async () => {
    const userId = await createUser('myusername');
    await createSysAdmin(true);
    const url = '/myform';
    const formId = 'myForm';
    const privilege = {
      priCategoryId: 'form',
      priTargetId: formId,
      priAccessId: 'canUseForm',
      privilegeAccess: { public: 'false' as PublicPrivilegeProp, users: [userId] },
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
          label: { langKey: 'Number' },
        },
      ],
      [privilege],
      { formTitle: 'My Form', formText: 'This is my form' }
    );
    await createFormData(
      formId,
      url,
      {
        read: { public: 'false', requireCsrfHeader: true },
      },
      [
        { elemId: 'myElem1', orderNr: 0, value: 12, valueType: 'number' },
        { elemId: 'myElem2', orderNr: 1, value: 'Some string', valueType: 'string' },
      ]
    );
    await createFormData(
      formId,
      url,
      {
        read: { public: 'false', requireCsrfHeader: true, users: [userId] },
      },
      [
        { elemId: 'myElem1', orderNr: 0, value: 15, valueType: 'number' },
        { elemId: 'myElem2', orderNr: 1, value: 'Some other string', valueType: 'string' },
      ]
    );

    const loginResponse = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: {
        usernameOrEmail: 'superadmin',
        pass: 'password',
        loginMethod: 'username',
        agentId: validAgentId,
      },
      ...csrfHeader,
    });
    const sessionCookie = loginResponse.cookies.find((c) => c.name === SESSION_COOKIE_NAME);

    const response = await app.inject({
      method: 'GET',
      path: `/api/v1${url}?getForm=true&dataId=all`,
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as FormDataGetReply;
    expect(response.statusCode).toBe(200);
    expect(Object.keys(body).length).toBe(3);
    const form = body.$form as GetFormReply;
    const formElems = form.formElems;
    expect(form.formTitle?.langKey).toBe('My Form');
    expect(form.formText?.langKey).toBe('This is my form');
    expect(formElems.length).toBe(1);
    expect(formElems[0].elemId).toBe('myElem');
    expect(formElems[0].orderNr).toBe(0);
    expect(formElems[0].elemType).toBe('inputNumber');
    expect(formElems[0].valueType).toBe('number');
    expect(formElems[0].classes?.length).toBe(0);
    expect(formElems[0].label?.langKey).toBe('Number');
    expect(formElems[0].inputErrors?.length).toBe(0);
    expect(formElems[0].doNotSave).toBeFalsy();
    const keys = Object.keys(formElems[0]);
    expect(keys.includes('privileges')).toBeFalsy();

    const data = body.data as FormDataGetReply[][];
    expect(data.length).toBe(2);
    expect(data[0][0].elemId).toBe('myElem1');
    expect(data[0][0].orderNr).toBe(0);
    expect(data[0][0].value).toBe(12);
    expect(data[0][0].valueType).toBe('number');
    expect(data[0][1].elemId).toBe('myElem2');
    expect(data[0][1].orderNr).toBe(1);
    expect(data[0][1].value).toBe('Some string');
    expect(data[0][1].valueType).toBe('string');
    expect(data[1][0].elemId).toBe('myElem1');
    expect(data[1][0].orderNr).toBe(0);
    expect(data[1][0].value).toBe(15);
    expect(data[1][0].valueType).toBe('number');
    expect(data[1][1].elemId).toBe('myElem2');
    expect(data[1][1].orderNr).toBe(1);
    expect(data[1][1].value).toBe('Some other string');
    expect(data[1][1].valueType).toBe('string');
  });

  it('should GET nothing when signed in form and formData (dataId=all) when privilege check fails: not signed in (and should be)', async () => {
    const userId = await createUser('myusername');
    const url = '/myform';
    const formId = 'myForm';
    const privilege = {
      priCategoryId: 'form',
      priTargetId: formId,
      priAccessId: 'canUseForm',
      privilegeAccess: { public: 'false' as PublicPrivilegeProp, users: [userId] },
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
          label: { langKey: 'Number' },
        },
      ],
      [privilege],
      {
        formTitle: 'My Form',
        formText: 'This is my form',
        formDataDefaultPrivileges: { read: { public: 'false', requireCsrfHeader: true } },
      }
    );
    await createFormData(
      formId,
      url,
      {
        read: { public: 'false', requireCsrfHeader: true },
      },
      [
        { elemId: 'myElem1', orderNr: 0, value: 12, valueType: 'number' },
        { elemId: 'myElem2', orderNr: 1, value: 'Some string', valueType: 'string' },
      ]
    );
    await createFormData(
      formId,
      url,
      {
        read: { public: 'false', requireCsrfHeader: true },
      },
      [
        { elemId: 'myElem1', orderNr: 0, value: 15, valueType: 'number' },
        { elemId: 'myElem2', orderNr: 1, value: 'Some other string', valueType: 'string' },
      ]
    );

    const response = await app.inject({
      method: 'GET',
      path: `/api/v1${url}?getForm=true&dataId=all`,
      cookies: { [SESSION_COOKIE_NAME]: 'nonexistingcookie' },
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as FormDataGetReply;
    expect(response.statusCode).toBe(200);
    expect(Object.keys(body).length).toBe(3);
    const form = body.$form as GetFormReply;
    const data = body.data as FormDataGetReply[][];
    expect(form).toBe('UNAUTHORIZED');
    expect(Array.isArray(data)).toBeTruthy();
    expect(data.length).toBe(0);
  });

  it('should GET nothing when signed in form and formData (dataId=all) when privilege check fails: onlyPublic (and is signed in)', async () => {
    await createUser('myusername');
    const url = '/myform';
    const formId = 'myForm';
    const privilege = {
      priCategoryId: 'form',
      priTargetId: formId,
      priAccessId: 'canUseForm',
      privilegeAccess: { public: 'onlyPublic' as PublicPrivilegeProp },
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
          label: { langKey: 'Number' },
        },
      ],
      [privilege],
      {
        formTitle: 'My Form',
        formText: 'This is my form',
        formDataDefaultPrivileges: { read: { public: 'onlyPublic', requireCsrfHeader: true } },
      }
    );
    await createFormData(formId, url, {}, [
      { elemId: 'myElem1', orderNr: 0, value: 12, valueType: 'number' },
      { elemId: 'myElem2', orderNr: 1, value: 'Some string', valueType: 'string' },
    ]);
    await createFormData(formId, url, {}, [
      { elemId: 'myElem1', orderNr: 0, value: 15, valueType: 'number' },
      { elemId: 'myElem2', orderNr: 1, value: 'Some other string', valueType: 'string' },
    ]);

    const loginResponse = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: {
        usernameOrEmail: 'myusername',
        pass: 'password',
        loginMethod: 'username',
        agentId: validAgentId,
      },
      ...csrfHeader,
    });
    const sessionCookie = loginResponse.cookies.find((c) => c.name === SESSION_COOKIE_NAME);

    const response = await app.inject({
      method: 'GET',
      path: `/api/v1${url}?getForm=true&dataId=all`,
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as FormDataGetReply;
    expect(response.statusCode).toBe(200);
    expect(Object.keys(body).length).toBe(3);
    const form = body.$form as GetFormReply;
    const data = body.data as FormDataGetReply[][];
    expect(form).toBe('SESSION_CANNOT_BE_SIGNED_IN');
    expect(Array.isArray(data)).toBeTruthy();
    expect(data.length).toBe(0);
  });

  it('should GET nothing when user is signed in but not in users nor groups list', async () => {
    await createUser('myusername');
    const url = '/myform';
    const formId = 'myForm';
    const privilege = {
      priCategoryId: 'form',
      priTargetId: formId,
      priAccessId: 'canUseForm',
      privilegeAccess: { public: 'false' as PublicPrivilegeProp, users: [], groups: [] },
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
          label: { langKey: 'Number' },
        },
      ],
      [privilege],
      {
        formTitle: 'My Form',
        formText: 'This is my form',
        formDataDefaultPrivileges: {
          read: { public: 'false', requireCsrfHeader: true, users: [], groups: [] },
        },
      }
    );
    await createFormData(formId, url, {}, [
      { elemId: 'myElem1', orderNr: 0, value: 12, valueType: 'number' },
      { elemId: 'myElem2', orderNr: 1, value: 'Some string', valueType: 'string' },
    ]);
    await createFormData(formId, url, {}, [
      { elemId: 'myElem1', orderNr: 0, value: 15, valueType: 'number' },
      { elemId: 'myElem2', orderNr: 1, value: 'Some other string', valueType: 'string' },
    ]);

    const loginResponse = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: {
        usernameOrEmail: 'myusername',
        pass: 'password',
        loginMethod: 'username',
        agentId: validAgentId,
      },
      ...csrfHeader,
    });
    const sessionCookie = loginResponse.cookies.find((c) => c.name === SESSION_COOKIE_NAME);

    const response = await app.inject({
      method: 'GET',
      path: `/api/v1${url}?getForm=true&dataId=all`,
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as FormDataGetReply;
    expect(response.statusCode).toBe(200);
    expect(Object.keys(body).length).toBe(3);
    const form = body.$form as GetFormReply;
    const data = body.data as FormDataGetReply[][];
    expect(form).toBe('FORBIDDEN');
    expect(Array.isArray(data)).toBeTruthy();
    expect(data.length).toBe(0);
  });

  it('should GET nothing when user is signed in but is in excluded users', async () => {
    const userId = await createUser('myusername');
    const url = '/myform';
    const formId = 'myForm';
    const privilege = {
      priCategoryId: 'form',
      priTargetId: formId,
      priAccessId: 'canUseForm',
      privilegeAccess: {
        public: 'false' as PublicPrivilegeProp,
        users: [userId],
        excludeUsers: [userId],
      },
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
          label: { langKey: 'Number' },
        },
      ],
      [privilege],
      {
        formTitle: 'My Form',
        formText: 'This is my form',
        formDataDefaultPrivileges: {
          read: {
            public: 'false',
            requireCsrfHeader: true,
            users: [userId],
            excludeUsers: [userId],
          },
        },
      }
    );
    await createFormData(formId, url, {}, [
      { elemId: 'myElem1', orderNr: 0, value: 12, valueType: 'number' },
      { elemId: 'myElem2', orderNr: 1, value: 'Some string', valueType: 'string' },
    ]);
    await createFormData(formId, url, {}, [
      { elemId: 'myElem1', orderNr: 0, value: 15, valueType: 'number' },
      { elemId: 'myElem2', orderNr: 1, value: 'Some other string', valueType: 'string' },
    ]);

    const loginResponse = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: {
        usernameOrEmail: 'myusername',
        pass: 'password',
        loginMethod: 'username',
        agentId: validAgentId,
      },
      ...csrfHeader,
    });
    const sessionCookie = loginResponse.cookies.find((c) => c.name === SESSION_COOKIE_NAME);

    const response = await app.inject({
      method: 'GET',
      path: `/api/v1${url}?getForm=true&dataId=all`,
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as FormDataGetReply;
    expect(response.statusCode).toBe(200);
    expect(Object.keys(body).length).toBe(3);
    const form = body.$form as GetFormReply;
    const data = body.data as FormDataGetReply[][];
    expect(form).toBe('FORBIDDEN');
    expect(Array.isArray(data)).toBeTruthy();
    expect(data.length).toBe(0);
  });

  it('should GET nothing when user is signed in but is in excluded groups (and user is in that group)', async () => {
    const userId = await createUser('myusername');
    const groupId = await createGroup('mygroup', userId, [userId], true);
    const url = '/myform';
    const formId = 'myForm';
    const privilege = {
      priCategoryId: 'form',
      priTargetId: formId,
      priAccessId: 'canUseForm',
      privilegeAccess: {
        public: 'false' as PublicPrivilegeProp,
        users: [userId],
        excludeGroups: [groupId],
      },
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
          label: { langKey: 'Number' },
        },
      ],
      [privilege],
      {
        formTitle: 'My Form',
        formText: 'This is my form',
        formDataDefaultPrivileges: {
          read: {
            public: 'false',
            requireCsrfHeader: true,
            users: [userId],
            excludeGroups: [groupId],
          },
        },
      }
    );
    await createFormData(formId, url, {}, [
      { elemId: 'myElem1', orderNr: 0, value: 12, valueType: 'number' },
      { elemId: 'myElem2', orderNr: 1, value: 'Some string', valueType: 'string' },
    ]);
    await createFormData(formId, url, {}, [
      { elemId: 'myElem1', orderNr: 0, value: 15, valueType: 'number' },
      { elemId: 'myElem2', orderNr: 1, value: 'Some other string', valueType: 'string' },
    ]);

    const loginResponse = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: {
        usernameOrEmail: 'myusername',
        pass: 'password',
        loginMethod: 'username',
        agentId: validAgentId,
      },
      ...csrfHeader,
    });
    const sessionCookie = loginResponse.cookies.find((c) => c.name === SESSION_COOKIE_NAME);

    const response = await app.inject({
      method: 'GET',
      path: `/api/v1${url}?getForm=true&dataId=all`,
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as FormDataGetReply;
    expect(response.statusCode).toBe(200);
    expect(Object.keys(body).length).toBe(3);
    const form = body.$form as GetFormReply;
    const data = body.data as FormDataGetReply[][];
    expect(form).toBe('FORBIDDEN');
    expect(Array.isArray(data)).toBeTruthy();
    expect(data.length).toBe(0);
  });

  it('should succesfully GET two public formData items only as a signed in user', async () => {
    const userId = await createUser('myusername');
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
          label: { langKey: 'Number' },
        },
      ],
      [privilege],
      {
        formTitle: 'My Form',
        formText: 'This is my form',
        formDataDefaultPrivileges: {
          read: { public: 'false', requireCsrfHeader: true, users: [userId] },
        },
      }
    );
    const formDataId1 = await createFormData(formId, url, {}, [
      { elemId: 'myElem1', orderNr: 0, value: 12, valueType: 'number' },
      { elemId: 'myElem2', orderNr: 1, value: 'Some string', valueType: 'string' },
    ]);
    const formDataId2 = await createFormData(formId, url, {}, [
      { elemId: 'myElem1', orderNr: 0, value: 15, valueType: 'number' },
      { elemId: 'myElem2', orderNr: 1, value: 'Some other string', valueType: 'string' },
    ]);

    const loginResponse = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: {
        usernameOrEmail: 'myusername',
        pass: 'password',
        loginMethod: 'username',
        agentId: validAgentId,
      },
      ...csrfHeader,
    });
    const sessionCookie = loginResponse.cookies.find((c) => c.name === SESSION_COOKIE_NAME);

    const response = await app.inject({
      method: 'GET',
      path: `/api/v1${url}?dataId=${formDataId1.toString()}&dataId=${formDataId2.toString()}`,
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as FormDataGetReply;
    expect(response.statusCode).toBe(200);
    expect(Object.keys(body).length).toBe(2);

    const data = body.data as FormDataGetReply[][];
    expect(Array.isArray(data)).toBeTruthy();
    expect(data.length).toBe(2);
    expect(data.length).toBe(2);
    expect(data[0][0].elemId).toBe('myElem1');
    expect(data[0][0].orderNr).toBe(0);
    expect(data[0][0].value).toBe(12);
    expect(data[0][0].valueType).toBe('number');
    expect(data[0][1].elemId).toBe('myElem2');
    expect(data[0][1].orderNr).toBe(1);
    expect(data[0][1].value).toBe('Some string');
    expect(data[0][1].valueType).toBe('string');
    expect(data[1][0].elemId).toBe('myElem1');
    expect(data[1][0].orderNr).toBe(0);
    expect(data[1][0].value).toBe(15);
    expect(data[1][0].valueType).toBe('number');
    expect(data[1][1].elemId).toBe('myElem2');
    expect(data[1][1].orderNr).toBe(1);
    expect(data[1][1].value).toBe('Some other string');
    expect(data[1][1].valueType).toBe('string');
  });

  it('should succesfully GET two public formData items only as a public user', async () => {
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
          label: { langKey: 'Number' },
        },
      ],
      [privilege],
      {
        formTitle: 'My Form',
        formText: 'This is my form',
        formDataDefaultPrivileges: {
          read: { public: 'true', requireCsrfHeader: true },
        },
      }
    );
    const formDataId1 = await createFormData(formId, url, {}, [
      { elemId: 'myElem1', orderNr: 0, value: 12, valueType: 'number' },
      { elemId: 'myElem2', orderNr: 1, value: 'Some string', valueType: 'string' },
    ]);
    const formDataId2 = await createFormData(formId, url, {}, [
      { elemId: 'myElem1', orderNr: 0, value: 15, valueType: 'number' },
      { elemId: 'myElem2', orderNr: 1, value: 'Some other string', valueType: 'string' },
    ]);

    const response = await app.inject({
      method: 'GET',
      path: `/api/v1${url}?dataId=${formDataId1.toString()}&dataId=${formDataId2.toString()}`,
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as FormDataGetReply;
    expect(response.statusCode).toBe(200);
    expect(Object.keys(body).length).toBe(2);

    const data = body.data as FormDataGetReply[][];
    expect(Array.isArray(data)).toBeTruthy();
    expect(data.length).toBe(2);
    expect(data[0][0].elemId).toBe('myElem1');
    expect(data[0][0].orderNr).toBe(0);
    expect(data[0][0].value).toBe(12);
    expect(data[0][0].valueType).toBe('number');
    expect(data[0][1].elemId).toBe('myElem2');
    expect(data[0][1].orderNr).toBe(1);
    expect(data[0][1].value).toBe('Some string');
    expect(data[0][1].valueType).toBe('string');
    expect(data[1][0].elemId).toBe('myElem1');
    expect(data[1][0].orderNr).toBe(0);
    expect(data[1][0].value).toBe(15);
    expect(data[1][0].valueType).toBe('number');
    expect(data[1][1].elemId).toBe('myElem2');
    expect(data[1][1].orderNr).toBe(1);
    expect(data[1][1].value).toBe('Some other string');
    expect(data[1][1].valueType).toBe('string');
  });

  it('should succesfully GET one public formData item', async () => {
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
          label: { langKey: 'Number' },
        },
      ],
      [privilege],
      {
        formTitle: 'My Form',
        formText: 'This is my form',
        formDataDefaultPrivileges: {
          read: { public: 'true', requireCsrfHeader: true },
        },
      }
    );
    const formDataId1 = await createFormData(formId, url, {}, [
      { elemId: 'myElem1', orderNr: 0, value: 12, valueType: 'number' },
      { elemId: 'myElem2', orderNr: 1, value: 'Some string', valueType: 'string' },
    ]);

    const response = await app.inject({
      method: 'GET',
      path: `/api/v1${url}?dataId=${formDataId1.toString()}`,
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as FormDataGetReply;
    expect(response.statusCode).toBe(200);
    expect(Object.keys(body).length).toBe(1);

    const data = body.data as FormDataGetReply[];
    expect(Array.isArray(data)).toBeTruthy();
    expect(data[0].elemId).toBe('myElem1');
    expect(data[0].orderNr).toBe(0);
    expect(data[0].value).toBe(12);
    expect(data[0].valueType).toBe('number');
    expect(data[1].elemId).toBe('myElem2');
    expect(data[1].orderNr).toBe(1);
    expect(data[1].value).toBe('Some string');
    expect(data[1].valueType).toBe('string');
  });

  it('should succesfully GET one public formData item as flat object', async () => {
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
          label: { langKey: 'Number' },
        },
      ],
      [privilege],
      {
        formTitle: 'My Form',
        formText: 'This is my form',
        formDataDefaultPrivileges: {
          read: { public: 'true', requireCsrfHeader: true },
        },
      }
    );
    const formDataId1 = await createFormData(formId, url, {}, [
      { elemId: 'myElem1', orderNr: 0, value: 12, valueType: 'number' },
      { elemId: 'myElem2', orderNr: 1, value: 'Some string', valueType: 'string' },
    ]);

    const response = await app.inject({
      method: 'GET',
      path: `/api/v1${url}?dataId=${formDataId1.toString()}&flat=true`,
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as FormDataGetReply;
    expect(response.statusCode).toBe(200);
    expect(Object.keys(body).length).toBe(2);
    expect(body.myElem1).toBe(12);
    expect(body.myElem2).toBe('Some string');
  });

  it('should succesfully GET one non-public formData item only when in privilege users', async () => {
    const userId = await createUser('myusername');
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
          label: { langKey: 'Number' },
        },
      ],
      [privilege],
      {
        formTitle: 'My Form',
        formText: 'This is my form',
        formDataDefaultPrivileges: {
          read: { public: 'false', requireCsrfHeader: true, users: [userId] },
        },
      }
    );
    const formDataId1 = await createFormData(formId, url, {}, [
      { elemId: 'myElem1', orderNr: 0, value: 12, valueType: 'number' },
      { elemId: 'myElem2', orderNr: 1, value: 'Some string', valueType: 'string' },
    ]);

    const loginResponse = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: {
        usernameOrEmail: 'myusername',
        pass: 'password',
        loginMethod: 'username',
        agentId: validAgentId,
      },
      ...csrfHeader,
    });
    const sessionCookie = loginResponse.cookies.find((c) => c.name === SESSION_COOKIE_NAME);

    const response = await app.inject({
      method: 'GET',
      path: `/api/v1${url}?dataId=${formDataId1.toString()}`,
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as FormDataGetReply;
    expect(response.statusCode).toBe(200);
    expect(Object.keys(body).length).toBe(1);

    const data = body.data as FormDataGetReply[];
    expect(Array.isArray(data)).toBeTruthy();
    expect(data[0].elemId).toBe('myElem1');
    expect(data[0].orderNr).toBe(0);
    expect(data[0].value).toBe(12);
    expect(data[0].valueType).toBe('number');
    expect(data[1].elemId).toBe('myElem2');
    expect(data[1].orderNr).toBe(1);
    expect(data[1].value).toBe('Some string');
    expect(data[1].valueType).toBe('string');
  });

  it('should succesfully GET one non-public formData item only as flat object when in privilege users', async () => {
    const userId = await createUser('myusername');
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
          label: { langKey: 'Number' },
        },
      ],
      [privilege],
      {
        formTitle: 'My Form',
        formText: 'This is my form',
        formDataDefaultPrivileges: {
          read: { public: 'false', requireCsrfHeader: true, users: [userId] },
        },
      }
    );
    const formDataId1 = await createFormData(formId, url, {}, [
      { elemId: 'myElem1', orderNr: 0, value: 12, valueType: 'number' },
      { elemId: 'myElem2', orderNr: 1, value: 'Some string', valueType: 'string' },
    ]);

    const loginResponse = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: {
        usernameOrEmail: 'myusername',
        pass: 'password',
        loginMethod: 'username',
        agentId: validAgentId,
      },
      ...csrfHeader,
    });
    const sessionCookie = loginResponse.cookies.find((c) => c.name === SESSION_COOKIE_NAME);

    const response = await app.inject({
      method: 'GET',
      path: `/api/v1${url}?dataId=${formDataId1.toString()}&flat=true`,
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as FormDataGetReply;
    expect(response.statusCode).toBe(200);
    expect(Object.keys(body).length).toBe(2);
    expect(body.myElem1).toBe(12);
    expect(body.myElem2).toBe('Some string');
  });

  it('should succesfully GET one non-public formData item only when in privilege groups (and user is in that group)', async () => {
    const userId = await createUser('myusername');
    const groupId = await createGroup('mygroup', undefined, [userId]);
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
          label: { langKey: 'Number' },
        },
      ],
      [privilege],
      {
        formTitle: 'My Form',
        formText: 'This is my form',
        formDataDefaultPrivileges: {
          read: { public: 'false', requireCsrfHeader: true, groups: [groupId] },
        },
      }
    );
    const formDataId1 = await createFormData(formId, url, {}, [
      { elemId: 'myElem1', orderNr: 0, value: 12, valueType: 'number' },
      { elemId: 'myElem2', orderNr: 1, value: 'Some string', valueType: 'string' },
    ]);

    const loginResponse = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: {
        usernameOrEmail: 'myusername',
        pass: 'password',
        loginMethod: 'username',
        agentId: validAgentId,
      },
      ...csrfHeader,
    });
    const sessionCookie = loginResponse.cookies.find((c) => c.name === SESSION_COOKIE_NAME);

    const response = await app.inject({
      method: 'GET',
      path: `/api/v1${url}?dataId=${formDataId1.toString()}`,
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as FormDataGetReply;
    expect(response.statusCode).toBe(200);
    expect(Object.keys(body).length).toBe(1);

    const data = body.data as FormDataGetReply[];
    expect(Array.isArray(data)).toBeTruthy();
    expect(data[0].elemId).toBe('myElem1');
    expect(data[0].orderNr).toBe(0);
    expect(data[0].value).toBe(12);
    expect(data[0].valueType).toBe('number');
    expect(data[1].elemId).toBe('myElem2');
    expect(data[1].orderNr).toBe(1);
    expect(data[1].value).toBe('Some string');
    expect(data[1].valueType).toBe('string');
  });

  it('should succesfully GET one non-public formData item only as flat object when in privilege groups (and user is in that group)', async () => {
    const userId = await createUser('myusername');
    const groupId = await createGroup('mygroup', undefined, [userId]);
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
          label: { langKey: 'Number' },
        },
      ],
      [privilege],
      {
        formTitle: 'My Form',
        formText: 'This is my form',
        formDataDefaultPrivileges: {
          read: { public: 'false', requireCsrfHeader: true, groups: [groupId] },
        },
      }
    );
    const formDataId1 = await createFormData(formId, url, {}, [
      { elemId: 'myElem1', orderNr: 0, value: 12, valueType: 'number' },
      { elemId: 'myElem2', orderNr: 1, value: 'Some string', valueType: 'string' },
    ]);

    const loginResponse = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: {
        usernameOrEmail: 'myusername',
        pass: 'password',
        loginMethod: 'username',
        agentId: validAgentId,
      },
      ...csrfHeader,
    });
    const sessionCookie = loginResponse.cookies.find((c) => c.name === SESSION_COOKIE_NAME);

    const response = await app.inject({
      method: 'GET',
      path: `/api/v1${url}?dataId=${formDataId1.toString()}&flat=true`,
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as FormDataGetReply;
    expect(response.statusCode).toBe(200);
    expect(Object.keys(body).length).toBe(2);
    expect(body.myElem1).toBe(12);
    expect(body.myElem2).toBe('Some string');
  });

  it('should succesfully GET one non-public formData item only as a super admin', async () => {
    await createSysAdmin(true);
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
          label: { langKey: 'Number' },
        },
      ],
      [privilege],
      {
        formTitle: 'My Form',
        formText: 'This is my form',
        formDataDefaultPrivileges: {
          read: { public: 'false', requireCsrfHeader: true },
        },
      }
    );
    const formDataId1 = await createFormData(formId, url, {}, [
      { elemId: 'myElem1', orderNr: 0, value: 12, valueType: 'number' },
      { elemId: 'myElem2', orderNr: 1, value: 'Some string', valueType: 'string' },
    ]);

    const loginResponse = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: {
        usernameOrEmail: 'superadmin',
        pass: 'password',
        loginMethod: 'username',
        agentId: validAgentId,
      },
      ...csrfHeader,
    });
    const sessionCookie = loginResponse.cookies.find((c) => c.name === SESSION_COOKIE_NAME);

    const response = await app.inject({
      method: 'GET',
      path: `/api/v1${url}?dataId=${formDataId1.toString()}`,
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as FormDataGetReply;
    expect(response.statusCode).toBe(200);
    expect(Object.keys(body).length).toBe(1);

    const data = body.data as FormDataGetReply[];
    expect(Array.isArray(data)).toBeTruthy();
    expect(data[0].elemId).toBe('myElem1');
    expect(data[0].orderNr).toBe(0);
    expect(data[0].value).toBe(12);
    expect(data[0].valueType).toBe('number');
    expect(data[1].elemId).toBe('myElem2');
    expect(data[1].orderNr).toBe(1);
    expect(data[1].value).toBe('Some string');
    expect(data[1].valueType).toBe('string');
  });

  it('should succesfully GET one non-public formData item only as flat object as a super admin', async () => {
    await createSysAdmin(true);
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
          label: { langKey: 'Number' },
        },
      ],
      [privilege],
      {
        formTitle: 'My Form',
        formText: 'This is my form',
        formDataDefaultPrivileges: {
          read: { public: 'false', requireCsrfHeader: true },
        },
      }
    );
    const formDataId1 = await createFormData(formId, url, {}, [
      { elemId: 'myElem1', orderNr: 0, value: 12, valueType: 'number' },
      { elemId: 'myElem2', orderNr: 1, value: 'Some string', valueType: 'string' },
    ]);

    const loginResponse = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: {
        usernameOrEmail: 'superadmin',
        pass: 'password',
        loginMethod: 'username',
        agentId: validAgentId,
      },
      ...csrfHeader,
    });
    const sessionCookie = loginResponse.cookies.find((c) => c.name === SESSION_COOKIE_NAME);

    const response = await app.inject({
      method: 'GET',
      path: `/api/v1${url}?dataId=${formDataId1.toString()}&flat=true`,
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as FormDataGetReply;
    expect(response.statusCode).toBe(200);
    expect(Object.keys(body).length).toBe(2);
    expect(body.myElem1).toBe(12);
    expect(body.myElem2).toBe('Some string');
  });

  it('should GET nothing when trying to get a non-public formData item and when user not in formData users nor groups privileges', async () => {
    await createUser('myusername');
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
          label: { langKey: 'Number' },
        },
      ],
      [privilege],
      {
        formTitle: 'My Form',
        formText: 'This is my form',
        formDataDefaultPrivileges: {
          read: { public: 'false', requireCsrfHeader: true },
        },
      }
    );
    const formDataId1 = await createFormData(formId, url, {}, [
      { elemId: 'myElem1', orderNr: 0, value: 12, valueType: 'number' },
      { elemId: 'myElem2', orderNr: 1, value: 'Some string', valueType: 'string' },
    ]);

    const loginResponse = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: {
        usernameOrEmail: 'myusername',
        pass: 'password',
        loginMethod: 'username',
        agentId: validAgentId,
      },
      ...csrfHeader,
    });
    const sessionCookie = loginResponse.cookies.find((c) => c.name === SESSION_COOKIE_NAME);

    const response = await app.inject({
      method: 'GET',
      path: `/api/v1${url}?dataId=${formDataId1.toString()}`,
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as FormDataGetReply;
    expect(response.statusCode).toBe(200);
    expect(Object.keys(body).length).toBe(0);
  });

  it('should GET nothing when trying to get a non-public formData item and when user in excluded formData users privileges', async () => {
    const userId = await createUser('myusername');
    const url = '/myform';
    const formId = 'myForm';
    const privilege = {
      priCategoryId: 'form',
      priTargetId: formId,
      priAccessId: 'canUseForm',
      privilegeAccess: { public: 'false' as PublicPrivilegeProp },
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
          label: { langKey: 'Number' },
        },
      ],
      [privilege],
      {
        formTitle: 'My Form',
        formText: 'This is my form',
        formDataDefaultPrivileges: {
          read: {
            public: 'false',
            requireCsrfHeader: true,
            users: [userId],
            excludeUsers: [userId],
          },
        },
      }
    );
    const formDataId1 = await createFormData(formId, url, {}, [
      { elemId: 'myElem1', orderNr: 0, value: 12, valueType: 'number' },
      { elemId: 'myElem2', orderNr: 1, value: 'Some string', valueType: 'string' },
    ]);

    const loginResponse = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: {
        usernameOrEmail: 'myusername',
        pass: 'password',
        loginMethod: 'username',
        agentId: validAgentId,
      },
      ...csrfHeader,
    });
    const sessionCookie = loginResponse.cookies.find((c) => c.name === SESSION_COOKIE_NAME);

    const response = await app.inject({
      method: 'GET',
      path: `/api/v1${url}?dataId=${formDataId1.toString()}`,
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as FormDataGetReply;
    expect(response.statusCode).toBe(200);
    expect(Object.keys(body).length).toBe(0);
  });

  it('should GET nothing when trying to get a non-public formData item and when user in excluded formData groups privileges', async () => {
    const userId = await createUser('myusername');
    const groupId = await createGroup('mygroup', undefined, [userId]);
    const url = '/myform';
    const formId = 'myForm';
    const privilege = {
      priCategoryId: 'form',
      priTargetId: formId,
      priAccessId: 'canUseForm',
      privilegeAccess: { public: 'false' as PublicPrivilegeProp },
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
          label: { langKey: 'Number' },
        },
      ],
      [privilege],
      {
        formTitle: 'My Form',
        formText: 'This is my form',
        formDataDefaultPrivileges: {
          read: {
            public: 'false',
            requireCsrfHeader: true,
            users: [userId],
            excludeGroups: [groupId],
          },
        },
      }
    );
    const formDataId1 = await createFormData(formId, url, {}, [
      { elemId: 'myElem1', orderNr: 0, value: 12, valueType: 'number' },
      { elemId: 'myElem2', orderNr: 1, value: 'Some string', valueType: 'string' },
    ]);

    const loginResponse = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: {
        usernameOrEmail: 'myusername',
        pass: 'password',
        loginMethod: 'username',
        agentId: validAgentId,
      },
      ...csrfHeader,
    });
    const sessionCookie = loginResponse.cookies.find((c) => c.name === SESSION_COOKIE_NAME);

    const response = await app.inject({
      method: 'GET',
      path: `/api/v1${url}?dataId=${formDataId1.toString()}`,
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as FormDataGetReply;
    expect(response.statusCode).toBe(200);
    expect(Object.keys(body).length).toBe(0);
  });

  it('should GET nothing when trying to get a onlyPublic formData item and when user is signed in', async () => {
    await createUser('myusername');
    const url = '/myform';
    const formId = 'myForm';
    const privilege = {
      priCategoryId: 'form',
      priTargetId: formId,
      priAccessId: 'canUseForm',
      privilegeAccess: { public: 'false' as PublicPrivilegeProp },
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
          label: { langKey: 'Number' },
        },
      ],
      [privilege],
      {
        formTitle: 'My Form',
        formText: 'This is my form',
        formDataDefaultPrivileges: {
          read: { public: 'onlyPublic', requireCsrfHeader: true },
        },
      }
    );
    const formDataId1 = await createFormData(formId, url, {}, [
      { elemId: 'myElem1', orderNr: 0, value: 12, valueType: 'number' },
      { elemId: 'myElem2', orderNr: 1, value: 'Some string', valueType: 'string' },
    ]);

    const loginResponse = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: {
        usernameOrEmail: 'myusername',
        pass: 'password',
        loginMethod: 'username',
        agentId: validAgentId,
      },
      ...csrfHeader,
    });
    const sessionCookie = loginResponse.cookies.find((c) => c.name === SESSION_COOKIE_NAME);

    const response = await app.inject({
      method: 'GET',
      path: `/api/v1${url}?dataId=${formDataId1.toString()}`,
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as FormDataGetReply;
    expect(response.statusCode).toBe(200);
    expect(Object.keys(body).length).toBe(0);
  });

  it('should GET nothing when trying to get a non-public formData item and when user is not signed in', async () => {
    const url = '/myform';
    const formId = 'myForm';
    const privilege = {
      priCategoryId: 'form',
      priTargetId: formId,
      priAccessId: 'canUseForm',
      privilegeAccess: { public: 'false' as PublicPrivilegeProp },
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
          label: { langKey: 'Number' },
        },
      ],
      [privilege],
      {
        formTitle: 'My Form',
        formText: 'This is my form',
        formDataDefaultPrivileges: {
          read: { public: 'false', requireCsrfHeader: true },
        },
      }
    );
    const formDataId1 = await createFormData(formId, url, {}, [
      { elemId: 'myElem1', orderNr: 0, value: 12, valueType: 'number' },
      { elemId: 'myElem2', orderNr: 1, value: 'Some string', valueType: 'string' },
    ]);

    const response = await app.inject({
      method: 'GET',
      path: `/api/v1${url}?dataId=${formDataId1.toString()}`,
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as FormDataGetReply;
    expect(response.statusCode).toBe(200);
    expect(Object.keys(body).length).toBe(0);
  });

  it('should succesfully GET multiple public formData items and correct pagination data', async () => {
    const url = '/myform';
    const formId = 'myForm';
    const privilege = {
      priCategoryId: 'form',
      priTargetId: formId,
      priAccessId: 'canUseForm',
      privilegeAccess: { public: 'false' as PublicPrivilegeProp },
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
          label: { langKey: 'Number' },
        },
      ],
      [privilege],
      {
        formTitle: 'My Form',
        formText: 'This is my form',
        formDataDefaultPrivileges: {
          read: { public: 'true', requireCsrfHeader: true },
        },
      }
    );
    const formDataId1 = await createFormData(formId, url, {}, [
      { elemId: 'myElem1', orderNr: 0, value: 12, valueType: 'number' },
      { elemId: 'myElem2', orderNr: 1, value: 'Some string', valueType: 'string' },
    ]);
    const formDataId2 = await createFormData(formId, url, {}, [
      { elemId: 'myElem1', orderNr: 0, value: 11, valueType: 'number' },
      { elemId: 'myElem2', orderNr: 1, value: 'Some long string', valueType: 'string' },
    ]);
    const formDataId3 = await createFormData(formId, url, {}, [
      { elemId: 'myElem1', orderNr: 0, value: 152, valueType: 'number' },
      { elemId: 'myElem2', orderNr: 1, value: 'Some beautiful string', valueType: 'string' },
    ]);
    const formDataId4 = await createFormData(formId, url, {}, [
      { elemId: 'myElem1', orderNr: 0, value: 0, valueType: 'number' },
      { elemId: 'myElem2', orderNr: 1, value: 'Some ugly string', valueType: 'string' },
    ]);

    const responseP1 = await app.inject({
      method: 'GET',
      path: `/api/v1${url}?limit=2&dataId=${formDataId1.toString()}&dataId=${formDataId2.toString()}&dataId=${formDataId3.toString()}&dataId=${formDataId4.toString()}`,
      ...csrfHeader,
    });
    const bodyP1 = JSON.parse(responseP1.body) as FormDataGetReply;
    expect(responseP1.statusCode).toBe(200);
    expect(Object.keys(bodyP1).length).toBe(2);

    const paginationP1 = bodyP1.$pagination as PaginationData;
    expect(Object.keys(paginationP1).length).toBe(7);
    expect(paginationP1.totalCount).toBe(4);
    expect(paginationP1.limit).toBe(2);
    expect(paginationP1.offset).toBe(0);
    expect(paginationP1.page).toBe(1);
    expect(paginationP1.totalPages).toBe(2);
    expect(paginationP1.hasNextPage).toBeTruthy();
    expect(paginationP1.hasPrevPage).toBeFalsy();

    const responseP2 = await app.inject({
      method: 'GET',
      path: `/api/v1${url}?limit=2&offset=2&dataId=${formDataId1.toString()}&dataId=${formDataId2.toString()}&dataId=${formDataId3.toString()}&dataId=${formDataId4.toString()}`,
      ...csrfHeader,
    });
    const bodyP2 = JSON.parse(responseP2.body) as FormDataGetReply;
    expect(responseP2.statusCode).toBe(200);
    expect(Object.keys(bodyP2).length).toBe(2);

    const paginationP2 = bodyP2.$pagination as PaginationData;
    expect(Object.keys(paginationP2).length).toBe(7);
    expect(paginationP2.totalCount).toBe(4);
    expect(paginationP2.limit).toBe(2);
    expect(paginationP2.offset).toBe(2);
    expect(paginationP2.page).toBe(2);
    expect(paginationP2.totalPages).toBe(2);
    expect(paginationP2.hasNextPage).toBeFalsy();
    expect(paginationP2.hasPrevPage).toBeTruthy();
  });
});
