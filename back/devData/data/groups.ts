/* eslint-disable no-console */
import mongoose from 'mongoose';
import { groupCount, createGroupId } from './_config';
import DBGroupModel, { type DBGroup } from '../../src/dbModels/group';

export const removeGroups = async () => {
  console.log('\nGROUPS:');
  console.log('Check and remove groups...');
  const simpleIds: string[] = [];
  for (let i = 0; i < groupCount; i++) {
    simpleIds.push(createGroupId(i));
  }
  // Delete all users
  const result = await DBGroupModel.deleteMany({ simpleId: { $in: simpleIds } });
  console.log(`Removed ${result.deletedCount || 0} groups.`);
};

const getGroupObj = ({ i, dateNow }: { i: number; dateNow: Date }) => ({
  simpleId: createGroupId(i),
  name: `Test group ${createGroupId(i)}`,
  description: 'Only for testing purposes.',
  created: { user: new mongoose.Types.ObjectId(), date: dateNow },
  edited: [],
  systemDocument: false,
  owner: new mongoose.Types.ObjectId(),
  members: [],
});

export const createGroups = async () => {
  await removeGroups();
  console.log('Create groups...');
  const groups: Partial<DBGroup>[] = [];
  const dateNow = new Date();
  for (let i = 0; i < groupCount; i++) {
    groups.push(getGroupObj({ i, dateNow }));
  }

  await DBGroupModel.insertMany(groups);

  console.log(`Created ${groupCount} seed data groups.`);
  console.log(
    '- Group IDs: ' +
      createGroupId(0) +
      (groupCount > 1 ? ' - ' + createGroupId(groupCount - 1) : '')
  );
};
