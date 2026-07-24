import {
  createPrivateKey,
  generateKeyPairSync,
  sign,
  type KeyObject,
} from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  BearerAuthenticationService,
  SupabaseJwtVerifier,
  type AccountResolver,
  type ArenaSportsAccount,
  type VerificationJwk,
} from '../src/modules/identity/authentication.js';

const nowSeconds = 1_800_000_000;
const issuer = 'https://project.supabase.co/auth/v1';
const audience = 'authenticated';
const keyId = 'test-key';
const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const publicJwk = {
  ...publicKey.export({ format: 'jwk' }),
  alg: 'ES256',
  kid: keyId,
  use: 'sig',
} as VerificationJwk;

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function createToken(
  claims: Record<string, unknown> = {},
  header: Record<string, unknown> = {},
  signingKey: KeyObject = privateKey,
): string {
  const encodedHeader = encode({ alg: 'ES256', kid: keyId, typ: 'JWT', ...header });
  const encodedClaims = encode({
    iss: issuer,
    aud: audience,
    sub: 'provider-user-1',
    iat: nowSeconds - 60,
    exp: nowSeconds + 300,
    session_id: 'provider-session-1',
    aal: 'aal1',
    email_confirmed_at: '2027-01-15T08:00:00.000Z',
    ...claims,
  });
  const signature = sign('sha256', Buffer.from(`${encodedHeader}.${encodedClaims}`, 'ascii'), {
    key: signingKey,
    dsaEncoding: 'ieee-p1363',
  });
  return `${encodedHeader}.${encodedClaims}.${signature.toString('base64url')}`;
}

function createVerifier(keys: readonly VerificationJwk[] = [publicJwk]) {
  return new SupabaseJwtVerifier(
    {
      issuer,
      audiences: [audience],
      jwksUrl: 'https://project.supabase.co/auth/v1/.well-known/jwks.json',
    },
    async () => keys,
    () => nowSeconds * 1_000,
  );
}

function accountResolver(account: ArenaSportsAccount | null): AccountResolver {
  return { findByProviderSubject: async () => account };
}

describe('SupabaseJwtVerifier', () => {
  it('returns only the validated provider subject boundary', async () => {
    const subject = await createVerifier().verifyAccessToken(createToken());

    expect(subject).toEqual({
      provider: 'SUPABASE',
      subject: 'provider-user-1',
      providerSessionId: 'provider-session-1',
      assuranceLevel: 'aal1',
      emailVerified: true,
      phoneVerified: false,
      issuedAt: new Date((nowSeconds - 60) * 1_000),
      expiresAt: new Date((nowSeconds + 300) * 1_000),
    });
    expect(subject).not.toHaveProperty('roles');
  });

  it.each([
    ['expired token', { exp: nowSeconds - 31 }, {}],
    ['future token', { nbf: nowSeconds + 31 }, {}],
    ['wrong issuer', { iss: 'https://attacker.example/auth/v1' }, {}],
    ['wrong audience', { aud: 'service_role' }, {}],
    ['unknown signing key', {}, { kid: 'unknown-key' }],
    ['unsupported algorithm', {}, { alg: 'none' }],
  ])('rejects %s', async (_name, claims, header) => {
    await expect(createVerifier().verifyAccessToken(createToken(claims, header))).rejects.toThrow(
      'Access token validation failed.',
    );
  });

  it('rejects a valid-looking token signed by another key', async () => {
    const attacker = generateKeyPairSync('ec', { namedCurve: 'P-256' });
    await expect(
      createVerifier().verifyAccessToken(createToken({}, {}, attacker.privateKey)),
    ).rejects.toThrow('Access token validation failed.');
  });
});

describe('BearerAuthenticationService', () => {
  const activeAccount: ArenaSportsAccount = {
    id: 'user-1',
    status: 'ACTIVE',
    roles: ['PLAYER'],
  };

  it('rejects missing and malformed bearer headers with a stable safe error', async () => {
    const service = new BearerAuthenticationService(
      createVerifier(),
      accountResolver(activeAccount),
    );

    await expect(service.authenticate(undefined)).rejects.toMatchObject({
      code: 'AUTHENTICATION_REQUIRED',
      statusCode: 401,
    });
    await expect(service.authenticate('Basic abc')).rejects.toMatchObject({
      code: 'AUTHENTICATION_REQUIRED',
      statusCode: 401,
    });
  });

  it.each(['SUSPENDED', 'DELETED'] as const)('denies a %s local account', async (status) => {
    const service = new BearerAuthenticationService(
      createVerifier(),
      accountResolver({ ...activeAccount, status }),
    );

    await expect(service.authenticate(`Bearer ${createToken()}`)).rejects.toMatchObject({
      code: 'FORBIDDEN',
      statusCode: 403,
      message: 'This account cannot access ArenaSports.',
    });
  });

  it('does not accept provider identity metadata as local authorization', async () => {
    const service = new BearerAuthenticationService(
      createVerifier(),
      accountResolver(activeAccount),
    );
    const principal = await service.authenticate(
      `Bearer ${createToken({ role: 'administrator' })}`,
    );

    expect(principal.account.roles).toEqual(['PLAYER']);
  });
});
