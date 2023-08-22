// @TODO: Check if needed
export const getStringByteSize = (str: string) => new Blob([str]).size;

// @TODO: Check if needed
export const convertStringTo24Bytes = (str: string) => {
  if (!str) return 'dummyStringOf24bytes1234';

  const strippedStr = str.replace(/[^a-zA-Z0-9$.,!@#%&{([\])}\-*_]/g, '');
  const strSize = getStringByteSize(strippedStr);

  if (strSize === 24) return strippedStr;

  let convertedStr = strippedStr;
  if (strSize > 24) {
    // String is higher than 24 bytes
    convertedStr = strippedStr.substring(0, 24);
  } else {
    // String is lower than 24 bytes, make it longer by repeating it until 24 bytes
    let looper = 0;
    let index = 0;
    while (looper < 24) {
      if (index > strippedStr.length) index = 0;
      convertedStr += strippedStr.charAt(index);
      index++;
      looper++;
      if (convertedStr.length >= 24) {
        convertedStr = convertedStr.substring(0, 24);
        break;
      }
    }
  }

  return convertedStr;
};
