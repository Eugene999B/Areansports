import { describe, expect, it } from 'vitest';
import {
  CreateArenaAccountSchema,
  UpdateCurrentUserSchema,
  normalizeHandle,
} from '../src/identity.js';

describe('identity contracts', () => {
  it('normalizes handles without changing the public value', () => {
    expect(normalizeHandle('  Arena_Player  ')).toBe('arena_player');
  });

  it('accepts a valid Ghana player profile', () => {
    const result = CreateArenaAccountSchema.safeParse({
      handle: 'Arena_Player',
      displayName: 'Arena Player',
      countryCode: 'GH',
      timezone: 'Africa/Accra',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.profileVisible).toBe(true);
      expect(result.data.notificationPreferences.accountSecurityEmail).toBe(true);
    }
  });

  it('rejects unsafe handles and empty updates', () => {
    expect(
      CreateArenaAccountSchema.safeParse({
        handle: 'arena player!',
        displayName: 'Arena Player',
        countryCode: 'GH',
        timezone: 'Africa/Accra',
      }).success,
    ).toBe(false);
    expect(UpdateCurrentUserSchema.safeParse({}).success).toBe(false);
  });
});
