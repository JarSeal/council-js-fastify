import { type DBGroup } from '../../src/dbModels/group';

// GROUPS:
const timeNow = new Date();

const systemGroups: DBGroup[] = [
  {
    simpleId: 'sysAdmins',
    name: 'System Administrators',
    description:
      'Highest level of access for Council. Be careful about which users become members of this group. Only 1-4 members should be in this group.',
    created: {
      user: null,
      date: timeNow,
    },
    edited: [],
    systemDocument: true,
    owner: null,
    members: [],
  },
  {
    simpleId: 'basicUsers',
    name: 'Basic Users',
    description:
      'Lowest level for signed in users. All public sign ups should become part of this group.',
    created: {
      user: null,
      date: timeNow,
    },
    edited: [],
    systemDocument: true,
    owner: null,
    members: [],
  },
];

export default systemGroups;
