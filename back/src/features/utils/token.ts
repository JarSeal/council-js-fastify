import { hash } from 'bcrypt';

import { SECRET } from '../../core/config';

const DEFAULT_TOKEN_LIFE = 21600; // 6 hours (in seconds)
export const createUserToken = async (
  username: string,
  passwordHash: string,
  life?: number
): Promise<string> => {
  const partialHash = passwordHash.slice(-8);
  const hashToken = await hash(`${username}__email0__${SECRET}__${partialHash}`, 5);
  const tokenLife =
    Math.floor(Date.now() / 1000) + (life !== undefined ? life : DEFAULT_TOKEN_LIFE); // in seconds
  return `${tokenLife}__${hashToken}`;
};
