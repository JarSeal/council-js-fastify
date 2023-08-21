import { hash, compare, hashSync } from 'bcrypt';

import { SECRET, TOKEN_SECRET, getConfig } from '../../core/config';
import { getTimestamp } from './timeAndDate';
import { convertStringTo24Bytes } from './helpers';

export const DEFAULT_TOKEN_LIFE = 21600; // 6 hours (in seconds)
export const TOKEN_LIFE_SEPARATOR = '__';

// All 3 parts are 24 bytes each, so total 72 bytes
const getHashableTokenString = (tokenId: string) => `${TOKEN_SECRET}${tokenId}${SECRET}`;

export const createTokenIdFromArray = (tokenIdStrings: string[]): string => {
  const idString = tokenIdStrings.join('');
  const saltRounds = getConfig<number>('user.hashSaltRounds', 10);
  const idHash = convertStringTo24Bytes(hashSync(idString, saltRounds).substring(29, 53));
  return idHash;
};

export const createToken = async (
  tokenIdOrStringsArray: string | string[],
  life?: number
): Promise<string> => {
  const tokenId = Array.isArray(tokenIdOrStringsArray)
    ? createTokenIdFromArray(tokenIdOrStringsArray)
    : createTokenIdFromArray([tokenIdOrStringsArray]);
  const saltRounds = getConfig<number>('user.hashSaltRounds', 10);
  const hashToken = await hash(getHashableTokenString(tokenId), saltRounds);
  // in seconds, if life is 0 then the token has infinite lifetime
  const tokenLife = life === 0 ? 0 : getTimestamp() + (life || DEFAULT_TOKEN_LIFE);
  return `${tokenLife}${TOKEN_LIFE_SEPARATOR}${hashToken}`;
};

export const validateToken = async (tokenId: string, token: string): Promise<boolean> => {
  // TODO: fix this!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  const splitToken = token.split(TOKEN_LIFE_SEPARATOR);
  if (splitToken.length !== 2) {
    return false;
  }
  const expires = Number(splitToken[0]);
  if (expires === 0) {
    // Infinite lifetime token
    const isTheSameHash = await compare(getHashableTokenString(tokenId), splitToken[1]);
    return isTheSameHash;
  }
  // Expirable token
  if (expires < getTimestamp()) {
    // Token has expired
    return false;
  }
  const isTheSameHash = await compare(getHashableTokenString(tokenId), splitToken[1]);
  return isTheSameHash;
};
