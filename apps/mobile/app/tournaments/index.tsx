import { Link } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  ApiClientError,
  fetchPublicTournaments,
  type TournamentSummary,
} from '../../src/api/client';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { Screen } from '../../src/components/Screen';
import { StatusPill } from '../../src/components/StatusPill';
import { colors, radius, spacing } from '../../src/theme';

function TournamentCard({ tournament }: { tournament: TournamentSummary }) {
  const occupancy = `${tournament.acceptedParticipants}/${tournament.capacity}`;
  return (
    <Link href={{ pathname: '/tournaments/[id]', params: { id: tournament.id } }} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityHint="Opens tournament details"
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <View style={styles.cardHeader}>
          <StatusPill label={tournament.status.replaceAll('_', ' ')} />
          <Text style={styles.occupancy}>{occupancy} players</Text>
        </View>
        <Text style={styles.cardTitle}>{tournament.title}</Text>
        <Text style={styles.meta}>
          {tournament.platform} ? {tournament.region} ? {tournament.format.replaceAll('_', ' ')}
        </Text>
        <Text style={styles.starts}>Starts {new Date(tournament.startsAt).toLocaleString()}</Text>
      </Pressable>
    </Link>
  );
}

export default function TournamentDiscoveryScreen() {
  const [items, setItems] = useState<TournamentSummary[]>([]);
  const [message, setMessage] = useState<string>();
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(undefined);
    try {
      setItems(await fetchPublicTournaments());
    } catch (error: unknown) {
      if (error instanceof ApiClientError) {
        setMessage(error.message);
      } else if (!(error instanceof Error && error.name === 'AbortError')) {
        setMessage('Tournament discovery could not be loaded.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen>
      <Text style={styles.heading}>Open competitions</Text>
      <Text style={styles.intro}>
        Public tournaments that match your game, region, and schedule will appear here.
      </Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.muted}>Loading tournaments?</Text>
        </View>
      ) : message ? (
        <View style={styles.center}>
          <Text accessibilityRole="alert" style={styles.error}>
            {message}
          </Text>
          <PrimaryButton label="Try again" onPress={() => void load()} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>No public tournaments yet</Text>
          <Text style={styles.muted}>
            The foundation API is connected, but no organizer has created a public draft in this
            environment.
          </Text>
        </View>
      ) : (
        items.map((tournament) => <TournamentCard key={tournament.id} tournament={tournament} />)
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
  },
  intro: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  center: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.xl,
  },
  muted: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  error: {
    color: colors.danger,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '800',
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  pressed: {
    backgroundColor: colors.surfaceRaised,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  occupancy: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  cardTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  meta: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  starts: {
    color: colors.textMuted,
    fontSize: 14,
  },
});
