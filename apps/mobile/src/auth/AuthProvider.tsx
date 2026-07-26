import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { AppState, Platform } from 'react-native';
import {
  ApiClientError,
  bootstrapAccount,
  fetchCurrentUser,
  fetchSessions,
  revokeSession,
  updateCurrentUser,
  type AccountProfileInput,
  type CurrentUser,
} from '../api/client';
import { isAuthenticationConfigured, supabase } from './supabase';

export type AuthStatus =
  | 'loading'
  | 'signedOut'
  | 'needsProfile'
  | 'authenticated'
  | 'unavailable'
  | 'error';

type VerifiedDestination = 'needsProfile' | 'authenticated';

type AuthContextValue = {
  status: AuthStatus;
  session: Session | null;
  user: CurrentUser | null;
  errorMessage: string | null;
  sendEmailOtp: (email: string) => Promise<void>;
  verifyEmailOtp: (email: string, token: string) => Promise<VerifiedDestination>;
  completeProfile: (input: AccountProfileInput) => Promise<void>;
  updateProfile: (input: Partial<AccountProfileInput>) => Promise<void>;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getConfiguredClient() {
  if (!supabase) {
    throw new Error('Authentication is not configured for this build.');
  }
  return supabase;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const syncSequence = useRef(0);

  const syncSession = useCallback(async (nextSession: Session | null): Promise<AuthStatus> => {
    const sequence = ++syncSequence.current;
    setSession(nextSession);
    setErrorMessage(null);

    if (!nextSession) {
      if (sequence === syncSequence.current) {
        setUser(null);
        setStatus('signedOut');
      }
      return 'signedOut';
    }

    try {
      const nextUser = await fetchCurrentUser(nextSession.access_token);
      if (sequence === syncSequence.current) {
        setUser(nextUser);
        setStatus('authenticated');
      }
      return 'authenticated';
    } catch (error: unknown) {
      if (error instanceof ApiClientError && error.code === 'ACCOUNT_NOT_REGISTERED') {
        if (sequence === syncSequence.current) {
          setUser(null);
          setStatus('needsProfile');
        }
        return 'needsProfile';
      }

      if (
        error instanceof ApiClientError &&
        ['ACCOUNT_SUSPENDED', 'ACCOUNT_DELETED', 'SESSION_REVOKED'].includes(error.code)
      ) {
        if (sequence === syncSequence.current) {
          setUser(null);
          setSession(null);
          setStatus('signedOut');
          setErrorMessage(error.message);
        }
        await supabase?.auth.signOut({ scope: 'local' });
        return 'signedOut';
      }

      if (sequence === syncSequence.current) {
        setUser(null);
        setStatus('error');
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'ArenaSports could not confirm your account. Try again.',
        );
      }
      return 'error';
    }
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!isAuthenticationConfigured || !client) {
      setStatus('unavailable');
      setErrorMessage('Authentication is not configured for this build.');
      return undefined;
    }

    void client.auth.getSession().then(({ data, error }) => {
      if (error) {
        setStatus('error');
        setErrorMessage('Your saved session could not be restored. Sign in again.');
        return;
      }
      void syncSession(data.session);
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      setTimeout(() => {
        void syncSession(nextSession);
      }, 0);
    });

    const appStateSubscription =
      Platform.OS === 'web'
        ? null
        : AppState.addEventListener('change', (nextState) => {
            if (nextState === 'active') {
              client.auth.startAutoRefresh();
            } else {
              client.auth.stopAutoRefresh();
            }
          });

    return () => {
      subscription.unsubscribe();
      appStateSubscription?.remove();
      if (Platform.OS !== 'web') client.auth.stopAutoRefresh();
    };
  }, [syncSession]);

  const sendEmailOtp = useCallback(async (email: string): Promise<void> => {
    const normalizedEmail = email.trim().toLocaleLowerCase('en-US');
    if (!normalizedEmail) throw new Error('Enter your email address.');

    const client = getConfiguredClient();
    const { error } = await client.auth.signInWithOtp({
      email: normalizedEmail,
      options: { shouldCreateUser: true },
    });
    if (error) throw new Error('The sign-in code could not be sent. Try again shortly.');
  }, []);

  const verifyEmailOtp = useCallback(
    async (email: string, token: string): Promise<VerifiedDestination> => {
      const client = getConfiguredClient();
      const { data, error } = await client.auth.verifyOtp({
        email: email.trim().toLocaleLowerCase('en-US'),
        token: token.trim(),
        type: 'email',
      });
      if (error || !data.session) {
        throw new Error('The code is invalid or expired. Request a new code and try again.');
      }

      const destination = await syncSession(data.session);
      if (destination === 'needsProfile' || destination === 'authenticated') return destination;
      throw new Error('Your ArenaSports account could not be loaded. Try again.');
    },
    [syncSession],
  );

  const completeProfile = useCallback(
    async (input: AccountProfileInput): Promise<void> => {
      if (!session) throw new Error('Your sign-in session has expired. Sign in again.');
      const nextUser = await bootstrapAccount(session.access_token, input);
      setUser(nextUser);
      setStatus('authenticated');
      setErrorMessage(null);
    },
    [session],
  );

  const updateProfile = useCallback(
    async (input: Partial<AccountProfileInput>): Promise<void> => {
      if (!session) throw new Error('Your sign-in session has expired. Sign in again.');
      const nextUser = await updateCurrentUser(session.access_token, input);
      setUser(nextUser);
    },
    [session],
  );

  const refresh = useCallback(async (): Promise<void> => {
    await syncSession(session);
  }, [session, syncSession]);

  const signOut = useCallback(async (): Promise<void> => {
    const client = getConfiguredClient();
    if (session) {
      try {
        const sessions = await fetchSessions(session.access_token);
        const currentSession = sessions.find((item) => item.current && !item.revokedAt);
        if (currentSession) await revokeSession(session.access_token, currentSession.id);
      } catch {
        // Local sign-out must still complete when the API is temporarily unavailable.
      }
    }

    await client.auth.signOut({ scope: 'local' });
    setSession(null);
    setUser(null);
    setStatus('signedOut');
    setErrorMessage(null);
  }, [session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      user,
      errorMessage,
      sendEmailOtp,
      verifyEmailOtp,
      completeProfile,
      updateProfile,
      refresh,
      signOut,
    }),
    [
      status,
      session,
      user,
      errorMessage,
      sendEmailOtp,
      verifyEmailOtp,
      completeProfile,
      updateProfile,
      refresh,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}
