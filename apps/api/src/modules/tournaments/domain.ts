import { createHash } from 'node:crypto';
import type {
  TournamentCancellationReason,
  TournamentFormat,
  TournamentOwnerDetail,
  TournamentPreview,
  TournamentRules,
  TournamentStatus,
} from '@arenasports/contracts';
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

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, child]) => child !== undefined)
        .sort(([left], [right]) => left.localeCompare(right, 'en-US'))
        .map(([key, child]) => [key, canonicalize(child)]),
    );
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function digestCanonical(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}

export function renderTournamentRules(rules: TournamentRules, format: TournamentFormat): string {
  const lines = [
    'ArenaSports tournament rules',
    `Format: ${format.replaceAll('_', ' ')}`,
    `Fixture series: best of ${rules.match.fixtureBestOf}`,
    `In-game match length: ${rules.match.matchMinutes} minutes`,
    `Extra time: ${rules.match.extraTime ? 'enabled' : 'disabled'}`,
    `Penalties: ${rules.match.penalties ? 'enabled' : 'disabled'}`,
    `League points: win ${rules.scoring.winPoints}, draw ${rules.scoring.drawPoints}, loss ${rules.scoring.lossPoints}`,
    `Check-in opens ${rules.operations.checkInMinutesBefore} minutes before the fixture window`,
    `Result submission deadline: ${rules.operations.resultSubmissionMinutes} minutes after play`,
    `No-show grace period: ${rules.operations.noShowGraceMinutes} minutes`,
    `Dispute window: ${rules.operations.disputeWindowMinutes} minutes`,
    `Private evidence: ${rules.operations.evidenceRequired ? 'required' : 'requested when needed'}`,
    `Rescheduling: ${rules.operations.rescheduleAllowed ? 'allowed under the published policy' : 'not allowed'}`,
    'ArenaSports never requests a game password. Result truth follows opponent confirmation, compatible submissions, private evidence, and audited review.',
  ];
  return lines.join('\n');
}

export function publicationIssues(
  tournament: Pick<
    TournamentOwnerDetail,
    'status' | 'registrationClosesAt' | 'startsAt' | 'ruleset'
  >,
  now: Date,
): string[] {
  const issues: string[] = [];
  if (tournament.status !== 'DRAFT') issues.push('Only a draft tournament can be published.');
  if (Date.parse(tournament.registrationClosesAt) <= now.getTime()) {
    issues.push('Registration must close in the future.');
  }
  if (Date.parse(tournament.startsAt) <= now.getTime()) {
    issues.push('The tournament start must be in the future.');
  }
  if (tournament.ruleset.publishedAt) {
    issues.push('The draft ruleset has already been published.');
  }
  return issues;
}

export function buildTournamentPreview(
  tournament: TournamentOwnerDetail,
  now: Date,
): TournamentPreview {
  const issues = publicationIssues(tournament, now);
  return {
    tournamentId: tournament.id,
    tournamentVersion: tournament.version,
    rulesetVersion: tournament.ruleset.version,
    contentDigest: tournament.ruleset.contentDigest,
    renderedRules: tournament.ruleset.renderedRules,
    publishable: issues.length === 0,
    issues,
  };
}

export function cancellationLabel(reason: TournamentCancellationReason): string {
  return reason.replaceAll('_', ' ').toLocaleLowerCase('en-US');
}
