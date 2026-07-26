import { describe, expect, it } from 'vitest';
import {
  assertTournamentTransition,
  canonicalJson,
  digestCanonical,
  renderTournamentRules,
} from '../src/modules/tournaments/domain.js';

const rules = {
  schemaVersion: 1,
  match: { fixtureBestOf: 1, matchMinutes: 6, extraTime: true, penalties: true },
  scoring: { winPoints: 3, drawPoints: 1, lossPoints: 0 },
  operations: {
    checkInMinutesBefore: 15,
    resultSubmissionMinutes: 30,
    noShowGraceMinutes: 10,
    disputeWindowMinutes: 120,
    evidenceRequired: true,
    rescheduleAllowed: true,
  },
} as const;

describe('tournament state and publication policy', () => {
  it('allows the next documented transition', () => {
    expect(() => assertTournamentTransition('DRAFT', 'PUBLISHED')).not.toThrow();
  });

  it('rejects skipping directly from draft to in progress', () => {
    expect(() => assertTournamentTransition('DRAFT', 'IN_PROGRESS')).toThrow(/cannot move/);
  });

  it('keeps archived tournaments terminal', () => {
    expect(() => assertTournamentTransition('ARCHIVED', 'DRAFT')).toThrow();
  });

  it('canonicalises object keys before hashing rules', () => {
    expect(canonicalJson({ b: 2, a: { d: 4, c: 3 } })).toBe('{"a":{"c":3,"d":4},"b":2}');
    expect(digestCanonical({ b: 2, a: 1 })).toBe(digestCanonical({ a: 1, b: 2 }));
    expect(digestCanonical(rules)).toMatch(/^[a-f0-9]{64}$/);
  });

  it('renders plain competition rules without credentials or HTML', () => {
    const rendered = renderTournamentRules(rules, 'ROUND_ROBIN');
    expect(rendered).toContain('League points: win 3, draw 1, loss 0');
    expect(rendered).toContain('never requests a game password');
    expect(rendered).not.toContain('<script');
  });
});
