import type { TournamentSummary } from '@arenasports/contracts';

export interface TournamentRepository {
  create(
    tournament: TournamentSummary & { organizerId: string; description: string },
  ): Promise<void>;
  listPublic(): Promise<TournamentSummary[]>;
}

export class InMemoryTournamentRepository implements TournamentRepository {
  readonly #items = new Map<
    string,
    TournamentSummary & { organizerId: string; description: string }
  >();

  public async create(
    tournament: TournamentSummary & { organizerId: string; description: string },
  ): Promise<void> {
    this.#items.set(tournament.id, structuredClone(tournament));
  }

  public async listPublic(): Promise<TournamentSummary[]> {
    return [...this.#items.values()]
      .filter((item) => item.visibility === 'PUBLIC')
      .sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt))
      .map(({ organizerId: _organizerId, description: _description, ...summary }) => summary);
  }
}
