const randomIntFromInterval = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);
const { default: DBFormModel } = require('../../dist/back/src/dbModels/form');
const { default: DBFormDataModel } = require('../../dist/back/src/dbModels/formData');
const { default: DBPrivilegeModel } = require('../../dist/back/src/dbModels/privilege');
const { getSuperAdminId, getBasicUsersGroupId, getBasicUserId } = require('./_config');

let formDataCount = 0;

const getFormConfigs = async () => {
  const basicUsersId = await getBasicUsersGroupId();
  const basicUserId = await getBasicUserId();
  return [
    {
      formId: 'testform0',
      name: 'Basic user access form',
      description: 'Basic users have all access',
      url: '/testform0',
      opts: {
        formDataPrivileges: {
          read: { groups: [basicUsersId] },
          create: { groups: [basicUsersId] },
          edit: { groups: [basicUsersId] },
          delete: { groups: [basicUsersId] },
        },
        privileges: [
          {
            priCategoryId: 'form',
            priTargetId: 'testform0',
            priAccessId: 'canUseForm',
            privilegeAccess: {
              public: 'false',
              requireCsrfHeader: true,
              users: [],
              groups: [basicUsersId],
              excludeUsers: [],
              excludeGroups: [],
            },
          },
        ],
      },
    },
    {
      formId: 'testform1',
      name: 'Basic user denied from one form element form',
      description: 'Basic users have all access except one',
      url: '/testform1',
      opts: {
        formElems: [
          {
            elemId: 'testElem0',
            orderNr: 0,
            elemType: 'inputText',
            valueType: createValueType('inputText'),
            elemData: createElemData('inputText'),
            label: { langKey: 'Label 1' },
            required: true,
          },
          {
            elemId: 'testElem1',
            orderNr: 1,
            elemType: 'inputText',
            valueType: createValueType('inputText'),
            elemData: createElemData('inputText'),
            label: { langKey: 'Label 2' },
            required: true,
            privileges: {
              read: { excludeGroups: [basicUsersId] },
            },
          },
        ],
        formDataPrivileges: {
          read: { groups: [basicUsersId] },
          edit: { groups: [basicUsersId] },
          delete: { groups: [basicUsersId] },
        },
        formData: [
          {
            formId: 'testform1',
            url: '/testform1',
            owner: null,
            privileges: {
              read: { groups: [basicUsersId] },
              edit: { groups: [basicUsersId] },
              delete: { groups: [basicUsersId] },
            },
            hasElemPrivileges: true,
            canEditPrivileges: {
              users: [basicUserId],
              groups: [basicUsersId],
              excludeUsers: [],
              excludeGroups: [],
            },
            data: [
              {
                elemId: 'testElem0',
                value: 'Some text input data',
                privileges: {
                  read: { public: 'true' },
                },
              },
              {
                elemId: 'testElem1',
                value: 'Some hidden data',
                privileges: {
                  read: { excludeGroups: [basicUsersId] },
                },
              },
            ],
          },
        ],
        privileges: [
          {
            priCategoryId: 'form',
            priTargetId: 'testform1',
            priAccessId: 'canUseForm',
            privilegeAccess: {
              public: 'false',
              requireCsrfHeader: true,
              users: [],
              groups: [basicUsersId],
              excludeUsers: [],
              excludeGroups: [],
            },
          },
        ],
      },
    },
    {
      formId: 'testform2',
      name: 'Basic user access form as owner',
      description: 'Basic user is the owner of this form',
      url: '/testform2',
      formDataOwner: basicUserId,
    },
    {
      formId: 'testform3',
      name: 'Public data sets',
      description: 'Multiple public data sets',
      url: '/testform3',
      opts: {
        formElems: [
          {
            elemId: 'testElem0',
            orderNr: 0,
            elemType: 'inputText',
            valueType: createValueType('inputText'),
            elemData: createElemData('inputText'),
            label: { langKey: 'Label 1' },
            required: true,
          },
          {
            elemId: 'testElem1',
            orderNr: 1,
            elemType: 'inputNumber',
            valueType: createValueType('inputNumber'),
            elemData: createElemData('inputNumber'),
            label: { langKey: 'Label 2' },
            required: true,
          },
        ],
        formDataPrivileges: {
          read: { public: 'true' },
          create: { public: 'true' },
          edit: { groups: [basicUsersId] },
          delete: { groups: [basicUsersId] },
        },
        canEditPrivileges: {
          users: [],
          groups: [basicUsersId],
          excludeUsers: [],
          excludeGroups: [],
        },
        formData: [
          {
            formId: 'testform3',
            url: '/testform3',
            owner: null,
            privileges: {
              read: { public: 'true' },
              edit: { groups: [basicUsersId] },
              delete: { groups: [basicUsersId] },
            },
            data: [
              {
                elemId: 'testElem0',
                value: 'Some text input data 1',
              },
              {
                elemId: 'testElem1',
                value: 12,
              },
            ],
          },
          {
            formId: 'testform3',
            url: '/testform3',
            owner: null,
            privileges: {
              read: { public: 'true' },
              edit: { groups: [basicUsersId] },
              delete: { groups: [basicUsersId] },
            },
            data: [
              {
                elemId: 'testElem0',
                value: 'Some text input data 2',
              },
              {
                elemId: 'testElem1',
                value: 2,
              },
            ],
          },
          {
            formId: 'testform3',
            url: '/testform3',
            owner: null,
            privileges: {
              read: { public: 'true' },
              edit: { groups: [basicUsersId] },
              delete: { groups: [basicUsersId] },
            },
            data: [
              {
                elemId: 'testElem0',
                value: 'Some text input data 3',
              },
              {
                elemId: 'testElem1',
                value: 1245,
              },
            ],
          },
          {
            formId: 'testform3',
            url: '/testform3',
            owner: null,
            privileges: {
              read: { public: 'true' },
              edit: { groups: [basicUsersId] },
              delete: { groups: [basicUsersId] },
            },
            data: [
              {
                elemId: 'testElem0',
                value: 'Some text input data 4',
              },
              {
                elemId: 'testElem1',
                value: 5431254,
              },
            ],
          },
          {
            formId: 'testform3',
            url: '/testform3',
            owner: null,
            privileges: {
              read: { public: 'true' },
              edit: { groups: [basicUsersId] },
              delete: { groups: [basicUsersId] },
            },
            data: [
              {
                elemId: 'testElem0',
                value: 'Some text input data 5',
              },
              {
                elemId: 'testElem1',
                value: 0,
              },
            ],
          },
          {
            formId: 'testform3',
            url: '/testform3',
            owner: null,
            privileges: {
              read: { public: 'true' },
              edit: { groups: [basicUsersId] },
              delete: { groups: [basicUsersId] },
            },
            data: [
              {
                elemId: 'testElem0',
                value: 'äö some text input data 6',
              },
              {
                elemId: 'testElem1',
                value: 0,
              },
            ],
          },
          {
            formId: 'testform3',
            url: '/testform3',
            owner: null,
            privileges: {
              read: { public: 'true' },
              edit: { groups: [basicUsersId] },
              delete: { groups: [basicUsersId] },
            },
            data: [
              {
                elemId: 'testElem0',
                value: 'Ää some text input data 7',
              },
              {
                elemId: 'testElem1',
                value: 12,
              },
            ],
          },
        ],
        privileges: [
          {
            priCategoryId: 'form',
            priTargetId: 'testform3',
            priAccessId: 'canUseForm',
            privilegeAccess: {
              public: 'true',
              requireCsrfHeader: true,
              users: [],
              groups: [],
              excludeUsers: [],
              excludeGroups: [],
            },
          },
        ],
      },
    },
  ];
};

