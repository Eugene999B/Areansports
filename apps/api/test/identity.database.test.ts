import { randomUUID } from 'node:crypto';
import { database } from '@arenasports/database';
import { afterAll, describe, expect, it } from 'vitest';
import { PrismaIdentityRepository } from '../src/modules/identity/prisma-repository.js';
import { IdentityService } from '../src/modules/identity/service.js';
import type { ExternalIdentityVerifier, ExternalPrincipal } from '../src/modules/identity/types.js';

const repository = new PrismaIdentityRepository(database);
const createdUserIds: string[] = [];
const correlationIds: string[] = [];

function buildPrincipal(suffix: string): ExternalPrincipal {
  return {
    provider: 'SUPABASE',
    subject: `provider-subject-${suffix}`,
    email: `player-${suffix}@example.com`,
    emailVerifiedAt: new Date('2026-07-26T00:00:00Z'),
    phone: null,
    phoneVerifiedAt: null,
    providerSessionId: `provider-session-${suffix}`,
    expiresAt: new Date('2026-07-27T00:00:00Z'),
  };
}

function buildProfile(handle: string) {
  return {
    handle,
    displayName: 'Database Player',
    countryCode: 'GH' as const,
    timezone: 'Africa/Accra',
    avatarUrl: null,
    profileVisible: true,
    notificationPreferences: {
      accountSecurityEmail: true,
      competitionEmail: true,
      competitionPush: true,
    },
  };
}

async function createAccount(suffix: string, handle: string) {
  const correlationId = `test-${randomUUID()}`;
  correlationIds.push(correlationId);
  const user = await repository.createAccount(buildPrincipal(suffix), buildProfile(handle), {
    requestId: correlationId,
  });
  createdUserIds.push(user.id);
  return user;
}

class FixedVerifier implements ExternalIdentityVerifier {
  public constructor(private readonly principal: ExternalPrincipal) {}

  public async verify(_accessToken: string): Promise<ExternalPrincipal> {
    return structuredClone(this.principal);
  }
}

afterAll(async () => {
  await database.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await database.auditEvent.deleteMany({ where: { correlationId: { in: correlationIds } } });
  await database.$disconnect();
});

describe('Prisma identity repository', () => {
  it('persists account, role, session, external identity, and audit atomically', async () => {
    const suffix = randomUUID();
    const user = await createAccount(suffix, `db_${suffix.replaceAll('-', '').slice(0, 12)}`);

    expect(user.roles).toEqual(['PLAYER']);
    const [identityCount, sessionCount, roleCount, auditCount] = await Promise.all([
      database.externalIdentity.count({ where: { userId: user.id } }),
      database.userSession.count({ where: { userId: user.id } }),
      database.roleAssignment.count({ where: { userId: user.id, role: 'PLAYER' } }),
      database.auditEvent.count({
        where: { targetId: user.id, action: 'IDENTITY.ACCOUNT_CREATED' },
      }),
    ]);

    expect({ identityCount, sessionCount, roleCount, auditCount }).toEqual({
      identityCount: 1,
      sessionCount: 1,
      roleCount: 1,
      auditCount: 1,
    });
  });

  it('rejects a duplicate normalized handle across different provider identities', async () => {
    const firstSuffix = randomUUID();
    const secondSuffix = randomUUID();
    const handle = `dup_${firstSuffix.replaceAll('-', '').slice(0, 12)}`;
    await createAccount(firstSuffix, handle);

    const correlationId = `test-${randomUUID()}`;
    correlationIds.push(correlationId);
    await expect(
      repository.createAccount(buildPrincipal(secondSuffix), buildProfile(handle.toUpperCase()), {
        requestId: correlationId,
      }),
    ).rejects.toMatchObject({ code: 'HANDLE_UNAVAILABLE' });
  });

  it('denies a locally revoked provider session', async () => {
    const suffix = randomUUID();
    const principal = buildPrincipal(suffix);
    const user = await createAccount(suffix, `rev_${suffix.replaceAll('-', '').slice(0, 12)}`);
    const sessions = await repository.listSessions(user.id, principal.providerSessionId);
    const session = sessions[0];
    expect(session).toBeDefined();
    if (!session) throw new Error('Expected a persisted session.');

    const correlationId = `test-${randomUUID()}`;
    correlationIds.push(correlationId);
    await repository.revokeSession(user.id, session.id, { requestId: correlationId });

    await expect(
      repository.registerSession(user.id, principal, { requestId: `test-${randomUUID()}` }),
    ).rejects.toMatchObject({ code: 'SESSION_REVOKED' });
  });

  it.each([
    ['SUSPENDED', 'ACCOUNT_SUSPENDED'],
    ['DELETED', 'ACCOUNT_DELETED'],
  ] as const)('denies %s accounts after provider authentication', async (accountStatus, errorCode) => {
    const suffix = randomUUID();
    const principal = buildPrincipal(suffix);
    const prefix = accountStatus === 'SUSPENDED' ? 'sus' : 'del';
    const user = await createAccount(
      suffix,
      `${prefix}_${suffix.replaceAll('-', '').slice(0, 12)}`,
    );
    await database.user.update({ where: { id: user.id }, data: { status: accountStatus } });

    const service = new IdentityService(new FixedVerifier(principal), repository);
    await expect(
      service.authenticate('test-token', { requestId: `test-${randomUUID()}` }),
    ).rejects.toMatchObject({ code: errorCode });
  });
});
