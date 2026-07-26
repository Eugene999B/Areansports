import { describe, expect, it } from 'vitest';
import {
  CreateGameProfileSchema,
  GameUsernameSchema,
  cleanGameUsername,
  normalizeGameRegion,
  normalizeGameUsername,
} from '../src/game-profile.js';

describe('game profile contracts', () => {
  it('normalises casing, Unicode width, and whitespace for duplicate comparisons', () => {
    expect(cleanGameUsername('  Arena   Player  ')).toBe('Arena Player');
    expect(normalizeGameUsername('  ＡＲＥＮＡ   Player  ')).toBe('arena player');
    expect(normalizeGameRegion(' gh ')).toBe('GH');
  });

  it('accepts a public mobile identity without any credential field', () => {
    const parsed = CreateGameProfileSchema.parse({
      gameSlug: 'efootball',
      platform: 'ANDROID',
      region: 'gh',
      username: '  Eugene FC  ',
    });

    expect(parsed).toEqual({
      gameSlug: 'efootball',
      platform: 'ANDROID',
      region: 'GH',
      username: 'Eugene FC',
      visible: true,
    });
    expect('password' in parsed).toBe(false);
  });

  it('rejects invisible and bidirectional spoofing characters', () => {
    expect(GameUsernameSchema.safeParse('Arena\u200BPlayer').success).toBe(false);
    expect(GameUsernameSchema.safeParse('Arena\u202EPlayer').success).toBe(false);
  });

  it('keeps platform values constrained to mobile clients', () => {
    expect(
      CreateGameProfileSchema.safeParse({
        gameSlug: 'fc-mobile',
        platform: 'PLAYSTATION',
        region: 'GLOBAL',
        username: 'Arena Player',
      }).success,
    ).toBe(false);
  });
});
