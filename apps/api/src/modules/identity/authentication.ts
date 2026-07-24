import { createPublicKey, verify, type KeyObject } from 'node:crypto';
import { z } from 'zod';
import { AppError } from '../../errors.js';

const supportedAlgorithms = ['RS256', 'ES256', 'EdDSA'] as const;
type SupportedAlgorithm = (typeof supportedAlgorithms)[number];

const JwtHeaderSchema = z
  .object({
    alg: z.enum(supportedAlgorithms),
    kid: z.string().min(1).max(128),
    typ: z.string().max(32).optional(),
  })
  .passthrough();

const JwtClaimsSchema = z
  .object({
    iss: z.string().url(),
    aud: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]),
    sub: z.string().min(1).max(255),
    exp: z.number().int().positive(),
    nbf: z.number().int().nonnegative().optional(),
    iat: z.number().int().nonnegative().optional(),
    session_id: z.string().min(1).max(255).optional(),
    aal: z.string().min(1).max(32).optional(),
    email_confirmed_at: z.string().datetime({ offset: true }).optional(),
    phone_confirmed_at: z.string().datetime({ offset: true }).optional(),
  })
  .passthrough();

const JsonWebKeySchema = z
  .object({
    kid: z.string().min(1).max(128),
    kty: z.enum(['RSA', 'EC', 'OKP']),
    alg: z.string().optional(),
    use: z.string().optional(),
    key_ops: z.array(z.string()).optional(),
    crv: z.string().optional(),
  })
  .passthrough();

const JsonWebKeySetSchema = z.object({ keys: z.array(JsonWebKeySchema).max(20) });

export type VerificationJwk = z.input<typeof JsonWebKeySchema>;

export type JwtVerificationConfig = {
  issuer: string;
  audiences: readonly string[];
  jwksUrl: string;
  clockToleranceSeconds?: number;
};

export type AuthenticatedSubject = {
  provider: 'SUPABASE';
  subject: string;
  providerSessionId: string | null;
  assuranceLevel: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  issuedAt: Date | null;
  expiresAt: Date;
};

export interface AuthenticationProvider {
  verifyAccessToken(token: string): Promise<AuthenticatedSubject>;
}

export type ArenaSportsAccount = {
  id: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  roles: readonly ('PLAYER' | 'ORGANIZER' | 'MODERATOR' | 'ADMINISTRATOR')[];
};

export interface AccountResolver {
  findByProviderSubject(
    provider: AuthenticatedSubject['provider'],
    subject: string,
  ): Promise<ArenaSportsAccount | null>;
}

export type AuthenticatedPrincipal = {
  subject: AuthenticatedSubject;
  account: ArenaSportsAccount;
};

export type JwksLoader = () => Promise<readonly VerificationJwk[]>;

type Clock = () => number;

class InvalidAccessTokenError extends Error {
  public constructor() {
    super('Access token validation failed.');
    this.name = 'InvalidAccessTokenError';
  }
}

function invalidToken(): never {
  throw new InvalidAccessTokenError();
}

function decodeJsonSegment(segment: string): unknown {
  if (segment.length === 0 || segment.length > 16_384 || !/^[A-Za-z0-9_-]+$/.test(segment)) {
    return invalidToken();
  }

  try {
    return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8')) as unknown;
  } catch {
    return invalidToken();
  }
}

function keyMatchesAlgorithm(key: z.infer<typeof JsonWebKeySchema>, algorithm: SupportedAlgorithm) {
  if (key.alg !== undefined && key.alg !== algorithm) return false;
  if (key.use !== undefined && key.use !== 'sig') return false;
  if (key.key_ops !== undefined && !key.key_ops.includes('verify')) return false;

  if (algorithm === 'RS256') return key.kty === 'RSA';
  if (algorithm === 'ES256') return key.kty === 'EC' && key.crv === 'P-256';
  return key.kty === 'OKP' && key.crv === 'Ed25519';
}

function verifySignature(
  algorithm: SupportedAlgorithm,
  signingInput: Buffer,
  signature: Buffer,
  key: KeyObject,
): boolean {
  if (algorithm === 'RS256') return verify('RSA-SHA256', signingInput, key, signature);
  if (algorithm === 'ES256') {
    return verify('sha256', signingInput, { key, dsaEncoding: 'ieee-p1363' }, signature);
  }
  return verify(null, signingInput, key, signature);
}

export function createRemoteJwksLoader(jwksUrl: string): JwksLoader {
  const url = new URL(jwksUrl);
  if (url.protocol !== 'https:') throw new Error('AUTH_JWKS_URL must use HTTPS.');

  return async () => {
    const response = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) throw new Error('Authentication signing keys are unavailable.');

    const parsed = JsonWebKeySetSchema.parse(await response.json());
    return parsed.keys;
  };
}

export class SupabaseJwtVerifier implements AuthenticationProvider {
  private keys: readonly z.infer<typeof JsonWebKeySchema>[] = [];
  private keysLoadedAt = 0;

