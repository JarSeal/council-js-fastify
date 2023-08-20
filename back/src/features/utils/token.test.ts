import { createUserToken } from './token';

describe('token utils', () => {
  it('should create a valid token with 0 life', async () => {
    const dateNow = Math.floor(Date.now() / 1000);
    const token = await createUserToken('myusername', 0);
    const splitToken = token.split('__');
    const time = Number(splitToken[0]);
    const hash = splitToken[1];
    expect(time).toBe(dateNow);
    expect(hash).toHaveLength(60);
  });
});
