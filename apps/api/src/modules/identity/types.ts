import type {
  CreateArenaAccountInput,
  CurrentUser,
  IdentityProvider,
  PlatformRole,
  SessionSummary,
  UpdateCurrentUserInput,
} from '@arenasports/contracts';

export type ExternalPrincipal = {
  provider: IdentityProvider;
  subject: string;
  email: string | null;
  emailVerifiedAt: Date | null;
  phone: string | null;
  phoneVerifiedAt: Date | null;
  providerSessionId: string;
  expiresAt: Date;
};

export type RequestSecurityContext = {
  requestId: string;
  userAgentHash?: string;
  ipHash?: string;
};

export type AuthenticatedActor = {
  user: CurrentUser;
  providerSessionId: string;
};

export interface ExternalIdentityVerifier {
  verify(accessToken: string): Promise<ExternalPrincipal>;
}

export interface IdentityRepository {
  findByExternalIdentity(
    provider: IdentityProvider,
    providerSubject: string,
  ): Promise<CurrentUser | null>;
  createAccount(
    principal: ExternalPrincipal,
    input: CreateArenaAccountInput,
    security: RequestSecurityContext,
  ): Promise<CurrentUser>;
  updateUser(
    userId: string,
    input: UpdateCurrentUserInput,
    security: RequestSecurityContext,
  ): Promise<CurrentUser>;
  registerSession(
    userId: string,
    principal: ExternalPrincipal,
    security: RequestSecurityContext,
  ): Promise<void>;
  listSessions(userId: string, currentProviderSessionId: string): Promise<SessionSummary[]>;
  revokeSession(userId: string, sessionId: string, security: RequestSecurityContext): Promise<void>;
}

export function hasAnyRole(user: CurrentUser, allowedRoles: readonly PlatformRole[]): boolean {
  return (
    user.roles.includes('ADMINISTRATOR') || allowedRoles.some((role) => user.roles.includes(role))
  );
}
