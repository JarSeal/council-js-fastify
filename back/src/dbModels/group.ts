import { type Types, Schema, model } from 'mongoose';

import { simpleIdDBSchema, dateDBSchema, mongoIdArraySchema } from './_schemaPartials';
import type { Edited } from './_modelTypePartials';

export interface DBGroup {
  id?: string;
  simpleId: string;
  name: string;
  description: string;
  created: {
    user: Types.ObjectId | null;
    date: Date;
  };
  edited: Edited;
  systemDocument?: boolean;
  owner: Types.ObjectId;
  members: Types.ObjectId[];
}

const groupSchema = new Schema<DBGroup>({
  simpleId: simpleIdDBSchema,
  name: { type: String, required: true, default: null },
  description: String,
  created: {
    user: { type: Schema.Types.ObjectId, required: true, default: null },
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
