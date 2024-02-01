import mongoose from 'mongoose';

import { createSysDocuments } from '../test/utils';
import { closeDB, initDB } from './db';
import {
  getPublicSysSettings,
  getSysSetting,
  getSysSettingsForm,
  setCachedSysSettings,
} from './config';
import DBSystemSettingModel from '../dbModels/systemSetting';
import type { DBForm } from '../dbModels/form';

describe('config', () => {
  beforeAll(async () => {
    await initDB();
    await createSysDocuments();
  });

  afterAll(async () => {
    await mongoose.connection.db.dropDatabase();
    await closeDB();
  });

  it('getSysSetting', async () => {
    const setting1 = await getSysSetting<boolean>('forceEmailVerification');
    expect(setting1).toBe(false);

    const setting2 = await getSysSetting<boolean>('use2FA');
    expect(setting2).toBe('DISABLED');

    const setting3 = await getSysSetting<boolean>('not-existing');
    expect(setting3).toBe(undefined);

    const newSetting = new DBSystemSettingModel({
      simpleId: 'defaultEditedLogs',
      value: 4,
      category: 'logs',
      systemDocument: true,
    });
    await newSetting.save();

    const setting4 = await getSysSetting<boolean>('defaultEditedLogs');
    expect(setting4).toBe(10);

    await setCachedSysSettings();

    const setting5 = await getSysSetting<boolean>('defaultEditedLogs');
    expect(setting5).toBe(4);
  });

  it('getSysSettingsForm', async () => {
    const sysForm = (await getSysSettingsForm()) as DBForm;
    const formElems = sysForm.form.formElems;
    expect(formElems).toHaveLength(5);
  });

  it('getPublicSysSettings', async () => {
    const publicSettings = await getPublicSysSettings();
    expect(publicSettings).toStrictEqual({ use2FA: 'DISABLED', loginMethod: 'USERNAME_ONLY' });
  });
});
