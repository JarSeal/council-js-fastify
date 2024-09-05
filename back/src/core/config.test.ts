import mongoose from 'mongoose';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { createSysDocuments } from '../test/utils';
import { closeDB, initDB } from './db';
import {
  decryptData,
  encryptData,
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
    expect(formElems[0].elemId).toBe('forceEmailVerification');
    expect(formElems[1].elemId).toBe('use2FA');
    expect(formElems[5].elemId).toBe('useEmail');
  });

  it('getPublicSysSettings', async () => {
    const publicSettings = await getPublicSysSettings();
    expect(publicSettings).toStrictEqual({
      forgotPassIdMethod: 'USERNAME_ONLY',
      use2FA: 'DISABLED',
      loginMethod: 'USERNAME_ONLY',
    });
  });

  it('encryption', () => {
    process.env.DB_SECRETS_KEY = 'secretKey';
    process.env.DB_SECRETS_IV = 'secretIV';

    const msg1 = 'Some secret message';
    const encryptedMsg1 = encryptData(msg1);
    const decryptedMsg1 = decryptData(encryptedMsg1);
    expect(encryptedMsg1).toBe(
      'ODY1YzA0MmE4ZWM0YTc4ZGUwNzUwZmFiYjM3ZGIxN2I0ODkzNDU3YWEzZDFhODFkYzBhMDg5Y2FlNzk4YjNlYg=='
    );
    expect(decryptedMsg1).toBe(msg1);

    const msg2 = '';
    const encryptedMsg2 = encryptData(msg2);
    const decryptedMsg2 = decryptData(encryptedMsg2);
    expect(encryptedMsg2).toBe('OWNhNmU2MzY0YjA0MTllZDI5MGQwZjRkYmY3ZTgxNTg=');
    expect(decryptedMsg2).toBe(msg2);
  });
});
