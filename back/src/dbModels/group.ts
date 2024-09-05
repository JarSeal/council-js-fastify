import { type Types, Schema, model } from 'mongoose';

import { simpleIdDBSchema, dateDBSchema, mongoIdArraySchema } from './_schemaPartials.js';
import type { Edited } from './_modelTypePartials.js';

export interface DBGroup {
  // Mongo Id
  _id?: Types.ObjectId;
  id?: Types.ObjectId;

  // Council simpleId
  simpleId: string;

  // Group metadata and logs
  name: string;
  description: string;
  created: {
    user: Types.ObjectId | null;
    date: Date;
  };
  edited: Edited[];
  editedHistoryCount?: number;
  systemDocument?: boolean;
  owner: Types.ObjectId;

  // Group members' user Ids
  members: Types.ObjectId[];
}

const groupSchema = new Schema<DBGroup>({
  simpleId: simpleIdDBSchema,
  name: { type: String, default: null },
  description: { type: String, default: null },
  created: {
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    date: dateDBSchema,
  },
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
  owner: { type: Schema.Types.ObjectId, required: true },
  members: mongoIdArraySchema,
});

groupSchema.set('toJSON', {
  transform: (_, returnedObject) => {
    returnedObject.id = String(returnedObject._id);
    delete returnedObject._id;
    delete returnedObject.__v;
  },
});

const DBGroupModel = model<DBGroup>('Group', groupSchema, 'groups');

export default DBGroupModel;
