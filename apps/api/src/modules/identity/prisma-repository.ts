import {
  CurrentUserSchema,
  NotificationPreferencesSchema,
  normalizeHandle,
  type CreateArenaAccountInput,
  type CurrentUser,
  type IdentityProvider,
  type SessionSummary,
  type UpdateCurrentUserInput,
} from '@arenasports/contracts';
import type { DatabaseClient } from '@arenasports/database';
import { AppError } from '../../errors.js';
import type {
  ExternalPrincipal,
  IdentityRepository,
  RequestSecurityContext,
} from './types.js';

type StoredUser = {
  id: string;
  handle: string;
  displayName: string;
  countryCode: string;
  timezone: string;
  avatarUrl: string | null;
  profileVisible: boolean;
  notificationPreferences: unknown;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  roleAssignments: Array<{ role: string }>;
};

function mapUser(user: StoredUser): CurrentUser {
  return CurrentUserSchema.parse({
    id: user.id,
    handle: user.handle,
    displayName: user.displayName,
    countryCode: user.countryCode,
    timezone: user.timezone,
    avatarUrl: user.avatarUrl,
    profileVisible: user.profileVisible,
    notificationPreferences: NotificationPreferencesSchema.parse(user.notificationPreferences),
    status: user.status,
    roles: user.roleAssignments.map((assignment) => assignment.role),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  });
}

function isUniqueConstraintError(error: unknown): boolean {
  return Boolean(
    error && typeof error === 'object' && 'code' in error && error.code === 'P2002',
  );
}

export class PrismaIdentityRepository implements IdentityRepository {
  public constructor(private readonly database: DatabaseClient) {}

