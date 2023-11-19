import type { FormData } from '../../@types/formData';
import type { DBFormData } from '../../dbModels/formData';

export const parseDataFromFormData = (formData: DBFormData[]): FormData[] => {
  const data: FormData[] = [];
  // @TODO: get formData default privileges (from the form object)
  for (let i = 0; i < formData.length; i++) {
    const fd = formData[i];
    // let curIndex = 0;
    for (let j = 0; j < fd.data.length; i++) {
      // @TODO: check elemData privileges (if any)

      const dataPiece = { dataId: fd.id?.toString() };
      dataPiece;
    }
  }
  return data;
};
