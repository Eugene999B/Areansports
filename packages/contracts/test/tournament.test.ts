import { describe, expect, it } from 'vitest';
import { CreateTournamentSchema } from '../src/index.js';

describe('CreateTournamentSchema', () => {
  const valid = {
    title: 'Accra Weekend League',
    description: 'Community competition',
    gameId: 'game_efootball',
    platform: 'MOBILE',
    region: 'GH',
    timezone: 'Africa/Accra',
    visibility: 'PUBLIC',
    format: 'ROUND_ROBIN',
    capacity: 16,
    registrationOpensAt: '2026-08-01T08:00:00Z',
    registrationClosesAt: '2026-08-05T20:00:00Z',
    startsAt: '2026-08-06T18:00:00Z',
  } as const;

  it('accepts an ordered tournament window', () => {
    expect(CreateTournamentSchema.parse(valid).title).toBe(valid.title);
  });

  it('rejects registration closing after tournament start', () => {
    const result = CreateTournamentSchema.safeParse({
      ...valid,
      registrationClosesAt: '2026-08-07T20:00:00Z',
    });

    expect(result.success).toBe(false);
  });
});
