import type {
  CreateGameProfileInput,
  CreateGameProfileOwnershipChallengeInput,
  CurrentUser,
  GameCatalogEntry,
  GameProfile,
  GameProfileOwnershipChallenge,
  PublicGameProfile,
  UpdateGameProfileInput,
} from '@arenasports/contracts';
import type { RequestSecurityContext } from '../identity/types.js';

export type VisibleGameProfile = {
  ownerId: string;
  profile: PublicGameProfile;
};

export interface GameProfileRepository {
  listGames(): Promise<GameCatalogEntry[]>;
  listForUser(user: CurrentUser): Promise<GameProfile[]>;
  create(
    user: CurrentUser,
    input: CreateGameProfileInput,
    security: RequestSecurityContext,
  ): Promise<GameProfile>;
  update(
    user: CurrentUser,
    profileId: string,
    input: UpdateGameProfileInput,
    security: RequestSecurityContext,
  ): Promise<GameProfile>;
  listPublicByHandle(handle: string): Promise<PublicGameProfile[]>;
  findVisibleProfile(profileId: string): Promise<VisibleGameProfile | null>;
  openOwnershipChallenge(
    challengerId: string,
    profileId: string,
    input: CreateGameProfileOwnershipChallengeInput,
    security: RequestSecurityContext,
  ): Promise<GameProfileOwnershipChallenge>;
}
