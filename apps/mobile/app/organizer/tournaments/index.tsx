import { Link, Redirect, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  ApiClientError,
  fetchMyTournaments,
  type TournamentOwnerDetail,
} from '../../../src/api/client';
import { useAuth } from '../../../src/auth/AuthProvider';
import { NoticeCard } from '../../../src/components/NoticeCard';
import { PrimaryButton } from '../../../src/components/PrimaryButton';
import { Screen } from '../../../src/components/Screen';
import { StatusPill } from '../../../src/components/StatusPill';
import { colors, radius, spacing } from '../../../src/theme';

export default function OrganizerTournamentListScreen() {
  const { status, user, session } = useAuth();
  const [items, setItems] = useState<TournamentOwnerDetail[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setMessage(null);
    try {
      setItems(await fetchMyTournaments(session.access_token));
    } catch (error: unknown) {
      setMessage(
        error instanceof ApiClientError ? error.message : 'Your tournaments could not load.',
      );
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  if (status === 'signedOut' || status === 'unavailable' || status === 'error') {
    return <Redirect href="/auth/sign-in" />;
  }
  if (status === 'needsProfile') return <Redirect href="/auth/profile" />;
  const canOrganize = Boolean(
    user?.roles.some((role) => role === 'ORGANIZER' || role === 'ADMINISTRATOR'),
  );
  if (status === 'authenticated' && !canOrganize) return <Redirect href="/account" />;

  return (
    <Screen>
      <Text style={styles.title}>Your tournaments</Text>
      <Text style={styles.body}>
        Drafts are visible only to their owner. Published competitions expose their exact rules
        digest and cannot be edited in place.
      </Text>
      <PrimaryButton
        label="Create a free tournament"
        onPress={() => router.push('/create-tournament')}
      />

      {loading ? <ActivityIndicator color={colors.primary} size="large" /> : null}
      {message ? (
        <NoticeCard title="Could not load tournaments" tone="danger">
          {message}
        </NoticeCard>
      ) : null}
      {!loading && !message && items.length === 0 ? (
        <NoticeCard title="No tournaments yet">
          Create a private draft, review its server-rendered rules, and publish only when the dates
          and policy are ready.
        </NoticeCard>
      ) : null}

      {items.map((item) => (
        <Link
          key={item.id}
          href={{ pathname: '/organizer/tournaments/[id]', params: { id: item.id } }}
          asChild
        >
          <Pressable style={({ pressed }) => [styles.card, pressed ? styles.pressed : undefined]}>
            <View style={styles.row}>
              <StatusPill
                label={item.status.replaceAll('_', ' ')}
                tone={item.status === 'PUBLISHED' ? 'success' : 'neutral'}
              />
              <Text style={styles.version}>v{item.version}</Text>
            </View>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.meta}>
              {item.game.name} · {item.platform} · {item.visibility.replaceAll('_', ' ')}
            </Text>
            <Text style={styles.meta}>Starts {new Date(item.startsAt).toLocaleString()}</Text>
          </Pressable>
        </Link>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 32, fontWeight: '900' },
  body: { color: colors.textMuted, fontSize: 16, lineHeight: 24 },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  pressed: { backgroundColor: colors.surfaceRaised },
  row: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  version: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  cardTitle: { color: colors.text, fontSize: 20, fontWeight: '900' },
  meta: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
});