  public async findByExternalIdentity(
    provider: IdentityProvider,
    providerSubject: string,
  ): Promise<CurrentUser | null> {
    const identity = await this.database.externalIdentity.findUnique({
      where: { provider_providerSubject: { provider, providerSubject } },
      include: {
        user: {
          include: {
            roleAssignments: {
              where: { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
            },
          },
        },
      },
    });
    return identity ? mapUser(identity.user) : null;
  }

  public async createAccount(
    principal: ExternalPrincipal,
    input: CreateArenaAccountInput,
    security: RequestSecurityContext,
  ): Promise<CurrentUser> {
    try {
      return await this.database.$transaction(async (transaction) => {
        const existingIdentity = await transaction.externalIdentity.findUnique({
          where: {
            provider_providerSubject: {
              provider: principal.provider,
              providerSubject: principal.subject,
            },
          },
          include: { user: { include: { roleAssignments: true } } },
        });
        if (existingIdentity) return mapUser(existingIdentity.user);

        const normalizedHandle = normalizeHandle(input.handle);
        const handleOwner = await transaction.user.findUnique({ where: { normalizedHandle } });
        if (handleOwner) {
          throw new AppError('HANDLE_UNAVAILABLE', 'That handle is not available.', 409);
        }

        const user = await transaction.user.create({
          data: {
            handle: input.handle.trim(),
            normalizedHandle,
            displayName: input.displayName.trim(),
            countryCode: input.countryCode,
            timezone: input.timezone,
            avatarUrl: input.avatarUrl ?? null,
            profileVisible: input.profileVisible,
            notificationPreferences: input.notificationPreferences,
            externalIdentities: {
              create: {
                provider: principal.provider,
                providerSubject: principal.subject,
                email: principal.email,
                normalizedEmail: principal.email,
                emailVerifiedAt: principal.emailVerifiedAt,
                phone: principal.phone,
                normalizedPhone: principal.phone,
                phoneVerifiedAt: principal.phoneVerifiedAt,
              },
            },
            roleAssignments: { create: { role: 'PLAYER' } },
            sessions: {
              create: {
                providerSessionId: principal.providerSessionId,
                expiresAt: principal.expiresAt,
                ...(security.userAgentHash ? { userAgentHash: security.userAgentHash } : {}),
                ...(security.ipHash ? { ipHash: security.ipHash } : {}),
              },
            },
          },
          include: { roleAssignments: true },
        });

        await transaction.auditEvent.create({
          data: {
            actorType: 'USER',
            actorId: user.id,
            action: 'IDENTITY.ACCOUNT_CREATED',
            targetType: 'USER',
            targetId: user.id,
            correlationId: security.requestId,
            visibility: 'SECURITY',
            metadata: { provider: principal.provider },
          },
        });
        return mapUser(user);
      });
    } catch (error: unknown) {
      if (error instanceof AppError) throw error;
      if (isUniqueConstraintError(error)) {
        throw new AppError(
          'HANDLE_UNAVAILABLE',
          'The handle or verified identity is already in use.',
          409,
        );
      }
      throw error;
    }
  }

  public async updateUser(
    userId: string,
    input: UpdateCurrentUserInput,
    security: RequestSecurityContext,
  ): Promise<CurrentUser> {
    try {
      return await this.database.$transaction(async (transaction) => {
        if (input.handle) {
          const owner = await transaction.user.findUnique({
            where: { normalizedHandle: normalizeHandle(input.handle) },
          });
          if (owner && owner.id !== userId) {
            throw new AppError('HANDLE_UNAVAILABLE', 'That handle is not available.', 409);
          }
        }

        const user = await transaction.user.update({
          where: { id: userId },
          data: {
            ...(input.handle
              ? { handle: input.handle.trim(), normalizedHandle: normalizeHandle(input.handle) }
              : {}),
            ...(input.displayName ? { displayName: input.displayName.trim() } : {}),
            ...(input.countryCode ? { countryCode: input.countryCode } : {}),
            ...(input.timezone ? { timezone: input.timezone } : {}),
            ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
            ...(input.profileVisible !== undefined
              ? { profileVisible: input.profileVisible }
              : {}),
            ...(input.notificationPreferences
              ? { notificationPreferences: input.notificationPreferences }
              : {}),
          },
          include: {
            roleAssignments: {
              where: { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
            },
          },
        });

        await transaction.auditEvent.create({
          data: {
            actorType: 'USER',
            actorId: userId,
            action: 'IDENTITY.PROFILE_UPDATED',
            targetType: 'USER',
            targetId: userId,
            correlationId: security.requestId,
            visibility: 'SECURITY',
            metadata: { changedFields: Object.keys(input).sort() },
          },
        });
        return mapUser(user);
      });
    } catch (error: unknown) {
      if (error instanceof AppError) throw error;
      if (isUniqueConstraintError(error)) {
        throw new AppError('HANDLE_UNAVAILABLE', 'That handle is not available.', 409);
      }
      throw error;
    }
  }

  public async registerSession(
    userId: string,
    principal: ExternalPrincipal,
    security: RequestSecurityContext,
  ): Promise<void> {
    await this.database.$transaction(async (transaction) => {
      const existing = await transaction.userSession.findUnique({
        where: { providerSessionId: principal.providerSessionId },
      });
      if (existing) {
        if (existing.userId !== userId) {
          throw new AppError('AUTHENTICATION_INVALID', 'The access token is invalid.', 401);
        }
        if (existing.revokedAt) {
          throw new AppError('SESSION_REVOKED', 'This session has been revoked.', 401);
        }
        await transaction.userSession.update({
          where: { id: existing.id },
          data: { lastSeenAt: new Date(), expiresAt: principal.expiresAt },
        });
        return;
      }

      const session = await transaction.userSession.create({
        data: {
          userId,
          providerSessionId: principal.providerSessionId,
          expiresAt: principal.expiresAt,
          ...(security.userAgentHash ? { userAgentHash: security.userAgentHash } : {}),
          ...(security.ipHash ? { ipHash: security.ipHash } : {}),
        },
      });
      await transaction.auditEvent.create({
        data: {
          actorType: 'USER',
          actorId: userId,
          action: 'IDENTITY.SESSION_CREATED',
          targetType: 'USER_SESSION',
          targetId: session.id,
          correlationId: security.requestId,
          visibility: 'SECURITY',
          metadata: {},
        },
      });
    });
  }

  public async listSessions(
    userId: string,
    currentProviderSessionId: string,
  ): Promise<SessionSummary[]> {
    const sessions = await this.database.userSession.findMany({
      where: { userId },
      orderBy: { lastSeenAt: 'desc' },
      take: 50,
    });
    return sessions.map((session) => ({
      id: session.id,
      current: session.providerSessionId === currentProviderSessionId,
      createdAt: session.createdAt.toISOString(),
      lastSeenAt: session.lastSeenAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      revokedAt: session.revokedAt?.toISOString() ?? null,
    }));
  }

  public async revokeSession(
    userId: string,
    sessionId: string,
    security: RequestSecurityContext,
  ): Promise<void> {
    await this.database.$transaction(async (transaction) => {
      const session = await transaction.userSession.findFirst({
        where: { id: sessionId, userId },
      });
      if (!session) throw new AppError('NOT_FOUND', 'The session was not found.', 404);
      if (session.revokedAt) return;

      await transaction.userSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date(), revocationReason: 'USER_REQUEST' },
      });
      await transaction.auditEvent.create({
        data: {
          actorType: 'USER',
          actorId: userId,
          action: 'IDENTITY.SESSION_REVOKED',
          targetType: 'USER_SESSION',
          targetId: session.id,
          correlationId: security.requestId,
          visibility: 'SECURITY',
          metadata: { reason: 'USER_REQUEST' },
        },
      });
    });
  }
}
