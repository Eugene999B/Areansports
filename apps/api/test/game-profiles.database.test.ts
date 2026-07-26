import { randomUUID } from 'node:crypto';
import type { CurrentUser } from '@arenasports/contracts';
import { database } from '@arenasports/database';
import { afterAll, describe, expect, it } from 'vitest';
import { PrismaGameProfileRepository } from '../src/modules/game-profiles/prisma-repository.js';
import { GameProfileService } from '../src/modules/game-profiles/service.js';

const repository = new PrismaGameProfileRepository(database);
const service = new GameProfileService(repository);
const userIds: string[] = [];
const profileIds: string[] = [];
const challengeIds: string[] = [];
const correlationIds: string[] = [];

async function createUser(label: string): Promise<CurrentUser> {
  const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
  const handle = `${label}_${suffix}`;
  const user = await database.user.create({
    data: {
      handle,
      normalizedHandle: handle.toLocaleLowerCase('en-US'),
      displayName: label,
      countryCode: 'GH',
      timezone: 'Africa/Accra',
      profileVisible: true,
      notificationPreferences: {
        accountSecurityEmail: true,
        competitionEmail: true,
        competitionPush: true,
      },
      roleAssignments: { create: { role: 'PLAYER' } },
    },
    include: { roleAssignments: true },
  });
  userIds.push(user.id);
  return {
    id: user.id,
    handle: user.handle,
    displayName: user.displayName,
    countryCode: user.countryCode,
    timezone: user.timezone,
    avatarUrl: user.avatarUrl,
    profileVisible: user.profileVisible,
    notificationPreferences: user.notificationPreferences as CurrentUser['notificationPreferences'],
    status: user.status,
    roles: user.roleAssignments.map((assignment) => assignment.role),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

function security() {
  const requestId = `game-profile-test-${randomUUID()}`;
  correlationIds.push(requestId);
  return { requestId };
}

async function createProfile(user: CurrentUser, username: string) {
  const profile = await repository.create(
    user,
    {
      gameSlug: 'efootball',
      platform: 'ANDROID',
      region: 'GH',
      username,
      visible: true,
    },
    security(),
  );
  profileIds.push(profile.id);
  return profile;
}

afterAll(async () => {
  await database.gameProfileOwnershipChallenge.deleteMany({
    where: { id: { in: challengeIds } },
  });
  await database.gameProfile.deleteMany({ where: { id: { in: profileIds } } });
  await database.auditEvent.deleteMany({ where: { correlationId: { in: correlationIds } } });
  await database.user.deleteMany({ where: { id: { in: userIds } } });
  await database.$disconnect();
});

describe('Prisma game profile repository', () => {
  it('loads the seeded eFootball and FC Mobile catalogue', async () => {
    const games = await repository.listGames();
    expect(games.map((game) => game.slug)).toEqual(['fc-mobile', 'efootball']);
    expect(games.every((game) => game.allowedPlatforms.includes('ANDROID'))).toBe(true);
  });

  it('persists an unverified profile and security audit atomically', async () => {
    const user = await createUser('database_player');
    const profile = await createProfile(user, '  Database   Player  ');
    expect(profile).toMatchObject({
      username: 'Database Player',
      verificationState: 'UNVERIFIED',
      version: 1,
    });

    const auditCount = await database.auditEvent.count({
      where: { action: 'GAME_PROFILE.CREATED', targetId: profile.id, actorId: user.id },
    });
    expect(auditCount).toBe(1);
  });

  it('enforces normalised username and per-user slot uniqueness', async () => {
    const firstUser = await createUser('first_player');
    const secondUser = await createUser('second_player');
    const first = await createProfile(firstUser, 'ＡＲＥＮＡ Player');

    await expect(createProfile(secondUser, ' arena   player ')).rejects.toMatchObject({
      code: 'GAME_PROFILE_USERNAME_TAKEN',
    });
    await expect(createProfile(firstUser, 'Another Public Name')).rejects.toMatchObject({
      code: 'GAME_PROFILE_SLOT_TAKEN',
    });
    expect(first.verificationState).toBe('UNVERIFIED');
  });

  it('uses optimistic versions and public visibility filters', async () => {
    const user = await createUser('visible_player');
    const profile = await createProfile(user, 'Visible Player');
    const updated = await repository.update(
      user,
      profile.id,
      { visible: false, version: profile.version },
      security(),
    );
    expect(updated).toMatchObject({ visible: false, version: 2 });

    await expect(
      repository.update(user, profile.id, { username: 'Stale Name', version: 1 }, security()),
    ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
    expect(await repository.listPublicByHandle(user.handle)).toEqual([]);
  });

  it('persists one open ownership challenge and rejects self challenges', async () => {
    const owner = await createUser('challenge_owner');
    const challenger = await createUser('challenge_sender');
    const profile = await createProfile(owner, 'Challenged Player');
    const challenge = await service.openOwnershipChallenge(
      { user: challenger, providerSessionId: 'challenge-session' },
      profile.id,
      { statement: 'This public identity belongs to me and I can provide supporting proof.' },
      security(),
    );
    challengeIds.push(challenge.id);
    expect(challenge.status).toBe('OPEN');

    await expect(
      service.openOwnershipChallenge(
        { user: challenger, providerSessionId: 'challenge-session' },
        profile.id,
        { statement: 'A duplicate open ownership challenge should not be accepted.' },
        security(),
      ),
    ).rejects.toMatchObject({ code: 'OWNERSHIP_CHALLENGE_EXISTS' });
    await expect(
      service.openOwnershipChallenge(
        { user: owner, providerSessionId: 'owner-session' },
        profile.id,
        { statement: 'An owner cannot challenge their own public game profile.' },
        security(),
      ),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });
});
