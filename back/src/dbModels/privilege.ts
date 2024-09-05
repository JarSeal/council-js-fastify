import { Schema, type Types, model } from 'mongoose';

import {
  simpleIdDBSchema,
  dateDBSchema,
  basicPrivilegePropsSchema,
  allPrivilegePropsSchema,
} from './_schemaPartials.js';
import type { AllPrivilegeProps, Edited } from './_modelTypePartials.js';

export interface DBPrivilege {
  // Mongo Id
  _id?: Types.ObjectId;
  id?: Types.ObjectId;

  // Council Id
  simpleId: string;

  // First part of simpleId (eg. 'form')
  priCategoryId: string;

  // Second part of simpleId (eg. 'publicSignUp', in this case the formId)
  priTargetId: string;

  // Third part of simpleId (eg. 'canUseForm')
  priAccessId: string;

  // Metadata and logs
  name: string;
  description: string;
  created: Date;
  edited: Edited[];
  editedHistoryCount?: number;
  systemDocument?: boolean;

  // Who can view this privilege doc in the system (admin stuff)
  privilegeViewAccess: Omit<AllPrivilegeProps, 'public' | 'requireCsrfHeader'>;

  // Who can edit this privilege doc in the system (admin stuff)
  privilegeEditAccess: Omit<AllPrivilegeProps, 'public' | 'requireCsrfHeader'>;

  // The actual privilege data
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
  editedHistoryCount: { type: Number },
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
