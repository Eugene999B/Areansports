import { describe, expect, it } from 'vitest';
import {
  CancelTournamentSchema,
  CreateTournamentSchema,
  TournamentRulesSchema,
  UpdateTournamentDraftSchema,
} from '../src/index.js';

const valid = {
  title: 'Accra Weekend League',
  description: 'Community competition',
  gameSlug: 'efootball',
  platform: 'ANDROID',
  region: 'gh',
  timezone: 'Africa/Accra',
  visibility: 'PUBLIC',
  format: 'ROUND_ROBIN',
  capacity: 16,
  registrationOpensAt: '2026-08-01T08:00:00Z',
  registrationClosesAt: '2026-08-05T20:00:00Z',
  startsAt: '2026-08-06T18:00:00Z',
  rules: {},
} as const;

describe('tournament contracts', () => {
  it('applies safe competition defaults without money or credential fields', () => {
    const parsed = CreateTournamentSchema.parse(valid);
    expect(parsed.region).toBe('GH');
    expect(parsed.rules).toMatchObject({
      schemaVersion: 1,
      match: { fixtureBestOf: 1, matchMinutes: 6, penalties: true },
      scoring: { winPoints: 3, drawPoints: 1, lossPoints: 0 },
      operations: { evidenceRequired: true, rescheduleAllowed: true },
    });
    expect('entryFee' in parsed).toBe(false);
    expect('password' in parsed).toBe(false);
    expect('status' in parsed).toBe(false);
  });

  it('rejects invalid date windows and unresolved elimination matches', () => {
    expect(
      CreateTournamentSchema.safeParse({
        ...valid,
        registrationClosesAt: '2026-08-07T20:00:00Z',
      }).success,
    ).toBe(false);
    expect(
      CreateTournamentSchema.safeParse({
        ...valid,
        format: 'SINGLE_ELIMINATION',
        rules: { match: { penalties: false } },
      }).success,
    ).toBe(false);
  });

  it('requires sensible points and an actual draft change', () => {
    expect(
      TournamentRulesSchema.safeParse({
        scoring: { winPoints: 1, drawPoints: 3, lossPoints: 0 },
      }).success,
    ).toBe(false);
    expect(UpdateTournamentDraftSchema.safeParse({ version: 1 }).success).toBe(false);
    expect(UpdateTournamentDraftSchema.safeParse({ version: 1, capacity: 32 }).success).toBe(true);
  });

  it('requires a bounded reason for cancellation', () => {
    expect(
      CancelTournamentSchema.safeParse({
        version: 2,
        reasonCode: 'TECHNICAL_ISSUE',
        explanation: 'Provider outage affects fair competition.',
      }).success,
    ).toBe(true);
    expect(
      CancelTournamentSchema.safeParse({
        version: 2,
        reasonCode: 'OTHER',
        explanation: 'No',
      }).success,
    ).toBe(false);
  });
});
