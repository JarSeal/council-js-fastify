import { type Types, Schema, model } from 'mongoose';

import { simpleIdDBSchema, dateDBSchema } from './_schemaPartials';
import type { Edited } from './_modelTypePartials';

export interface DBPrivilege {
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
  members: {
    users: Types.ObjectId[];
    groups: Types.ObjectId[];
    excludeUsers: Types.ObjectId[];
    excludeGroups: Types.ObjectId[];
  };
}

const privilegeSchema = new Schema<DBPrivilege>({
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
  members: {
    users: [
      {
        _id: false,
        type: Schema.Types.ObjectId,
      },
    ],
    groups: [
      {
        _id: false,
        type: Schema.Types.ObjectId,
      },
    ],
    excludeUsers: [
      {
        _id: false,
        type: Schema.Types.ObjectId,
      },
    ],
    excludeGroups: [
      {
        _id: false,
        type: Schema.Types.ObjectId,
      },
    ],
  },
});

privilegeSchema.set('toJSON', {
  transform: (_, returnedObject) => {
    returnedObject.id = String(returnedObject._id);
    delete returnedObject._id;
    delete returnedObject.__v;
  },
});

const DBPrivilegeModel = model<DBPrivilege>('Privilege', privilegeSchema, 'privileges');

export default DBPrivilegeModel;
