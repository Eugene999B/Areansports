import type {
  CreateGameProfileInput,
  CreateGameProfileOwnershipChallengeInput,
  GameCatalogEntry,
  GameProfile,
  GameProfileOwnershipChallenge,
  PublicGameProfile,
  UpdateGameProfileInput,
} from '@arenasports/contracts';
import { AppError } from '../../errors.js';
import type { AuthenticatedActor, RequestSecurityContext } from '../identity/types.js';
import type { GameProfileRepository } from './types.js';

export class GameProfileService {
  public constructor(private readonly repository: GameProfileRepository) {}

  public listGames(): Promise<GameCatalogEntry[]> {
    return this.repository.listGames();
  }

  public listForActor(actor: AuthenticatedActor): Promise<GameProfile[]> {
    return this.repository.listForUser(actor.user);
  }

  public create(
    actor: AuthenticatedActor,
    input: CreateGameProfileInput,
    security: RequestSecurityContext,
  ): Promise<GameProfile> {
    return this.repository.create(actor.user, input, security);
  }

  public update(
    actor: AuthenticatedActor,
    profileId: string,
    input: UpdateGameProfileInput,
    security: RequestSecurityContext,
  ): Promise<GameProfile> {
    return this.repository.update(actor.user, profileId, input, security);
  }

  public listPublicByHandle(handle: string): Promise<PublicGameProfile[]> {
    return this.repository.listPublicByHandle(handle);
  }

  public async openOwnershipChallenge(
    actor: AuthenticatedActor,
    profileId: string,
    input: CreateGameProfileOwnershipChallengeInput,
    security: RequestSecurityContext,
  ): Promise<GameProfileOwnershipChallenge> {
    const visible = await this.repository.findVisibleProfile(profileId);
    if (!visible) {
      throw new AppError('NOT_FOUND', 'The public game profile was not found.', 404);
    }
    if (visible.ownerId === actor.user.id) {
      throw new AppError(
        'CONFLICT',
        'You cannot challenge ownership of your own game profile.',
        409,
      );
    }

    return this.repository.openOwnershipChallenge(actor.user.id, profileId, input, security);
  }
}