const removeForms = async () => {
  console.log('\nFORMS:');
  console.log('Check and remove forms, formData items, and form privileges...');

  const formConfigs = await getFormConfigs();

  // Forms
  let result = await DBFormModel.deleteMany({
    simpleId: { $in: formConfigs.map((f) => f.formId) },
  });
  const deletedFormsCount = result.deletedCount || 0;

  // Form data items
  result = await DBFormDataModel.deleteMany({ formId: { $in: formConfigs.map((f) => f.formId) } });
  const deletedFormDataCount = result.deletedCount || 0;

  // Form privileges
  result = await DBPrivilegeModel.deleteMany({
    priTargetId: { $in: formConfigs.map((f) => f.formId) },
  });
  const deletedFormPrivileges = result.deletedCount || 0;
  console.log(
    `Removed ${deletedFormsCount} forms, ${deletedFormDataCount} formData items, and ${deletedFormPrivileges} form privileges.`
  );
};

const createForms = async () => {
  await removeForms();
  console.log('Create forms...');

  const formConfigs = await getFormConfigs();
  let privilegesAdded = 0;
  const forms = [];
  for (let i = 0; i < formConfigs.length; i++) {
    forms.push(
      await createRandomForm(
        formConfigs[i].formId,
        formConfigs[i].name,
        formConfigs[i].description,
        formConfigs[i].url,
        formConfigs[i].opts
      )
    );

    // Create possible privileges
    if (formConfigs[i].opts?.privileges?.length) {
      const privileges = formConfigs[i].opts.privileges;
      for (let j = 0; j < privileges.length; j++) {
        const simpleId = `${privileges[j].priCategoryId}__${privileges[j].priTargetId}__${privileges[j].priAccessId}`;
        const privilege = new DBPrivilegeModel({
          simpleId,
          name: `${privileges[j].priCategoryId}, ${privileges[j].priTargetId}, ${privileges[j].priAccessId}`,
          description: 'Seed data privilege for ' + privileges[j].priTargetId,
          created: new Date(),
          edited: [],
          systemDocument: false,
          privilegeViewAccess: { users: [], groups: [], excludeUsers: [], excludeGroups: [] },
          privilegeEditAccess: { users: [], groups: [], excludeUsers: [], excludeGroups: [] },
          privilegeAccess: {
            public: 'false',
            requireCsrfHeader: true,
            users: [],
            groups: [],
            excludeUsers: [],
            excludeGroups: [],
          },
          ...privileges[j],
        });
        await privilege.save();
        privilegesAdded++;
      }
    }
  }

  await DBFormModel.insertMany(forms);

  console.log(
    `Created ${formConfigs.length} seed data forms, ${formDataCount} formData items, and ${privilegesAdded} form privileges.`
  );
  console.log('- formId "testform0" has all privileges set for "basicUsers" group');
  console.log(
    '- formId "testform1" has all privileges set for "basicUsers" group except 1 formElem (excludeGroups)'
  );
  console.log('- formId "testform2" has a basic user as formDataOwner');
};

