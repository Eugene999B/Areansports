import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import {
  ApiClientError,
  fetchPublicTournament,
  type TournamentPublicDetail,
} from '../../src/api/client';
import { NoticeCard } from '../../src/components/NoticeCard';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { Screen } from '../../src/components/Screen';
import { StatusPill } from '../../src/components/StatusPill';
import { colors, radius, spacing } from '../../src/theme';

export default function TournamentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detail, setDetail] = useState<TournamentPublicDetail | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setMessage(null);
    try {
      setDetail(await fetchPublicTournament(id));
    } catch (error: unknown) {
      setMessage(
        error instanceof ApiClientError ? error.message : 'Tournament details could not load.',
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen>
      {loading ? <ActivityIndicator color={colors.primary} size="large" /> : null}
      {message ? (
        <NoticeCard title="Tournament unavailable" tone="danger">
          {message}
        </NoticeCard>
      ) : null}
      {!loading && !detail ? <PrimaryButton label="Try again" onPress={() => void load()} /> : null}
      {detail ? (
        <>
          <StatusPill
            label={detail.status.replaceAll('_', ' ')}
            tone={detail.status === 'PUBLISHED' ? 'success' : 'warning'}
          />
          <Text style={styles.title}>{detail.title}</Text>
          <Text style={styles.body}>{detail.description || 'No organizer description.'}</Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Competition</Text>
            <Text style={styles.line}>{detail.game.name}</Text>
            <Text style={styles.line}>
              {detail.platform} · {detail.region} · {detail.format.replaceAll('_', ' ')}
            </Text>
            <Text style={styles.line}>
              {detail.acceptedParticipants}/{detail.capacity} accepted participants
            </Text>
            <Text style={styles.line}>
              Registration: {new Date(detail.registrationOpensAt).toLocaleString()} –{' '}
              {new Date(detail.registrationClosesAt).toLocaleString()}
            </Text>
            <Text style={styles.line}>Starts {new Date(detail.startsAt).toLocaleString()}</Text>
          </View>

          {detail.cancellation ? (
            <NoticeCard title="Tournament cancelled" tone="danger">
              {detail.cancellation.reasonCode.replaceAll('_', ' ')} —{' '}
              {detail.cancellation.explanation}
            </NoticeCard>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Published rules · version {detail.ruleset.version}</Text>
            <Text selectable style={styles.rules}>
              {detail.ruleset.renderedRules}
            </Text>
            <Text selectable style={styles.digest}>
              SHA-256: {detail.ruleset.contentDigest}
            </Text>
          </View>

          <PrimaryButton disabled label="Registration arrives in AS-05" onPress={() => undefined} />
          <Text style={styles.notice}>
            ArenaSports does not pretend registration, fixtures, or result reporting are available
            before those audited slices are implemented.
          </Text>
        </>
      ) : null}
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
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  line: { color: colors.textMuted, fontSize: 15, lineHeight: 22 },
  rules: { color: colors.text, fontSize: 14, lineHeight: 22 },
  digest: { color: colors.accent, fontSize: 11, lineHeight: 17 },
  notice: { color: colors.textMuted, fontSize: 13, lineHeight: 20, textAlign: 'center' },
});
