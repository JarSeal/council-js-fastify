import { Schema, type Types, model } from 'mongoose';

import {
  simpleIdDBSchema,
  dateDBSchema,
  allPrivilegePropsSchema,
  transTextDbSchema,
} from './_schemaPartials';
import type { AllPrivilegeProps, Edited, TransText } from './_modelTypePartials';

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

  // The component to represent this view / page
  componentId: string;

  // The layout / wrapper component for the view component
  layoutWrapperId?: string;

  // Route path
  path: string;

  name?: string;

  description?: string;

  privileges?: Partial<AllPrivilegeProps>;

  // View / page metadata information
  meta?: {
    title?: TransText;
    description?: TransText;
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
  componentId: { type: String, required: true },
  layoutWrapperId: { type: String },
  path: { type: String, required: true, unique: true },
  name: { type: String },
  description: { type: String },
  privileges: allPrivilegePropsSchema,
  meta: {
    title: transTextDbSchema,
    description: transTextDbSchema,
  },
});

clientRouteSchema.set('toJSON', {
  transform: (_, returnedObject) => {
    returnedObject.id = String(returnedObject._id);
    delete returnedObject._id;
    delete returnedObject.__v;
  },
});

const DBClientRouteModel = model<DBClientRoute>('ClientRoute', clientRouteSchema, 'clientRoutes');

export default DBClientRouteModel;
