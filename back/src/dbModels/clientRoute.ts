import { Schema, type Types, model } from 'mongoose';

import { simpleIdDBSchema, dateDBSchema, allPrivilegePropsSchema } from './_schemaPartials';
import type { AllPrivilegeProps, Edited } from './_modelTypePartials';

export interface DBClientRoute {
  // Mongo Id
  _id?: Types.ObjectId;
  id?: Types.ObjectId;

  // Council Id
  simpleId: string;

  // Edited history
  edited: Edited[];

  // Edited history count
  editedHistoryCount?: number;

  created: {
    user: Types.ObjectId | null;
    date: Date;
  };

  systemDocument: boolean;

  path: string;

  name?: string;

  description?: string;

  privileges?: Partial<AllPrivilegeProps>;

  componentId?: string;

  redirectUrl?: string;

  meta?: {
    title?: string;
    description?: string;
  };
}

const clientRouteSchema = new Schema<DBClientRoute>({
  simpleId: simpleIdDBSchema,
  edited: [
    {
      _id: false,
      user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      date: dateDBSchema,
    },
  ],
  editedHistoryCount: { type: Number },
  created: {
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    date: dateDBSchema,
  },
  systemDocument: { type: Boolean, default: false },
  path: { type: String, required: true },
  name: { type: String },
  description: { type: String },
  privileges: allPrivilegePropsSchema,
  componentId: { type: String },
  redirectUrl: { type: String },
  meta: {
    title: { type: String },
    description: { type: String },
  },
});

clientRouteSchema.set('toJSON', {
  transform: (_, returnedObject) => {
    returnedObject.id = String(returnedObject._id);
    delete returnedObject._id;
    delete returnedObject.__v;
  },
});

const DBSystemSettingModel = model<DBClientRoute>('ClientRoute', clientRouteSchema, 'clientRoutes');

export default DBSystemSettingModel;
