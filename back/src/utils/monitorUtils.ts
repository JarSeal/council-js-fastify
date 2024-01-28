import { errors } from '../core/errors';
import type { DBMonitor } from '../dbModels/monitor';
import DBMonitorModel from '../dbModels/monitor';

export interface DBMonitorCounter extends DBMonitor {
  data: {
    counter: number;
    updatedAt: Date;
  };
}

export const addMonitorCount = async (simpleId: string) => {
  const monitorDB = await DBMonitorModel.findOne<DBMonitorCounter>({ simpleId });

  if (monitorDB?.data?.counter) {
    // Update counter
    const curCounter =
      monitorDB.data.counter + 1 > Number.MAX_SAFE_INTEGER ? 0 : monitorDB.data.counter;
    const updatedMonitor = await DBMonitorModel.findOneAndUpdate<DBMonitorCounter>(
      { simpleId },
      { data: { counter: curCounter + 1, updatedAt: new Date() } }
    );
    if (!updatedMonitor) {
      const updateMonitorError = new errors.DB_UPDATE_MONITOR(
        `Could not update counter for monitor '${simpleId}'`
      );
      return updateMonitorError;
    }
  } else {
    // Create the document
    const dbCheck = new DBMonitorModel<DBMonitorCounter>({
      simpleId,
      data: { counter: 1, updatedAt: new Date() },
    });
    const createdMonitor = await dbCheck.save();
    if (!createdMonitor) {
      const createMonitorError = new errors.DB_CREATE_MONITOR(
        `Could not create counter for monitor '${simpleId}'`
      );
      return createMonitorError;
    }
  }
};
