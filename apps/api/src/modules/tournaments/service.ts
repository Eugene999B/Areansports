import { randomUUID } from 'node:crypto';
import type { CreateTournamentInput, TournamentSummary } from '@arenasports/contracts';
import type { TournamentRepository } from './repository.js';

export class TournamentService {
  public constructor(private readonly repository: TournamentRepository) {}

  public async createDraft(
    organizerId: string,
    input: CreateTournamentInput,
  ): Promise<TournamentSummary> {
    const summary: TournamentSummary = {
      id: randomUUID(),
      title: input.title,
      gameId: input.gameId,
      platform: input.platform,
      region: input.region,
      timezone: input.timezone,
      visibility: input.visibility,
      format: input.format,
      status: 'DRAFT',
      capacity: input.capacity,
      acceptedParticipants: 0,
      registrationClosesAt: input.registrationClosesAt,
      startsAt: input.startsAt,
    };

    await this.repository.create({
      ...summary,
      organizerId,
      description: input.description,
    });

    return summary;
  }

  public async discoverPublic(): Promise<TournamentSummary[]> {
    return this.repository.listPublic();
  }
}
