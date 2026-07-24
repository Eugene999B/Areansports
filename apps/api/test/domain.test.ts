import { describe, expect, it } from 'vitest';
import { assertTournamentTransition } from '../src/modules/tournaments/domain.js';

describe('tournament state policy', () => {
  it('allows the next documented transition', () => {
    expect(() => assertTournamentTransition('DRAFT', 'PUBLISHED')).not.toThrow();
  });

  it('rejects skipping directly from draft to in progress', () => {
    expect(() => assertTournamentTransition('DRAFT', 'IN_PROGRESS')).toThrow(/cannot move/);
  });

  it('keeps archived tournaments terminal', () => {
    expect(() => assertTournamentTransition('ARCHIVED', 'DRAFT')).toThrow();
  });
});