const formElemTypes = [
  'text',
  'inputCheckbox',
  'inputCheckboxGroup',
  'inputRadioGroup',
  'inputDropdown',
  'inputText',
  'inputNumber',
  'hidden',
];

// valueType
const createValueType = (elemType) => {
  switch (elemType) {
    case 'text':
      return 'none';
    case 'inputCheckbox':
      return 'boolean';
    case 'inputCheckboxGroup':
      return 'stringArray';
    case 'inputRadioGroup':
      return 'string';
    case 'inputDropdown':
      return 'string';
    case 'inputText':
      return 'string';
    case 'inputNumber':
      return 'number';
    case 'hidden':
      return 'string';
  }
};

// elemData
const createElemData = (elemType) => {
  switch (elemType) {
    case 'text':
      return { text: 'Text here...' };
    case 'inputCheckbox':
      return { defaultValue: false, value: true };
    case 'inputCheckboxGroup':
      return {
        options: [
          { label: { langKey: 'Option 1' }, value: 'value1' },
          { label: { langKey: 'Option 2' }, value: 'value2' },
          { label: { langKey: 'Option 3' }, value: 'value3' },
        ],
      };
    case 'inputRadioGroup':
      return {
        options: [
          { label: { langKey: 'Option 1' }, value: 'value1' },
          { label: { langKey: 'Option 2' }, value: 'value2' },
          { label: { langKey: 'Option 3' }, value: 'value3' },
        ],
      };
    case 'inputDropdown':
      return {
        options: [
          { label: { langKey: 'Option 1' }, value: 'value1' },
          { label: { langKey: 'Option 2' }, value: 'value2' },
          { label: { langKey: 'Option 3' }, value: 'value3' },
        ],
      };
    case 'inputText':
      return {}; // @TODO: add some random configs
    case 'inputNumber':
      return {}; // @TODO: add some random configs
    case 'hidden':
      return {};
  }
};

