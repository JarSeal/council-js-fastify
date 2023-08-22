import { createUrlToken, decodeUrlToken, verifyUrlToken } from './token';
import type { CompleteTokenContents } from './token';

describe('token utils', () => {
  it('should create a valid URL token, verify it, and decode it', async () => {
    let token = await createUrlToken({ myKey: 'myPayload3' });
    token = String(token);
    const verification = await verifyUrlToken(token);
    const verificationComplete = (await verifyUrlToken(token, {
      complete: true,
    })) as CompleteTokenContents;
    const decodedPayload = decodeUrlToken(token);

    expect(
      token.startsWith(
        'eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJteUtleSI6Im15UGF5bG9hZDMiLCJhdWQiOiJDb3VuY2lsLUZhc3RpZnkgdXNlcnMiLCJpc3MiOiJDb3VuY2lsLUZhc3RpZnkiLCJzdWIiOiJT'
      )
    ).toBeTruthy();

    expect(verification.myKey).toBe('myPayload3');
    expect(verification.aud).toBe('Council-Fastify users');
    expect(verification.iss).toBe('Council-Fastify');
    expect(verification.sub).toBe('Signed Council-Fastify URL token');
    expect(typeof verification.iat).toBe('number');

    expect(verificationComplete.payload.myKey).toBe('myPayload3');
    expect(verificationComplete.payload.aud).toBe('Council-Fastify users');
    expect(verificationComplete.payload.iss).toBe('Council-Fastify');
    expect(verificationComplete.payload.sub).toBe('Signed Council-Fastify URL token');
    expect(typeof verificationComplete.payload.iat).toBe('number');
    expect(typeof verificationComplete.signature).toBe('string');

    expect(decodedPayload.myKey).toBe('myPayload3');
    expect(decodedPayload.aud).toBe('Council-Fastify users');
    expect(decodedPayload.iss).toBe('Council-Fastify');
    expect(decodedPayload.sub).toBe('Signed Council-Fastify URL token');
    expect(typeof decodedPayload.iat).toBe('number');
  });
});
