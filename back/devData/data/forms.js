const randomIntFromInterval = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

const createRandomForm = (formId) => {
  const formElemCount = randomIntFromInterval(1, 15);
  const formElems = [];
  for (let i = 0; i < formElemCount; i++) {
    const formElemIndex = randomIntFromInterval(1, 9) - 1;
    const formElem = {
      elemId: 'testElem' + i,
      orderNr: i,
      elemType: formElemTypes[formElemIndex],
      valueType: createValueType(formElemTypes[formElemIndex]),
      elemData: createElemData(formElemTypes[formElemIndex]),
      labelLangKey: 'Label ' + (i + 1),
      required: Math.round(Math.random()) > 0.5,
      // @TODO: add validationRegExt, mustMatchValue, validationFn
      doNotSave: formElemTypes[formElemIndex] !== 'text',
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

// button
const createButtonElem = ({ elemId, orderNr, elemData, labelLangKey, privileges }) => ({
  elemId,
  orderNr,
  elemType: 'button',
  valueType: 'string',
  elemData,
  labelLangKey,
  required: false,
  doNotSend: true,
  privileges,
});

// inputCheckbox
const createInputCheckbox = ({
  elemId,
  orderNr,
  valueType,
  elemData,
  labelLangKey,
  required,
  doNotSend,
  privileges,
}) => ({
  elemId,
  orderNr,
  elemType: 'inputCheckbox',
  valueType,
  elemData,
  labelLangKey,
  required,
  doNotSend,
  privileges,
});

// inputCheckboxGroup
const createInputCheckboxGroup = ({
  elemId,
  orderNr,
  elemData,
  labelLangKey,
  required,
  doNotSend,
  privileges,
}) => ({
  elemId,
  orderNr,
  elemType: 'inputCheckboxGroup',
  elemData,
  labelLangKey,
  required,
  doNotSend,
  privileges,
});

// inputRadioGroup
const createInputRadioGroup = ({
  elemId,
  orderNr,
  elemData,
  labelLangKey,
  required,
  doNotSend,
  privileges,
}) => ({
  elemId,
  orderNr,
  elemType: 'inputRadioGroup',
  elemData,
  labelLangKey,
  required,
  doNotSend,
  privileges,
});

// inputDropDown
const createInputDropdown = ({
  elemId,
  orderNr,
  elemData,
  labelLangKey,
  required,
  doNotSend,
  privileges,
}) => ({
  elemId,
  orderNr,
  elemType: 'inputDropdown',
  elemData,
  labelLangKey,
  required,
  doNotSend,
  privileges,
});

// inputText
const createInputText = ({
  elemId,
  orderNr,
  elemData,
  labelLangKey,
  required,
  doNotSend,
  privileges,
}) => ({
  elemId,
  orderNr,
  elemType: 'inputText',
  elemData,
  labelLangKey,
  required,
  doNotSend,
  privileges,
});

// inputNumber
const createInputNumber = ({
  elemId,
  orderNr,
  elemData,
  labelLangKey,
  required,
  doNotSend,
  privileges,
}) => ({
  elemId,
  orderNr,
  elemType: 'inputNumber',
  elemData,
  labelLangKey,
  required,
  doNotSend,
  privileges,
});

// hidden
const createHidden = ({
  elemId,
  orderNr,
  elemData,
  labelLangKey,
  required,
  doNotSend,
  privileges,
}) => ({
  elemId,
  orderNr,
  elemType: 'hidden',
  elemData,
  labelLangKey,
  required,
  doNotSend,
  privileges,
});
