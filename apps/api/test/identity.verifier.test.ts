import { describe, expect, it } from 'vitest';
import { SupabaseIdentityVerifier } from '../src/modules/identity/verifier.js';

function createAccessToken(
  claims: Record<string, unknown> = {
    sub: 'provider-user-1',
    session_id: 'provider-session-1',
    exp: Math.floor(Date.now() / 1_000) + 3_600,
  },
): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return `${header}.${payload}.test-signature`;
}

describe('SupabaseIdentityVerifier', () => {
  it('maps a remotely verified Supabase user without storing token material', async () => {
    const request: typeof fetch = async (input, init) => {
      expect(String(input)).toBe('https://project.supabase.co/auth/v1/user');
      expect(init?.headers).toMatchObject({
        apikey: 'public-key',
        authorization: expect.stringMatching(/^Bearer /),
      });
      return new Response(
        JSON.stringify({
          id: 'provider-user-1',
          email: ' Player@Example.com ',
          email_confirmed_at: '2026-07-26T00:00:00Z',
          phone: null,
          phone_confirmed_at: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    };

    const verifier = new SupabaseIdentityVerifier(
      'https://project.supabase.co/',
      'public-key',
      5_000,
      request,
    );
    const principal = await verifier.verify(createAccessToken());

    expect(principal).toMatchObject({
      provider: 'SUPABASE',
      subject: 'provider-user-1',
      email: 'player@example.com',
      providerSessionId: 'provider-session-1',
    });
    expect(principal.emailVerifiedAt?.toISOString()).toBe('2026-07-26T00:00:00.000Z');
  });

  it('rejects an expired token before contacting the provider', async () => {
    let requestCalled = false;
    const request: typeof fetch = async () => {
      requestCalled = true;
      return new Response('{}', { status: 200 });
    };
    const verifier = new SupabaseIdentityVerifier(
      'https://project.supabase.co',
      'public-key',
      5_000,
      request,
    );

    await expect(
      verifier.verify(
        createAccessToken({
          sub: 'provider-user-1',
          session_id: 'provider-session-1',
          exp: Math.floor(Date.now() / 1_000) - 60,
        }),
      ),
    ).rejects.toMatchObject({ code: 'AUTHENTICATION_INVALID', statusCode: 401 });
    expect(requestCalled).toBe(false);
  });

  it('rejects a provider response whose subject does not match the token', async () => {
    const request: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          id: 'different-provider-user',
          email: 'player@example.com',
          email_confirmed_at: '2026-07-26T00:00:00Z',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    const verifier = new SupabaseIdentityVerifier(
      'https://project.supabase.co',
      'public-key',
      5_000,
      request,
    );

    await expect(verifier.verify(createAccessToken())).rejects.toMatchObject({
      code: 'AUTHENTICATION_INVALID',
      statusCode: 401,
    });
  });

  it('returns a retryable safe error when the provider cannot be reached', async () => {
    const request: typeof fetch = async () => {
      throw new Error('private network failure');
    };
    const verifier = new SupabaseIdentityVerifier(
      'https://project.supabase.co',
      'public-key',
      5_000,
      request,
    );

    await expect(verifier.verify(createAccessToken())).rejects.toMatchObject({
      code: 'AUTHENTICATION_UNAVAILABLE',
      statusCode: 503,
      retryable: true,
      message: 'Authentication is temporarily unavailable.',
    });
  });
});
