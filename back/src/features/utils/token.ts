/* eslint-disable @typescript-eslint/require-await */
import { createDecoder, createSigner, createVerifier } from 'fast-jwt';
import type {
  DecoderOptions,
  KeyFetcher,
  SignerOptions,
  TokenError,
  VerifierOptions,
} from 'fast-jwt';
import crypto from 'crypto';

import { URL_TOKEN_SECRET } from '../../core/config';

const ALGORITHM = 'HS512';
const ISSUER = 'Council-Fastify';
const AUDIENCE = 'Council-Fastify users';
const SUBJECT_URL_TOKEN = 'Signed Council-Fastify URL token';

// CREATE URL ID TOKEN
// @TODO: create a test for this
export const createUrlIdToken = async (
  tokenType: string
): Promise<{ tokenId: string | null; token: string | null; error?: TokenError | null }> => {
  const tokenId = crypto.randomUUID();
  const token = await createUrlToken({ tokenType, tokenId });
  if (typeof token !== 'string') {
    return { tokenId: null, token: null, error: token };
  }
  return { tokenId, token };
};

// CREATE URL TOKEN
export const createUrlToken = async (
  payload: { [k: string]: unknown },
  opts?: Partial<
    SignerOptions & {
      key: KeyFetcher;
      keyString: string;
    }
  >
): Promise<string | TokenError> => {
  if (opts?.keyString) {
    const key = opts.keyString;
    delete opts.keyString;
    opts.key = async () => key;
  }
  const urlTokenSigner = createSigner({
    key: async () => URL_TOKEN_SECRET,
    algorithm: ALGORITHM,
    aud: AUDIENCE,
    iss: ISSUER,
    sub: SUBJECT_URL_TOKEN,
    ...opts,
  });
  try {
    const token = await urlTokenSigner(payload);
    return token;
  } catch (err) {
    const error = err as TokenError;
    return error;
  }
};

export type CompleteTokenContents = {
  header: { alg: string; typ: string };
  payload: { [k: string]: unknown };
  signature: string;
};

// VERIFY URL TOKEN
export const verifyUrlToken = async (
  token: string,
  opts?: Partial<
    VerifierOptions & {
      key: KeyFetcher;
      keyString: string;
    }
  >
): Promise<{ [k: string]: unknown } | TokenError> => {
  const urlTokenVerifier = createVerifier({
    key: (async () => URL_TOKEN_SECRET) as KeyFetcher,
    allowedIss: ISSUER,
    allowedAud: AUDIENCE,
    allowedSub: SUBJECT_URL_TOKEN,
    ...opts,
  });
  try {
    const payload = (await urlTokenVerifier(token)) as { [k: string]: unknown };
    return payload;
  } catch (err) {
    const error = err as TokenError;
    return error;
  }
};

// DECODE URL TOKEN
export const decodeUrlToken = (
  token: string,
  opts?: Partial<DecoderOptions>
): { [k: string]: unknown } | TokenError => {
  const urlTokenDecoder = createDecoder(opts);
  try {
    const payloadOrSections = urlTokenDecoder(token) as { [k: string]: unknown };
    return payloadOrSections;
  } catch (err) {
    const error = err as TokenError;
    return error;
  }
};
