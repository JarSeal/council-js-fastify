import { Schema, model } from 'mongoose';

import {
  simpleIdDBSchema,
  dateDBSchema,
  basicPrivilegePropsSchema,
  allPrivilegePropsSchema,
} from './_schemaPartials';
import type { AllPrivilegeProps, Edited } from './_modelTypePartials';

export interface DBPrivilege {
  id?: string;
  simpleId: string;
  priCategoryId: string;
  priTargetId: string;
  priAccessId: string;
  name: string;
  description: string;
  created: Date;
  edited: Edited;
  systemDocument?: boolean;
  privilegeViewAccess: Omit<AllPrivilegeProps, 'public' | 'requireCsrfHeader'>;
  privilegeEditAccess: Omit<AllPrivilegeProps, 'public' | 'requireCsrfHeader'>;
  privilegeAccess: AllPrivilegeProps;
}

const privilegeSchema = new Schema<DBPrivilege>({
  simpleId: simpleIdDBSchema,
  priCategoryId: { type: String, required: true },
  priTargetId: { type: String, required: true },
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
  privilegeViewAccess: basicPrivilegePropsSchema,
  privilegeEditAccess: basicPrivilegePropsSchema,
  privilegeAccess: allPrivilegePropsSchema,
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
