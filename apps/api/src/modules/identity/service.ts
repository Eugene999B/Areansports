import type {
  CreateArenaAccountInput,
  CurrentUser,
  PlatformRole,
  SessionSummary,
  UpdateCurrentUserInput,
} from '@arenasports/contracts';
import { AppError } from '../../errors.js';
import type {
  AuthenticatedActor,
  ExternalIdentityVerifier,
  IdentityRepository,
  RequestSecurityContext,
} from './types.js';
import { hasAnyRole } from './types.js';

export class IdentityService {
  public constructor(
    private readonly verifier: ExternalIdentityVerifier,
    private readonly repository: IdentityRepository,
  ) {}

  public async bootstrapAccount(
    accessToken: string,
    input: CreateArenaAccountInput,
    security: RequestSecurityContext,
  ): Promise<CurrentUser> {
    const principal = await this.verifier.verify(accessToken);
    if (!principal.email || !principal.emailVerifiedAt) {
      throw new AppError(
        'IDENTITY_NOT_VERIFIED',
        'A verified email address is required for the pilot.',
        403,
      );
    }

    const existing = await this.repository.findByExternalIdentity(
      principal.provider,
      principal.subject,
    );
    if (existing) {
      this.assertAccountActive(existing);
      await this.repository.registerSession(existing.id, principal, security);
      return existing;
    }

    return this.repository.createAccount(principal, input, security);
  }

  public async authenticate(
    accessToken: string,
    security: RequestSecurityContext,
  ): Promise<AuthenticatedActor> {
    const principal = await this.verifier.verify(accessToken);
    const user = await this.repository.findByExternalIdentity(
      principal.provider,
      principal.subject,
    );
    if (!user) {
      throw new AppError(
        'ACCOUNT_NOT_REGISTERED',
        'Complete ArenaSports account setup before continuing.',
        403,
      );
    }

    this.assertAccountActive(user);
    await this.repository.registerSession(user.id, principal, security);
    return { user, providerSessionId: principal.providerSessionId };
  }

  public async updateCurrentUser(
    actor: AuthenticatedActor,
    input: UpdateCurrentUserInput,
    security: RequestSecurityContext,
  ): Promise<CurrentUser> {
    return this.repository.updateUser(actor.user.id, input, security);
  }

  public async listSessions(actor: AuthenticatedActor): Promise<SessionSummary[]> {
    return this.repository.listSessions(actor.user.id, actor.providerSessionId);
  }

  public async revokeSession(
    actor: AuthenticatedActor,
    sessionId: string,
    security: RequestSecurityContext,
  ): Promise<void> {
    return this.repository.revokeSession(actor.user.id, sessionId, security);
  }

  public requireAnyRole(
    actor: AuthenticatedActor,
    allowedRoles: readonly PlatformRole[],
  ): AuthenticatedActor {
    if (!hasAnyRole(actor.user, allowedRoles)) {
      throw new AppError('FORBIDDEN', 'You are not allowed to perform this action.', 403);
    }
    return actor;
  }

  private assertAccountActive(user: CurrentUser): void {
    if (user.status === 'SUSPENDED') {
      throw new AppError('ACCOUNT_SUSPENDED', 'This account is suspended.', 403);
    }
    if (user.status === 'DELETED') {
      throw new AppError('ACCOUNT_DELETED', 'This account is no longer available.', 403);
    }
  }
}
