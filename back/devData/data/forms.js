const randomIntFromInterval = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);
const { default: DBFormModel } = require('../../dist/back/src/dbModels/form');
const { default: DBFormDataModel } = require('../../dist/back/src/dbModels/formData');
const { getSuperAdminId } = require('./_config');

const formIds = [
  'formId1',
  'formId2',
  'formId3',
  'formId4',
  'formId5',
  'formId6',
  'formId7',
  'formId8',
  'formId9',
  'formId10',
  'formId11',
  'formId12',
  'formId13',
  'formId14',
  'formId15',
  'formId16',
  'formId17',
  'formId18',
  'formId19',
  'formId20',
];

const removeForms = async () => {
  console.log('\nFORMS:');
  console.log('Check and remove forms and formData...');
  let result = await DBFormModel.deleteMany({ simpleId: { $in: formIds } });
  const deletedFormsCount = result.deletedCount || 0;
  result = await DBFormDataModel.deleteMany({ formId: { $in: formIds } });
  const deletedFormDataCount = result.deletedCount || 0;
  console.log(`Removed ${deletedFormsCount} forms and ${deletedFormDataCount} formData items.`);
};

const createForms = async () => {
  await removeForms();
  console.log('Create forms...');

  const forms = [];
  for (let i = 0; i < formIds.length; i++) {
    forms.push(
      await createRandomForm(
        formIds[i],
        `Form name ${i + 1}`,
        `Form description ${i + 1}`,
        `/customform${i + 1}`,
        {}
      )
    );
  }

  await DBFormModel.insertMany(forms);

  console.log(`Created ${formIds.length} seed data forms.`);
  console.log('- Form IDs: formId1 - formId20');
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
          { labelLangKey: 'Option 1', value: 'value1' },
          { labelLangKey: 'Option 2', value: 'value2' },
          { labelLangKey: 'Option 3', value: 'value3' },
        ],
      };
    case 'inputRadioGroup':
      return {
        options: [
          { labelLangKey: 'Option 1', value: 'value1' },
          { labelLangKey: 'Option 2', value: 'value2' },
          { labelLangKey: 'Option 3', value: 'value3' },
        ],
      };
    case 'inputDropdown':
      return {
        options: [
          { labelLangKey: 'Option 1', value: 'value1' },
          { labelLangKey: 'Option 2', value: 'value2' },
          { labelLangKey: 'Option 3', value: 'value3' },
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
  const formElemCount = randomIntFromInterval(1, 15);
  const formElems = [];
  for (let i = 0; i < formElemCount; i++) {
    const formElemIndex = randomIntFromInterval(1, 8) - 1;
    const formElem = {
      elemId: 'testElem' + i,
      orderNr: i,
      elemType: formElemTypes[formElemIndex],
      valueType: createValueType(formElemTypes[formElemIndex]),
      elemData: createElemData(formElemTypes[formElemIndex]),
      labelLangKey: 'Label ' + (i + 1),
      required: Math.round(Math.random()) > 0.5,
      // @TODO: add validationRegExt, mustMatchValue, validationFn
      doNotSave: formElemTypes[formElemIndex] === 'text',
    };
    formElems.push(formElem);
  }
  formElems.push({
    elemId: 'testElem' + formElemCount,
    orderNr: formElemCount,
    elemType: 'button',
    valueType: 'none',
    elemData: { buttonType: 'reset' },
    labelLangKey: 'Reset',
    required: false,
    doNotSave: true,
  });
  formElems.push({
    elemId: 'testElem' + (formElemCount + 1),
    orderNr: formElemCount + 1,
    elemType: 'button',
    valueType: 'none',
    elemData: { buttonType: 'submit' },
    labelLangKey: 'Save',
    required: false,
    doNotSave: true,
  });

  form.form = {
    formTitleLangKey: 'Form title',
    formTextLangKey: 'Form text...',
    formElems: formElems,
  };

  if (opts?.formDataOwner) form.form.formDataOwner = opts.formDataOwner;
  if (opts?.formDataPrivileges) form.form.formDataPrivileges = opts.formDataPrivileges;

  return form;
};

module.exports = { createForms, removeForms };
