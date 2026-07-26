import type { CurrentUser, PlatformRole } from '@arenasports/contracts';
import { describe, expect, it } from 'vitest';
import { hasAnyRole } from '../src/modules/identity/types.js';

function buildUser(roles: PlatformRole[]): CurrentUser {
  return {
    id: 'user-role-test',
    handle: 'role_test',
    displayName: 'Role Test',
    countryCode: 'GH',
    timezone: 'Africa/Accra',
    avatarUrl: null,
    profileVisible: true,
    notificationPreferences: {
      accountSecurityEmail: true,
      competitionEmail: true,
      competitionPush: true,
    },
    status: 'ACTIVE',
    roles,
    createdAt: '2026-07-26T00:00:00.000Z',
    updatedAt: '2026-07-26T00:00:00.000Z',
  };
}

describe('platform role authorization', () => {
  it('keeps ordinary player access separate from organizer authority', () => {
    expect(hasAnyRole(buildUser(['PLAYER']), ['ORGANIZER'])).toBe(false);
    expect(hasAnyRole(buildUser(['ORGANIZER']), ['ORGANIZER'])).toBe(true);
  });

  it('keeps moderator authority separate from organizer authority', () => {
    expect(hasAnyRole(buildUser(['MODERATOR']), ['ORGANIZER'])).toBe(false);
    expect(hasAnyRole(buildUser(['MODERATOR']), ['MODERATOR'])).toBe(true);
  });

  it('allows administrators to pass platform role checks without rewriting provider claims', () => {
    expect(hasAnyRole(buildUser(['ADMINISTRATOR']), ['ORGANIZER'])).toBe(true);
    expect(hasAnyRole(buildUser(['ADMINISTRATOR']), ['MODERATOR'])).toBe(true);
  });
});
