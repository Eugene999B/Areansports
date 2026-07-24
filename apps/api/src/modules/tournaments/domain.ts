import type { TournamentStatus } from '@arenasports/contracts';
import { AppError } from '../../errors.js';

const transitions: Record<TournamentStatus, readonly TournamentStatus[]> = {
  DRAFT: ['PUBLISHED', 'CANCELLED'],
  PUBLISHED: ['REGISTRATION_OPEN', 'CANCELLED'],
  REGISTRATION_OPEN: ['REGISTRATION_LOCKED', 'CANCELLED'],
  REGISTRATION_LOCKED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: ['ARCHIVED'],
  CANCELLED: ['ARCHIVED'],
  ARCHIVED: [],
};

export function assertTournamentTransition(
  current: TournamentStatus,
  target: TournamentStatus,
): void {
  if (!transitions[current].includes(target)) {
    throw new AppError(
      'CONFLICT',
      `Tournament cannot move from ${current} to ${target}.`,
      409,
      false,
      { current, target },
    );
  }
}
