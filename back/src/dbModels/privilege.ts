import { Schema, model } from 'mongoose';

import { simpleIdDBSchema, dateDBSchema } from './_schemaPartials';
import type { Edited } from './_modelTypePartials';

export interface DBPrivilege {
  id?: string;
  simpleId: string;
  priGroupId: string;
  priOwnerId: string;
  priAccessId: string;
  name: string;
  description: string;
  created: Date;
  edited: Edited;
  systemDocument?: boolean;
}

const privilegeSchema = new Schema<DBPrivilege>({
  simpleId: simpleIdDBSchema,
  priGroupId: { type: String, required: true },
  priOwnerId: { type: String, required: true },
  priAccessId: { type: String, required: true },
  name: { type: String, required: true },
  description: String,
  created: dateDBSchema,
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
