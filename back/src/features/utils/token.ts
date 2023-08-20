import { hash } from 'bcrypt';

import { SECRET, TOKEN_SECRET } from '../../core/config';

const DEFAULT_TOKEN_LIFE = 21600; // 6 hours (in seconds)
export const createUserToken = async (username: string, life?: number): Promise<string> => {
  const hashToken = await hash(`${TOKEN_SECRET}${username}email0${SECRET}`, 10);
  const tokenLife =
    Math.floor(Date.now() / 1000) + (life !== undefined ? life : DEFAULT_TOKEN_LIFE); // in seconds
  return `${tokenLife}__${hashToken}`;
};
