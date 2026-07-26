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

export type NotificationPreferences = {
  accountSecurityEmail: boolean;
  competitionEmail: boolean;
  competitionPush: boolean;
};

export type CurrentUser = {
  id: string;
  handle: string;
  displayName: string;
  countryCode: string;
  timezone: string;
  avatarUrl: string | null;
  profileVisible: boolean;
  notificationPreferences: NotificationPreferences;
  status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  roles: Array<'PLAYER' | 'ORGANIZER' | 'MODERATOR' | 'ADMINISTRATOR'>;
  createdAt: string;
  updatedAt: string;
};

export type SessionSummary = {
  id: string;
  current: boolean;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  revokedAt: string | null;
};

export type AccountProfileInput = {
  handle: string;
  displayName: string;
  countryCode: string;
  timezone: string;
  avatarUrl?: string | null;
  profileVisible?: boolean;
  notificationPreferences?: NotificationPreferences;
};

type ApiErrorResponse = {
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, unknown>;
    retryable?: boolean;
  };
};

type RequestOptions = {
  accessToken?: string;
  body?: unknown;
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  signal?: AbortSignal;
};

const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://10.0.2.2:4000/v1';

export class ApiClientError extends Error {
  public constructor(
    message: string,
    public readonly retryable: boolean,
    public readonly code = 'NETWORK_ERROR',
    public readonly status = 0,
    public readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

async function readJson(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return null;
  return response.json();
}

async function requestData<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.accessToken) headers.Authorization = `Bearer ${options.accessToken}`;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  const request: RequestInit = {
    method: options.method ?? 'GET',
    headers,
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    ...(options.signal ? { signal: options.signal } : {}),
  };

  try {
    const response = await fetch(`${API_URL}${path}`, request);
    const payload = await readJson(response);

    if (!response.ok) {
      const errorPayload = payload as ApiErrorResponse | null;
      throw new ApiClientError(
        errorPayload?.error?.message ??
          (response.status >= 500
            ? 'ArenaSports is temporarily unavailable.'
            : 'The request could not be completed.'),
        errorPayload?.error?.retryable ??
          (response.status >= 500 || response.status === 429),
        errorPayload?.error?.code ?? 'REQUEST_FAILED',
        response.status,
        errorPayload?.error?.details ?? {},
      );
    }

    if (response.status === 204) return undefined as T;
    return (payload as { data: T }).data;
  } catch (error: unknown) {
    if (error instanceof ApiClientError) throw error;
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new ApiClientError(
      'Check your connection and make sure the ArenaSports API is available.',
      true,
    );
  }
}

export function fetchPublicTournaments(signal?: AbortSignal): Promise<TournamentSummary[]> {
  return requestData('/tournaments', signal ? { signal } : {});
}

export function fetchCurrentUser(accessToken: string): Promise<CurrentUser> {
  return requestData('/me', { accessToken });
}

export function bootstrapAccount(
  accessToken: string,
  input: AccountProfileInput,
): Promise<CurrentUser> {
  return requestData('/auth/bootstrap', { accessToken, body: input, method: 'POST' });
}

export function updateCurrentUser(
  accessToken: string,
  input: Partial<AccountProfileInput>,
): Promise<CurrentUser> {
  return requestData('/me', { accessToken, body: input, method: 'PATCH' });
}

export function fetchSessions(accessToken: string): Promise<SessionSummary[]> {
  return requestData('/me/sessions', { accessToken });
}

export function revokeSession(accessToken: string, sessionId: string): Promise<void> {
  return requestData(`/me/sessions/${encodeURIComponent(sessionId)}`, {
    accessToken,
    method: 'DELETE',
  });
}
