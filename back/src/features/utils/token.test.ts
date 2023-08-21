import { hash } from 'bcrypt';

import { getTimestamp } from './timeAndDate';
import {
  DEFAULT_TOKEN_LIFE,
  TOKEN_LIFE_SEPARATOR,
  createTokenIdFromArray,
  createToken,
  validateToken,
} from './token';
import { getConfig } from '../../core/config';

describe('token utils', () => {
  const tokenId = createTokenIdFromArray(['myusername', 'a@a.com']);
  const saltRounds = getConfig<number>('user.hashSaltRounds', 10);

  it('should create a valid token with 0 life and validate it', async () => {
    const token = await createToken(tokenId, 0);
    const splitToken = token.split(TOKEN_LIFE_SEPARATOR);
    const time = Number(splitToken[0]);
    const tokenHash = splitToken[1];
    expect(time).toBe(0);
    expect(tokenHash).toHaveLength(60);

    const validation1 = await validateToken(tokenId, token);
    const validation2 = await validateToken(tokenId, `0${TOKEN_LIFE_SEPARATOR}notARealToken`);
    const validation3 = await validateToken(tokenId, `${getTimestamp()}_notARealToken`);
    const validation4 = await validateToken(tokenId, 'notARealToken');
    const validation5 = await validateToken(tokenId, TOKEN_LIFE_SEPARATOR);
    expect(validation1).toBeTruthy();
    expect(validation2).toBeFalsy();
    expect(validation3).toBeFalsy();
    expect(validation4).toBeFalsy();
    expect(validation5).toBeFalsy();
  });

  it('should create a valid token with default token life and validate it', async () => {
    const dateNow = getTimestamp();
    const token = await createToken(tokenId);
    const splitToken = token.split(TOKEN_LIFE_SEPARATOR);
    const time = Number(splitToken[0]);
    const tokenHash = splitToken[1];
    expect(time).toBeGreaterThan(dateNow + DEFAULT_TOKEN_LIFE - 2);
    expect(time).toBeLessThan(dateNow + DEFAULT_TOKEN_LIFE + 2);
    expect(tokenHash).toHaveLength(60);

    const validation1 = await validateToken(tokenId, token);
    const validation2 = await validateToken(tokenId, `0${TOKEN_LIFE_SEPARATOR}notARealToken`);
    const validation3 = await validateToken(tokenId, `${getTimestamp()}_notARealToken`);
    const validation4 = await validateToken(
      tokenId,
      `0${TOKEN_LIFE_SEPARATOR}${await hash('notARealToken', saltRounds)}`
    );
    const validation5 = await validateToken(
      tokenId,
      `0${TOKEN_LIFE_SEPARATOR}0${TOKEN_LIFE_SEPARATOR}0`
    );
    expect(validation1).toBeTruthy();
    expect(validation2).toBeFalsy();
    expect(validation3).toBeFalsy();
    expect(validation4).toBeFalsy();
    expect(validation5).toBeFalsy();
  });

  it('should create a valid token with custom token life and validate it', async () => {
    const life = 180;
    const dateNow = getTimestamp();
    const token = await createToken(tokenId, life);
    const splitToken = token.split(TOKEN_LIFE_SEPARATOR);
    const time = Number(splitToken[0]);
    const tokenHash = splitToken[1];
    expect(time).toBeGreaterThan(dateNow + life - 2);
    expect(time).toBeLessThan(dateNow + life + 2);
    expect(tokenHash).toHaveLength(60);

    const validation1 = await validateToken(tokenId, token);
    const validation2 = await validateToken(tokenId, `0${TOKEN_LIFE_SEPARATOR}notARealToken`);
    const validation3 = await validateToken(tokenId, `${dateNow}_notARealToken`);
    const validation4 = await validateToken(tokenId, '');
    expect(validation1).toBeTruthy();
    expect(validation2).toBeFalsy();
    expect(validation3).toBeFalsy();
    expect(validation4).toBeFalsy();
  });

  it('should create a valid token and fail to validate an expired token', async () => {
    const life = -180; // Token expiration time is in the past
    const token = await createToken(tokenId, life);
    const validation = await validateToken(tokenId, token);
    expect(validation).toBeFalsy();
  });
});
