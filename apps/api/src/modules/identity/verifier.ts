import { z } from 'zod';
import { AppError } from '../../errors.js';
import type { ExternalIdentityVerifier, ExternalPrincipal } from './types.js';

const SupabaseUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email().nullable().optional(),
  email_confirmed_at: z.string().datetime({ offset: true }).nullable().optional(),
  phone: z.string().nullable().optional(),
  phone_confirmed_at: z.string().datetime({ offset: true }).nullable().optional(),
});

const JwtClaimsSchema = z.object({
  sub: z.string().min(1),
  session_id: z.string().min(1),
  exp: z.number().int().positive(),
});

function parseJwtClaims(accessToken: string): z.infer<typeof JwtClaimsSchema> {
  const parts = accessToken.split('.');
  if (parts.length !== 3 || !parts[1]) {
    throw new AppError('AUTHENTICATION_INVALID', 'The access token is invalid.', 401);
  }

  try {
    const decoded: unknown = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return JwtClaimsSchema.parse(decoded);
  } catch {
    throw new AppError('AUTHENTICATION_INVALID', 'The access token is invalid.', 401);
  }
}

export class DisabledIdentityVerifier implements ExternalIdentityVerifier {
  public async verify(_accessToken: string): Promise<ExternalPrincipal> {
    throw new AppError(
      'AUTHENTICATION_NOT_CONFIGURED',
      'Authentication is not configured for this environment.',
      503,
      true,
    );
  }
}

export class SupabaseIdentityVerifier implements ExternalIdentityVerifier {
  public constructor(
    private readonly supabaseUrl: string,
    private readonly publishableKey: string,
    private readonly timeoutMs: number,
    private readonly request: typeof fetch = fetch,
  ) {}

  public async verify(accessToken: string): Promise<ExternalPrincipal> {
    const claims = parseJwtClaims(accessToken);
    const expiresAt = new Date(claims.exp * 1_000);
    if (expiresAt.getTime() <= Date.now()) {
      throw new AppError('AUTHENTICATION_INVALID', 'The access token has expired.', 401);
    }

    let response: Response;
    try {
      response = await this.request(`${this.supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
        method: 'GET',
        headers: {
          apikey: this.publishableKey,
          authorization: `Bearer ${accessToken}`,
        },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch {
      throw new AppError(
        'AUTHENTICATION_UNAVAILABLE',
        'Authentication is temporarily unavailable.',
        503,
        true,
      );
    }

    if (!response.ok) {
      throw new AppError('AUTHENTICATION_INVALID', 'The access token is invalid.', 401);
    }

    const parsedUser = SupabaseUserSchema.safeParse(await response.json());
    if (!parsedUser.success || parsedUser.data.id !== claims.sub) {
      throw new AppError('AUTHENTICATION_INVALID', 'The access token is invalid.', 401);
    }

    return {
      provider: 'SUPABASE',
      subject: parsedUser.data.id,
      email: parsedUser.data.email?.trim().toLocaleLowerCase('en-US') ?? null,
      emailVerifiedAt: parsedUser.data.email_confirmed_at
        ? new Date(parsedUser.data.email_confirmed_at)
        : null,
      phone: parsedUser.data.phone?.trim() ?? null,
      phoneVerifiedAt: parsedUser.data.phone_confirmed_at
        ? new Date(parsedUser.data.phone_confirmed_at)
        : null,
      providerSessionId: claims.session_id,
      expiresAt,
    };
  }
}
