const groupCount = 10;
const groupIdBase = 'testgroup';
const createGroupId = (i) => `${groupIdBase}${i}`;

const userCount = 100;
const usernameBase = 'testuser';
const password = 'password';
const createUsername = (i) => `${usernameBase}${i}`;
const createEmail = (i) => `${createUsername(i)}@council.fastify`;

module.exports = {
  groupCount,
  groupIdBase,
  createGroupId,
  userCount,
  usernameBase,
  password,
  createUsername,
  createEmail,
};
