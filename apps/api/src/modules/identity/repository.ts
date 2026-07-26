import { randomUUID } from 'node:crypto';
import {
  NotificationPreferencesSchema,
  normalizeHandle,
  type CreateArenaAccountInput,
  type CurrentUser,
  type IdentityProvider,
  type SessionSummary,
  type UpdateCurrentUserInput,
} from '@arenasports/contracts';
import { AppError } from '../../errors.js';
import type { ExternalPrincipal, IdentityRepository, RequestSecurityContext } from './types.js';

type StoredSession = SessionSummary & {
  providerSessionId: string;
  userId: string;
};

export type SecurityAuditRecord = {
  action: string;
  actorId: string;
  requestId: string;
  targetId: string;
};

export class InMemoryIdentityRepository implements IdentityRepository {
  readonly #users = new Map<string, CurrentUser>();
  readonly #identityToUser = new Map<string, string>();
  readonly #handleToUser = new Map<string, string>();
  readonly #sessions = new Map<string, StoredSession>();
  public readonly auditRecords: SecurityAuditRecord[] = [];

  public async findByExternalIdentity(
    provider: IdentityProvider,
    providerSubject: string,
  ): Promise<CurrentUser | null> {
    const userId = this.#identityToUser.get(`${provider}:${providerSubject}`);
    const user = userId ? this.#users.get(userId) : undefined;
    return user ? structuredClone(user) : null;
  }

  public async createAccount(
    principal: ExternalPrincipal,
    input: CreateArenaAccountInput,
    security: RequestSecurityContext,
  ): Promise<CurrentUser> {
    const identityKey = `${principal.provider}:${principal.subject}`;
    const existingUserId = this.#identityToUser.get(identityKey);
    if (existingUserId) {
      const existing = this.#users.get(existingUserId);
      if (existing) return structuredClone(existing);
    }

    const normalizedHandle = normalizeHandle(input.handle);
    if (this.#handleToUser.has(normalizedHandle)) {
      throw new AppError('HANDLE_UNAVAILABLE', 'That handle is not available.', 409);
    }

    const now = new Date().toISOString();
    const user: CurrentUser = {
      id: `user_${randomUUID()}`,
      handle: input.handle.trim(),
      displayName: input.displayName.trim(),
      countryCode: input.countryCode,
      timezone: input.timezone,
      avatarUrl: input.avatarUrl ?? null,
      profileVisible: input.profileVisible,
      notificationPreferences: NotificationPreferencesSchema.parse(input.notificationPreferences),
      status: 'ACTIVE',
      roles: ['PLAYER'],
      createdAt: now,
      updatedAt: now,
    };

    this.#users.set(user.id, structuredClone(user));
    this.#identityToUser.set(identityKey, user.id);
    this.#handleToUser.set(normalizedHandle, user.id);
    this.auditRecords.push({
      action: 'IDENTITY.ACCOUNT_CREATED',
      actorId: user.id,
      requestId: security.requestId,
      targetId: user.id,
    });
    await this.registerSession(user.id, principal, security);
    return structuredClone(user);
  }

  public async updateUser(
    userId: string,
    input: UpdateCurrentUserInput,
    security: RequestSecurityContext,
  ): Promise<CurrentUser> {
    const current = this.#users.get(userId);
    if (!current) throw new AppError('NOT_FOUND', 'The account was not found.', 404);

    if (input.handle) {
      const normalizedHandle = normalizeHandle(input.handle);
      const ownerId = this.#handleToUser.get(normalizedHandle);
      if (ownerId && ownerId !== userId) {
        throw new AppError('HANDLE_UNAVAILABLE', 'That handle is not available.', 409);
      }
      this.#handleToUser.delete(normalizeHandle(current.handle));
      this.#handleToUser.set(normalizedHandle, userId);
    }

    const updated: CurrentUser = {
      id: current.id,
      handle: input.handle?.trim() ?? current.handle,
      displayName: input.displayName?.trim() ?? current.displayName,
      countryCode: input.countryCode ?? current.countryCode,
      timezone: input.timezone ?? current.timezone,
      avatarUrl: input.avatarUrl === undefined ? current.avatarUrl : input.avatarUrl,
      profileVisible: input.profileVisible ?? current.profileVisible,
      notificationPreferences: input.notificationPreferences
        ? NotificationPreferencesSchema.parse(input.notificationPreferences)
        : current.notificationPreferences,
      status: current.status,
      roles: current.roles,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
    };

    this.#users.set(userId, structuredClone(updated));
    this.auditRecords.push({
      action: 'IDENTITY.PROFILE_UPDATED',
      actorId: userId,
      requestId: security.requestId,
      targetId: userId,
    });
    return structuredClone(updated);
  }

  public async registerSession(
    userId: string,
    principal: ExternalPrincipal,
    security: RequestSecurityContext,
  ): Promise<void> {
    const existing = [...this.#sessions.values()].find(
      (session) => session.providerSessionId === principal.providerSessionId,
    );
    const now = new Date().toISOString();

    if (existing) {
      if (existing.userId !== userId) {
        throw new AppError('AUTHENTICATION_INVALID', 'The access token is invalid.', 401);
      }
      if (existing.revokedAt) {
        throw new AppError('SESSION_REVOKED', 'This session has been revoked.', 401);
      }
      existing.lastSeenAt = now;
      existing.expiresAt = principal.expiresAt.toISOString();
      return;
    }

    const session: StoredSession = {
      id: `session_${randomUUID()}`,
      userId,
      providerSessionId: principal.providerSessionId,
      current: false,
      createdAt: now,
      lastSeenAt: now,
      expiresAt: principal.expiresAt.toISOString(),
      revokedAt: null,
    };
    this.#sessions.set(session.id, session);
    this.auditRecords.push({
      action: 'IDENTITY.SESSION_CREATED',
      actorId: userId,
      requestId: security.requestId,
      targetId: session.id,
    });
  }

  public async listSessions(
    userId: string,
    currentProviderSessionId: string,
  ): Promise<SessionSummary[]> {
    return [...this.#sessions.values()]
      .filter((session) => session.userId === userId)
      .sort((left, right) => Date.parse(right.lastSeenAt) - Date.parse(left.lastSeenAt))
      .map((session) => ({
        id: session.id,
        current: session.providerSessionId === currentProviderSessionId,
        createdAt: session.createdAt,
        lastSeenAt: session.lastSeenAt,
        expiresAt: session.expiresAt,
        revokedAt: session.revokedAt,
      }));
  }

  public async revokeSession(
    userId: string,
    sessionId: string,
    security: RequestSecurityContext,
  ): Promise<void> {
    const session = this.#sessions.get(sessionId);
    if (!session || session.userId !== userId) {
      throw new AppError('NOT_FOUND', 'The session was not found.', 404);
    }

    if (!session.revokedAt) {
      session.revokedAt = new Date().toISOString();
      this.auditRecords.push({
        action: 'IDENTITY.SESSION_REVOKED',
        actorId: userId,
        requestId: security.requestId,
        targetId: session.id,
      });
    }
  }
}
