import mongoose from 'mongoose';

import { createSysDocuments } from '../test/utils';
import { closeDB, initDB } from './db';
import { getSysSetting, setCachedSysSettings } from './config';
import DBSystemSettingModel from '../dbModels/systemSetting';

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
      simpleId: 'defaultEditedHistoryCount',
      value: 4,
      category: 'logs',
      systemDocument: true,
    });
    await newSetting.save();

    const setting4 = await getSysSetting<boolean>('defaultEditedHistoryCount');
    expect(setting4).toBe(10);

    await setCachedSysSettings();

    const setting5 = await getSysSetting<boolean>('defaultEditedHistoryCount');
    expect(setting5).toBe(4);
  });
});
