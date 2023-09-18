import mongoose from 'mongoose';

import { simpleIdDBSchema } from './_schemaPartials';

export interface DBMonitor {
  simpleId: string;
  systemDocument?: boolean;
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
