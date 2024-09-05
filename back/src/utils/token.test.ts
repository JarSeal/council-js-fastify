import { describe, it, expect } from 'vitest';
import { createUrlToken, createUrlTokenAndId, decodeUrlToken, verifyUrlToken } from './token';
import type { CompleteTokenContents } from './token';

it('should create a valid URL token and tokenId', async () => {
  const { token, tokenId, error } = await createUrlTokenAndId('EMAIL_VERIFICATION');
  expect(
    token?.startsWith(
      'eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJ0b2tlblR5cGUiOiJFTUFJTF9WRVJJRklDQVRJT04iLCJ0b2tlbklkIjoi'
    )
  ).toBeTruthy();
  expect(tokenId).toHaveLength(36);
  expect(error).toBe(undefined);

  const verification = await verifyUrlToken(token);
  expect(verification.tokenId).toBe(tokenId);
  expect(verification.aud).toBe('Council-Fastify users');
  expect(verification.iss).toBe('Council-Fastify');
  expect(verification.sub).toBe('Signed Council-Fastify URL token');
});

describe('URL token utils', () => {
  it('should create a valid URL token, verify it, and decode it', async () => {
    const token = (await createUrlToken({ myKey: 'myPayload3' })) as string;
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
