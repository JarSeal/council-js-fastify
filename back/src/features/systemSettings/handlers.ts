import type { RouteHandler } from 'fastify';

import type { SystemSettingsGetRoute } from './routes';
import { getUserData, isPrivBlocked } from '../../utils/userAndPrivilegeChecks';
import DBPrivilegeModel, { type DBPrivilege } from '../../dbModels/privilege';
import { isCsrfGood } from '../../hooks/csrf';
import { errors } from '../../core/errors';
import DBFormModel, { type DBForm } from '../../dbModels/form';
import DBSystemSettingModel, { type DBSystemSetting } from '../../dbModels/systemSetting';

export const systemSettingsGetRoute: RouteHandler<SystemSettingsGetRoute> = async (req, res) => {
  const { category, settingId } = req.query;

  const userData = await getUserData(req);
  const csrfIsGood = isCsrfGood(req);

  // Check privilege for reading
  const privilegeId = 'form__systemSettings__canReadData';
  const privilege = await DBPrivilegeModel.findOne<DBPrivilege>({ simpleId: privilegeId });
  const privError = isPrivBlocked(privilege?.privilegeAccess, userData, csrfIsGood);
  if (privError) {
    return new errors.UNAUTHORIZED(
      `User not authorized to read Council System Settings: ${JSON.stringify(privError)}`
    );
  }

  // Get systemSettings form
  const sysSettingsForm = await DBFormModel.findOne<DBForm>({ simpleId: 'systemSettings' });
  if (!sysSettingsForm) {
    return new errors.NOT_FOUND('Could not find Council System Settings form');
  }

  // Get saved settings
  let search = {},
    searchType;
  if (settingId && Array.isArray(settingId)) {
    search = { simpleId: { $in: settingId } };
    searchType = 'settingIdArray';
  } else if (settingId) {
    search = { simpleId: settingId };
    searchType = 'settingId';
  } else if (category && Array.isArray(category)) {
    search = { category: { $in: category } };
    searchType = 'categoryArray';
  } else if (category) {
    search = { category: category };
    searchType = 'category';
  }
  const settings = await DBSystemSettingModel.find<DBSystemSetting>(search);

  // Map data to form
  const returnData = [];
  if (sysSettingsForm?.form.formElems) {
    for (let i = 0; i < sysSettingsForm.form.formElems.length; i++) {
      const elem = sysSettingsForm.form.formElems[i];
      if (
        (searchType === 'settingIdArray' && !settingId?.includes(elem.elemId)) ||
        (searchType === 'categoryArray' && !category?.includes(String(elem.elemData?.category))) ||
        (searchType === 'settingId' && elem.elemId !== settingId) ||
        (searchType === 'category' && elem.elemData?.category !== category)
      ) {
        continue;
      }
      const setting = settings.find((s) => s.simpleId === elem.elemId);
      let value = setting?.value as unknown;
      if (value === undefined) {
        value = elem.elemData?.defaultValue === undefined ? undefined : elem.elemData?.defaultValue;
      }
      returnData.push({
        elemId: elem.elemId,
        value,
        valueType: elem.valueType,
        category: setting?.category || String(elem.elemData?.category),
        edited: setting?.edited || [],
      });
    }
  }

  return res.send(returnData);
};