// opts = { owner: UserId, formDataOwner: UserId, formDataPrivileges: FormDataPrivileges }
const createRandomForm = async (formId, formName, formDescription, url, opts) => {
  const superAdminId = await getSuperAdminId();

  const form = {
    simpleId: formId,
    name: formName,
    description: formDescription,
    created: {
      user: superAdminId,
      date: new Date(),
    },
    edited: [],
    systemDocument: false,
    owner: opts?.owner || superAdminId,
    url,
  };

  // Form elements
  let formElems = [];
  let formElemCount = 0;
  if (opts?.formElems?.length) {
    // Pre-configured formElems
    formElemCount = opts.formElems.length;
    formElems = opts.formElems;
  } else {
    // Random formElems
    formElemCount = randomIntFromInterval(1, 15);
    for (let i = 0; i < formElemCount; i++) {
      const formElemIndex = randomIntFromInterval(1, 8) - 1;
      const formElem = {
        elemId: 'testElem' + i,
        orderNr: i,
        elemType: formElemTypes[formElemIndex],
        valueType: createValueType(formElemTypes[formElemIndex]),
        elemData: createElemData(formElemTypes[formElemIndex]),
        label: { langKey: 'Label ' + (i + 1) },
        required: Math.round(Math.random()) > 0.5,
        // @TODO: add validationRegExt, mustMatchValue, validationFn
        doNotSave: formElemTypes[formElemIndex] === 'text',
      };
      formElems.push(formElem);
    }
  }

  formElems.push({
    elemId: 'testElem' + formElemCount,
    orderNr: formElemCount,
    elemType: 'button',
    valueType: 'none',
    elemData: { buttonType: 'reset' },
    label: { langKey: 'Reset' },
    required: false,
    doNotSave: true,
  });
  formElems.push({
    elemId: 'testElem' + (formElemCount + 1),
    orderNr: formElemCount + 1,
    elemType: 'button',
    valueType: 'none',
    elemData: { buttonType: 'submit' },
    label: { langKey: 'Save' },
    required: false,
    doNotSave: true,
  });

  form.form = {
    formTitle: { langKey: 'Form title for ' + formId },
    formText: { langKey: 'Form text...' },
    formElems: formElems,
  };

  if (opts?.formDataOwner) form.formDataOwner = opts.formDataOwner;
  if (opts?.hasElemPrivileges) form.hasElemPrivileges = opts.hasElemPrivileges;
  const privileges = {
    read: {
      public: 'false',
      requireCsrfHeader: true,
      users: [],
      groups: [],
      excludeUsers: [],
      excludeGroups: [],
      ...(opts?.formDataPrivileges?.read || {}),
    },
    create: {
      public: 'false',
      requireCsrfHeader: true,
      users: [],
      groups: [],
      excludeUsers: [],
      excludeGroups: [],
      ...(opts?.formDataPrivileges?.create || {}),
    },
    edit: {
      public: 'false',
      requireCsrfHeader: true,
      users: [],
      groups: [],
      excludeUsers: [],
      excludeGroups: [],
      ...(opts?.formDataPrivileges?.edit || {}),
    },
    delete: {
      public: 'false',
      requireCsrfHeader: true,
      users: [],
      groups: [],
      excludeUsers: [],
      excludeGroups: [],
      ...(opts?.formDataPrivileges?.delete || {}),
    },
  };
  form.formDataDefaultPrivileges = privileges;
  if (opts?.canEditPrivileges) {
    form.canEditPrivileges = opts.canEditPrivileges;
  }

  // Set possible formData
  if (opts?.formData?.length) {
    for (let i = 0; i < opts.formData.length; i++) {
      if (!opts.formData[i].created)
        opts.formData[i].created = { user: superAdminId, date: new Date() };
      if (!opts.formData[i].owner) opts.formData[i].owner = superAdminId;
      if (!opts.formData[i].hasElemPrivileges) opts.formData[i].hasElemPrivileges = false;
      const formData = new DBFormDataModel(opts.formData[i]);
      await formData.save();
      formDataCount++;
    }
  }

  return form;
};

module.exports = { createForms, removeForms };
