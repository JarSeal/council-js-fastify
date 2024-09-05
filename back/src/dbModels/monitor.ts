import mongoose, { type Types } from 'mongoose';

import { simpleIdDBSchema } from './_schemaPartials.js';

export interface DBMonitor {
  // Mongo Id
  _id?: Types.ObjectId;
  id?: Types.ObjectId;

  // Council Id
  simpleId: string;

  // Whether the document is a system document or not
  systemDocument?: boolean;

  // Monitoring data
  data: object;
}

const monitorSchema = new mongoose.Schema<DBMonitor>({
  simpleId: simpleIdDBSchema,
  systemDocument: { type: Boolean, default: true },
  data: { type: Object, required: true },
});

monitorSchema.set('toJSON', {
  transform: (_, returnedObject) => {
    returnedObject.id = String(returnedObject._id);
    delete returnedObject._id;
    delete returnedObject.__v;
  },
});

const DBMonitorModel = mongoose.model<DBMonitor>('Monitor', monitorSchema, 'monitors');

export default DBMonitorModel;
