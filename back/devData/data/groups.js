const { default: mongoose } = require('mongoose');
const { groupCount, createGroupId } = require('./_config');
const { default: DBGroupModel } = require('../../dist/back/src/dbModels/group');

const removeGroups = async () => {
  console.log('\nGROUPS:');
  console.log('Check and remove groups...');
  const simpleIds = [];
  for (let i = 0; i < groupCount; i++) {
    simpleIds.push(createGroupId(i));
  }
  // Delete all users
  const result = await DBGroupModel.deleteMany({ simpleId: { $in: simpleIds } });
  console.log(`Removed ${result.deletedCount || 0} groups.`);
};

const getGroupObj = ({ i, dateNow }) => ({
  simpleId: createGroupId(i),
  name: `Test group ${createGroupId(i)}`,
  description: 'Only for testing purposes.',
  created: { user: new mongoose.Types.ObjectId(), date: dateNow },
  edited: [],
  systemDocument: false,
  owner: new mongoose.Types.ObjectId(),
  members: [],
});

const createGroups = async () => {
  if (groupCount === 0) return;
  await removeGroups();
  console.log('Create groups...');
  const groups = [];
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

module.exports = { removeGroups, createGroups };