  public constructor(
    private readonly config: JwtVerificationConfig,
    private readonly loadKeys: JwksLoader = createRemoteJwksLoader(config.jwksUrl),
    private readonly clock: Clock = () => Date.now(),
  ) {
    const issuer = new URL(config.issuer);
    if (issuer.protocol !== 'https:') throw new Error('AUTH_ISSUER must use HTTPS.');
    if (config.audiences.length === 0) throw new Error('At least one AUTH_AUDIENCE is required.');
  }

  public async verifyAccessToken(token: string): Promise<AuthenticatedSubject> {
    try {
      if (token.length === 0 || token.length > 16_384) return invalidToken();
      const segments = token.split('.');
      if (segments.length !== 3) return invalidToken();

      const [encodedHeader, encodedClaims, encodedSignature] = segments;
      if (
        encodedHeader === undefined ||
        encodedClaims === undefined ||
        encodedSignature === undefined
      ) {
        return invalidToken();
      }

      const header = JwtHeaderSchema.parse(decodeJsonSegment(encodedHeader));
      const claims = JwtClaimsSchema.parse(decodeJsonSegment(encodedClaims));
      if (encodedSignature.length === 0 || !/^[A-Za-z0-9_-]+$/.test(encodedSignature)) {
        return invalidToken();
      }

      const key = await this.findKey(header.kid, header.alg);
      if (key === null) return invalidToken();
      const publicKey = createPublicKey({ key: key as never, format: 'jwk' });
      const signatureValid = verifySignature(
        header.alg,
        Buffer.from(`${encodedHeader}.${encodedClaims}`, 'ascii'),
        Buffer.from(encodedSignature, 'base64url'),
        publicKey,
      );
      if (!signatureValid) return invalidToken();

      this.validateClaims(claims);
      return {
        provider: 'SUPABASE',
        subject: claims.sub,
        providerSessionId: claims.session_id ?? null,
        assuranceLevel: claims.aal ?? null,
        emailVerified: claims.email_confirmed_at !== undefined,
        phoneVerified: claims.phone_confirmed_at !== undefined,
        issuedAt: claims.iat === undefined ? null : new Date(claims.iat * 1_000),
        expiresAt: new Date(claims.exp * 1_000),
      };
    } catch (error: unknown) {
      if (error instanceof InvalidAccessTokenError) throw error;
      return invalidToken();
    }
  }

  private validateClaims(claims: z.infer<typeof JwtClaimsSchema>): void {
    const now = Math.floor(this.clock() / 1_000);
    const tolerance = this.config.clockToleranceSeconds ?? 30;
    if (claims.iss !== this.config.issuer) return invalidToken();

    const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (!audiences.some((audience) => this.config.audiences.includes(audience))) {
      return invalidToken();
    }
    if (claims.exp <= now - tolerance) return invalidToken();
    if (claims.nbf !== undefined && claims.nbf > now + tolerance) return invalidToken();
    if (claims.iat !== undefined && claims.iat > now + tolerance) return invalidToken();
  }

  private async findKey(
    keyId: string,
    algorithm: SupportedAlgorithm,
  ): Promise<z.infer<typeof JsonWebKeySchema> | null> {
    const now = this.clock();
    if (this.keys.length === 0 || now - this.keysLoadedAt >= 300_000) {
      await this.refreshKeys(now);
    }

    let key = this.keys.find(
      (candidate) => candidate.kid === keyId && keyMatchesAlgorithm(candidate, algorithm),
    );
    if (key === undefined && now - this.keysLoadedAt >= 10_000) {
      await this.refreshKeys(now);
      key = this.keys.find(
        (candidate) => candidate.kid === keyId && keyMatchesAlgorithm(candidate, algorithm),
      );
    }
    return key ?? null;
  }

  private async refreshKeys(now: number): Promise<void> {
    this.keys = JsonWebKeySetSchema.shape.keys.parse(await this.loadKeys());
    this.keysLoadedAt = now;
  }
}

export class BearerAuthenticationService {
  public constructor(
    private readonly provider: AuthenticationProvider,
    private readonly accounts: AccountResolver,
  ) {}

  public async authenticate(
    authorizationHeader: string | undefined,
  ): Promise<AuthenticatedPrincipal> {
    const match = authorizationHeader?.match(/^Bearer ([^\s]+)$/);
    if (match?.[1] === undefined) throw authenticationRequired();

    let subject: AuthenticatedSubject;
    try {
      subject = await this.provider.verifyAccessToken(match[1]);
    } catch {
      throw authenticationRequired();
    }

    const account = await this.accounts.findByProviderSubject(subject.provider, subject.subject);
    if (account === null) throw authenticationRequired();
    if (account.status !== 'ACTIVE') {
      throw new AppError('FORBIDDEN', 'This account cannot access ArenaSports.', 403);
    }
    return { subject, account };
  }
}

function authenticationRequired(): AppError {
  return new AppError('AUTHENTICATION_REQUIRED', 'A valid access token is required.', 401);
}
