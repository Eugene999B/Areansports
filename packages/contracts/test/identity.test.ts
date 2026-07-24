import { describe, expect, it } from 'vitest';
import {
  normalizeUserHandle,
  UpdateUserProfileSchema,
  UserHandleInputSchema,
  UserProfileSchema,
} from '../src/identity.js';

describe('identity contracts', () => {
  it('normalizes handles for case-insensitive uniqueness', () => {
    expect(normalizeUserHandle('  Player_One  ')).toBe('player_one');
  });

  it('rejects ambiguous handle characters', () => {
    expect(UserHandleInputSchema.safeParse('player one').success).toBe(false);
    expect(UserHandleInputSchema.safeParse('player-one').success).toBe(false);
  });

  it('requires at least one profile change', () => {
    expect(UpdateUserProfileSchema.safeParse({}).success).toBe(false);
    expect(UpdateUserProfileSchema.safeParse({ timezone: 'Africa/Accra' }).success).toBe(true);
  });

  it('keeps provider identity separate from ArenaSports roles', () => {
    const profile = UserProfileSchema.parse({
      id: 'user_1',
      handle: 'player_one',
      displayName: 'Player One',
      countryCode: 'GH',
      timezone: 'Africa/Accra',
      status: 'ACTIVE',
      roles: ['PLAYER', 'ORGANIZER'],
      createdAt: '2026-07-24T00:00:00Z',
      updatedAt: '2026-07-24T00:00:00Z',
    });

    expect(profile.roles).toEqual(['PLAYER', 'ORGANIZER']);
    expect('providerRole' in profile).toBe(false);
  });
});
