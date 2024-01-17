import { Schema, type Types, model } from 'mongoose';

import { simpleIdDBSchema, dateDBSchema } from './_schemaPartials';
import type { Edited } from './_modelTypePartials';

export interface DBSystemSetting {
  // Mongo Id
  _id?: Types.ObjectId;
  id?: Types.ObjectId;

  // Council Id
  simpleId: string;

  // Setting value
  value: string;

  // Setting category
  category: string;

  // Edited history
  edited: Edited;

  // Edited history count
  editedHistoryCount: number;

  systemDocument: boolean;
}

const systemSettingSchema = new Schema<DBSystemSetting>({
  simpleId: simpleIdDBSchema,
  value: { type: String },
  category: { type: String },
  edited: [
    {
      _id: false,
      user: {
        type: Schema.Types.ObjectId,
      },
      date: dateDBSchema,
    },
  ],
  editedHistoryCount: { type: Number },
  systemDocument: { type: Boolean, default: false },
});

systemSettingSchema.set('toJSON', {
  transform: (_, returnedObject) => {
    returnedObject.id = String(returnedObject._id);
    delete returnedObject._id;
    delete returnedObject.__v;
  },
});

const DBSystemSettingModel = model<DBSystemSetting>(
  'SystemSetting',
  systemSettingSchema,
  'systemSettings'
);

export default DBSystemSettingModel;
