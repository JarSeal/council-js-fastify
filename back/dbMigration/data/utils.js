const { hash } = require('bcrypt');
const { config } = require('dotenv');

config({ path: '../.env' });

const defaultUsername = 'superadmin';
const defaultEmail = defaultUsername + '@council.fastify';
const defaultPassword = 'changepassword';
const saltRounds = Number(process.env.SALT_ROUNDS || 10);

const getSuperAdminUsername = () => process.env.SUPER_ADMIN_USERNAME || defaultUsername;
const getSuperAdminEmail = () => process.env.SUPER_ADMIN_EMAIL || defaultEmail;
const getSuperAdminPassword = async () =>
  await hash(process.env.SUPER_ADMIN_PASSWORD || defaultPassword, saltRounds);

module.exports = {
  getSuperAdminUsername,
  getSuperAdminEmail,
  getSuperAdminPassword,
};
