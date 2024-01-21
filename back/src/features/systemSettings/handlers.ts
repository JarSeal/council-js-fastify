import type { RouteHandler } from 'fastify';

import type { SystemSettingsGetRoute, SystemSettingsPutRoute } from './routes';
import { getUserData, isPrivBlocked } from '../../utils/userAndPrivilegeChecks';
import DBPrivilegeModel, { type DBPrivilege } from '../../dbModels/privilege';
import { isCsrfGood } from '../../hooks/csrf';
import { errors } from '../../core/errors';
import DBFormModel, { type DBForm } from '../../dbModels/form';
import DBSystemSettingModel, { type DBSystemSetting } from '../../dbModels/systemSetting';
import { validateFormDataInput } from '../../utils/validation';
import { createNewEditedArray } from '../../utils/parsingAndConverting';

// Read (GET)
export const systemSettingsGetRoute: RouteHandler<SystemSettingsGetRoute> = async (req, res) => {
  const { category, settingId, getForm } = req.query;

  const userData = await getUserData(req);
  const csrfIsGood = isCsrfGood(req);

  // Check privilege for reading
  const privileges = await DBPrivilegeModel.find<DBPrivilege>({
    $and: [{ priCategoryId: 'form' }, { priTargetId: 'systemSettings' }],
  });
  const readPrivilege = privileges.length
    ? privileges.find((priv) => priv.priAccessId === 'canReadData')
    : undefined;
  const privError = isPrivBlocked(readPrivilege?.privilegeAccess, userData, csrfIsGood);
  if (privError) {
    return res.send(
      new errors.UNAUTHORIZED(
        `User not authorized to read Council System Settings: ${JSON.stringify(privError)}`
      )
    );
  }
  if (getForm) {
    const useFormPrivilege = privileges.length
      ? privileges.find((priv) => priv.priAccessId === 'canUseForm')
      : undefined;
    const privError = isPrivBlocked(useFormPrivilege?.privilegeAccess, userData, csrfIsGood);
    if (privError) {
      return res.send(
        new errors.UNAUTHORIZED(
          `User not authorized to use Council System Settings form: ${JSON.stringify(privError)}`
        )
      );
    }
  }

  const returnObject = await getSystemSettings({ settingId, category, getForm });

  return res.send(returnObject);
};

// Edit / Create (PUT)
export const systemSettingsPutRoute: RouteHandler<SystemSettingsPutRoute> = async (req, res) => {
  const { data, getData } = req.body;

  // Check if data to be saved is empty
  if (!data?.length) {
    return res.send(new errors.BAD_REQUEST('No system settings data to update'));
  }

  const userData = await getUserData(req);
  const csrfIsGood = isCsrfGood(req);

  // Check privileges
  const privileges = await DBPrivilegeModel.find<DBPrivilege>({
    $and: [{ priCategoryId: 'form' }, { priTargetId: 'systemSettings' }],
  });
  const readPrivilege = privileges.length
    ? privileges.find((priv) => priv.priAccessId === 'canReadData')
    : undefined;
  let privError = isPrivBlocked(readPrivilege?.privilegeAccess, userData, csrfIsGood);
  if (privError) {
    return res.send(
      new errors.UNAUTHORIZED(
        `User not authorized to read Council System Settings: ${JSON.stringify(privError)}`
      )
    );
  }
  const useFormPrivilege = privileges.length
    ? privileges.find((priv) => priv.priAccessId === 'canUseForm')
    : undefined;
  privError = isPrivBlocked(useFormPrivilege?.privilegeAccess, userData, csrfIsGood);
  if (privError) {
    return res.send(
      new errors.UNAUTHORIZED(
        `User not authorized to use Council System Settings form: ${JSON.stringify(privError)}`
      )
    );
  }

  // Get systemSettings form
  const sysSettingsForm = await DBFormModel.findOne<DBForm>({ simpleId: 'systemSettings' });
  if (!sysSettingsForm) {
    return new errors.NOT_FOUND('Could not find Council System Settings form');
  }

  let ok = false;

  // Validate data
  let error = {};
  const validationError = validateFormDataInput(sysSettingsForm.form.formElems, data);
  if (validationError) {
    error = validationError;
  } else {
    // Get existing data
    const existingData = await DBSystemSettingModel.find<DBSystemSetting>({
      simpleId: { $in: data.map((d) => d.elemId) },
    });

    // Prepare save data
    const bulkWrite = [];
    for (let i = 0; i < data.length; i++) {
      // Check that formElem is found in form
      const foundElem = sysSettingsForm.form.formElems.find(
        (elem) => elem.elemId === data[i].elemId
      );
      if (!foundElem) {
        error = {
          errorId: 'elemNotFoundInForm',
          status: 400,
          message: `System Setting elemId '${data[i].elemId}' was not found in System Settings form. No data was saved.`,
        };
        break;
      }

      let existingItem = null;
      if (existingData) {
        existingItem = existingData.find((d) => d.simpleId === data[i].elemId);
      }
      const formElem = sysSettingsForm.form.formElems.find(
        (elem) => elem.elemId === data[i].elemId
      );
      bulkWrite.push({
        updateOne: {
          filter: { simpleId: data[i].elemId },
          upsert: true,
          update: {
            $set: {
              ...(existingItem
                ? {
                    edited: createNewEditedArray(
                      existingItem.edited || [],
                      userData?.userId,
                      existingItem.editedHistoryCount
                    ),
                  }
                : { edited: [] }),
              value: data[i].value,
              category: formElem?.elemData?.category,
              systemDocument: true,
            },
          },
        },
      });
    }

    // BulkWrite the data
    if (!Object.keys(error).length) {
      const updateResult = await DBSystemSettingModel.collection.bulkWrite(bulkWrite);
      const updateCount = updateResult.modifiedCount + updateResult.upsertedCount;
      if (updateCount !== data.length) {
        error = {
          errorId: 'sysSettingsUpdateCount',
          status: 200,
          message: `systemSettingsPutRoute tried to modify ${data.length} system settings but was able to update ${updateCount} system settings.`,
        };
      } else {
        ok = true;
      }
    }
  }

  let getSettingsData = {};
  if (getData) {
    getSettingsData = await getSystemSettings({ ...getData });
  }
  if ('code' in getSettingsData) getSettingsData = {};

  return res.send({
    ok,
    ...getSettingsData,
    ...(error && Object.keys(error).length ? { error } : {}),
  });
};

export const getSystemSettings = async (props: {
  settingId?: string | string[];
  category?: string | string[];
  getForm?: boolean;
}) => {
  const { settingId, category, getForm } = props;

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
  const settings = await DBSystemSettingModel.find<DBSystemSetting>(search).populate({
    path: 'edited.user',
    select: 'simpleId',
  });

  // Map data to form
  const returnData = [];
  let index = 0;
  if (sysSettingsForm.form.formElems) {
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
      const edited = setting?.edited
        ? setting.edited.map((edit) => {
            if (edit.user?._id && 'simpleId' in edit.user) {
              return {
                user: { _id: edit.user._id.toString(), simpleId: edit.user.simpleId },
                date: edit.date,
              };
            }
            return { user: edit.user ? edit.user.toString() : null, date: edit.date };
          })
        : [];
      returnData.push({
        elemId: elem.elemId,
        value,
        valueType: elem.valueType,
        category: setting?.category || String(elem.elemData?.category),
        edited,
        orderNr: index,
      });
      index++;
    }
  }

  return { data: returnData, ...(getForm ? { form: sysSettingsForm.form } : {}) };
};
