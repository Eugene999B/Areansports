import type {
  CancelTournamentInput,
  CreateTournamentInput,
  PublishTournamentInput,
  TournamentOwnerDetail,
  TournamentPreview,
  TournamentPublicDetail,
  TournamentSummary,
  UpdateTournamentDraftInput,
} from '@arenasports/contracts';
import type { RequestSecurityContext } from '../identity/types.js';
import { digestCanonical } from './domain.js';
import type { TournamentRepository } from './repository.js';

export class TournamentService {
  public constructor(
    private readonly repository: TournamentRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  public createDraft(
    organizerId: string,
    input: CreateTournamentInput,
    idempotencyKey: string,
    security: RequestSecurityContext,
  ): Promise<TournamentOwnerDetail> {
    return this.repository.createDraft(organizerId, input, {
      ...security,
      idempotencyKey,
      requestDigest: digestCanonical(input),
    });
  }

  public listOwned(organizerId: string): Promise<TournamentOwnerDetail[]> {
    return this.repository.listOwned(organizerId);
  }

  public getOwned(organizerId: string, tournamentId: string): Promise<TournamentOwnerDetail> {
    return this.repository.getOwned(organizerId, tournamentId);
  }

  public updateDraft(
    organizerId: string,
    tournamentId: string,
    input: UpdateTournamentDraftInput,
    security: RequestSecurityContext,
  ): Promise<TournamentOwnerDetail> {
    return this.repository.updateDraft(organizerId, tournamentId, input, security);
  }

  public previewOwned(organizerId: string, tournamentId: string): Promise<TournamentPreview> {
    return this.repository.previewOwned(organizerId, tournamentId, this.now());
  }

  public publish(
    organizerId: string,
    tournamentId: string,
    input: PublishTournamentInput,
    idempotencyKey: string,
    security: RequestSecurityContext,
  ): Promise<TournamentOwnerDetail> {
    return this.repository.publish(
      organizerId,
      tournamentId,
      input,
      {
        ...security,
        idempotencyKey,
        requestDigest: digestCanonical({ tournamentId, ...input }),
      },
      this.now(),
    );
  }

  public cancel(
    organizerId: string,
    tournamentId: string,
    input: CancelTournamentInput,
    idempotencyKey: string,
    security: RequestSecurityContext,
  ): Promise<TournamentOwnerDetail> {
    return this.repository.cancel(
      organizerId,
      tournamentId,
      input,
      {
        ...security,
        idempotencyKey,
        requestDigest: digestCanonical({ tournamentId, ...input }),
      },
      this.now(),
    );
  }

  public discoverPublic(): Promise<TournamentSummary[]> {
    return this.repository.listPublic();
  }

  public getPublic(tournamentRef: string): Promise<TournamentPublicDetail> {
    return this.repository.getPublic(tournamentRef);
  }
}
