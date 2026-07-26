import { Redirect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fetchSessions, revokeSession, type SessionSummary } from '../src/api/client';
import { useAuth } from '../src/auth/AuthProvider';
import { NoticeCard } from '../src/components/NoticeCard';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { Screen } from '../src/components/Screen';
import { StatusPill } from '../src/components/StatusPill';
import { colors, radius, spacing } from '../src/theme';

function formatSessionTime(value: string, timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: timezone,
    }).format(new Date(value));
  } catch {
    return new Date(value).toLocaleString('en-GB');
  }
}

export default function AccountScreen() {
  const { status, session, user, errorMessage, refresh, signOut } = useAuth();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [actionSessionId, setActionSessionId] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [screenError, setScreenError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    if (!session) return;
    setLoadingSessions(true);
    setScreenError(null);
    try {
      setSessions(await fetchSessions(session.access_token));
    } catch (error: unknown) {
      setScreenError(error instanceof Error ? error.message : 'Sessions could not be loaded.');
    } finally {
      setLoadingSessions(false);
    }
  }, [session]);

  useEffect(() => {
    if (status === 'authenticated') void loadSessions();
  }, [loadSessions, status]);

  if (status === 'signedOut' || status === 'unavailable') return <Redirect href="/auth/sign-in" />;
  if (status === 'needsProfile') return <Redirect href="/auth/profile" />;

  if (status === 'loading' || !session || !user) {
    return (
      <Screen>
        <NoticeCard title="Loading your account">Confirming your secure session…</NoticeCard>
      </Screen>
    );
  }

  const revokeOtherSession = async (sessionId: string) => {
    setActionSessionId(sessionId);
    setScreenError(null);
    try {
      await revokeSession(session.access_token, sessionId);
      await loadSessions();
    } catch (error: unknown) {
      setScreenError(error instanceof Error ? error.message : 'The session could not be revoked.');
    } finally {
      setActionSessionId(null);
    }
  };

  const performSignOut = async () => {
    setSigningOut(true);
    setScreenError(null);
    try {
      await signOut();
    } catch (error: unknown) {
      setScreenError(error instanceof Error ? error.message : 'Sign-out could not be completed.');
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.eyebrow}>YOUR ARENASPORTS ACCOUNT</Text>
      <Text style={styles.title}>{user.displayName}</Text>
      <Text style={styles.handle}>@{user.handle}</Text>

      <View style={styles.roleRow}>
        {user.roles.map((role) => (
          <StatusPill key={role} label={role} tone={role === 'PLAYER' ? 'neutral' : 'success'} />
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Profile</Text>
        <Text style={styles.line}>Country: {user.countryCode}</Text>
        <Text style={styles.line}>Timezone: {user.timezone}</Text>
        <Text style={styles.line}>Status: {user.status}</Text>
        <Text style={styles.line}>
          Visibility: {user.profileVisible ? 'Public profile enabled' : 'Profile hidden'}
        </Text>
      </View>

      {errorMessage || screenError ? (
        <NoticeCard title="Account action needs attention" tone="danger">
          {screenError ?? errorMessage}
        </NoticeCard>
      ) : null}

      <View style={styles.sectionHeader}>
        <Text style={styles.cardTitle}>Signed-in sessions</Text>
        <Pressable accessibilityRole="button" disabled={loadingSessions} onPress={() => void loadSessions()}>
          <Text style={styles.link}>{loadingSessions ? 'Refreshing…' : 'Refresh'}</Text>
        </Pressable>
      </View>

      {sessions.length === 0 && !loadingSessions ? (
        <NoticeCard title="No session history available">
          Refresh to check this device and any other active ArenaSports sessions.
        </NoticeCard>
      ) : null}

      {sessions.map((item) => (
        <View key={item.id} style={styles.sessionCard}>
          <View style={styles.sessionHeader}>
            <Text style={styles.sessionTitle}>{item.current ? 'This device' : 'Another session'}</Text>
            <StatusPill
              label={item.revokedAt ? 'REVOKED' : item.current ? 'CURRENT' : 'ACTIVE'}
              tone={item.revokedAt ? 'warning' : 'success'}
            />
          </View>
          <Text style={styles.line}>Last seen: {formatSessionTime(item.lastSeenAt, user.timezone)}</Text>
          <Text style={styles.line}>Expires: {formatSessionTime(item.expiresAt, user.timezone)}</Text>
          {!item.current && !item.revokedAt ? (
            <Pressable
              accessibilityRole="button"
              disabled={actionSessionId === item.id}
              onPress={() => void revokeOtherSession(item.id)}
            >
              <Text style={styles.dangerLink}>
                {actionSessionId === item.id ? 'Revoking…' : 'Revoke this session'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ))}

      {status === 'error' ? (
        <PrimaryButton label="Retry account check" onPress={() => void refresh()} />
      ) : null}
      <PrimaryButton
        disabled={signingOut}
        label={signingOut ? 'Signing out…' : 'Sign out on this device'}
        onPress={() => void performSignOut()}
      />

      <Text style={styles.privacy}>
        ArenaSports stores session identifiers and security events, never your password, OTP code,
        access token, refresh token, or game credentials.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.3,
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 40,
  },
  handle: {
    color: colors.primary,
    fontSize: 17,
    fontWeight: '800',
  },
  roleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  line: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  link: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
    padding: spacing.sm,
  },
  sessionCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  sessionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sessionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  dangerLink: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '800',
    paddingVertical: spacing.sm,
  },
  privacy: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    paddingTop: spacing.md,
    textAlign: 'center',
  },
});
