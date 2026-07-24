export type TournamentSummary = {
  id: string;
  title: string;
  gameId: string;
  platform: string;
  region: string;
  timezone: string;
  visibility: 'PUBLIC' | 'UNLISTED' | 'INVITE_ONLY' | 'APPROVAL_REQUIRED';
  format: 'ROUND_ROBIN' | 'SINGLE_ELIMINATION' | 'GROUP_TO_KNOCKOUT' | 'DOUBLE_ELIMINATION';
  status: string;
  capacity: number;
  acceptedParticipants: number;
  registrationClosesAt: string;
  startsAt: string;
};

type TournamentListResponse = {
  data: TournamentSummary[];
};

const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://10.0.2.2:4000/v1';

export class ApiClientError extends Error {
  public constructor(
    message: string,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export async function fetchPublicTournaments(signal?: AbortSignal): Promise<TournamentSummary[]> {
  try {
    const response = await fetch(`${API_URL}/tournaments`, {
      headers: { Accept: 'application/json' },
      signal: signal ?? null,
    });

    if (!response.ok) {
      throw new ApiClientError(
        response.status >= 500
          ? 'ArenaSports is temporarily unavailable.'
          : 'Tournament discovery could not be loaded.',
        response.status >= 500 || response.status === 429,
      );
    }

    const payload = (await response.json()) as TournamentListResponse;
    return payload.data;
  } catch (error: unknown) {
    if (error instanceof ApiClientError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
    throw new ApiClientError(
      'Check your connection and make sure the ArenaSports API is running.',
      true,
    );
  }
}
