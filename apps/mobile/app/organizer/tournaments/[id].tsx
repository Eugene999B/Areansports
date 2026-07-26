import { Redirect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  ApiClientError,
  cancelTournament,
  fetchMyTournament,
  fetchTournamentPreview,
  publishTournament,
  updateTournamentDraft,
  type TournamentCancellationReason,
  type TournamentOwnerDetail,
  type TournamentPreview,
  type TournamentVisibility,
} from '../../../src/api/client';
import { createIdempotencyKey } from '../../../src/api/idempotency';
import { useAuth } from '../../../src/auth/AuthProvider';
import { NoticeCard } from '../../../src/components/NoticeCard';
import { PrimaryButton } from '../../../src/components/PrimaryButton';
import { Screen } from '../../../src/components/Screen';
import { StatusPill } from '../../../src/components/StatusPill';
import { TextField } from '../../../src/components/TextField';
import { colors, radius, spacing } from '../../../src/theme';

const cancellationReasons: readonly TournamentCancellationReason[] = [
  'ORGANIZER_UNAVAILABLE',
  'INSUFFICIENT_PARTICIPANTS',
  'SCHEDULE_CONFLICT',
  'TECHNICAL_ISSUE',
  'SAFETY_CONCERN',
  'OTHER',
];

export default function OrganizerTournamentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { status, user, session } = useAuth();
  const [detail, setDetail] = useState<TournamentOwnerDetail | null>(null);
  const [preview, setPreview] = useState<TournamentPreview | null>(null);
  const [title, setTitle] = useState('');
  const [capacity, setCapacity] = useState('');
  const [matchMinutes, setMatchMinutes] = useState('');
  const [visibility, setVisibility] = useState<TournamentVisibility>('PUBLIC');
  const [cancelReason, setCancelReason] =
    useState<TournamentCancellationReason>('ORGANIZER_UNAVAILABLE');
  const [cancelExplanation, setCancelExplanation] = useState('');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const publishKey = useRef(createIdempotencyKey('tournament-publish'));
  const cancelKey = useRef(createIdempotencyKey('tournament-cancel'));

  const sync = useCallback((next: TournamentOwnerDetail) => {
    setDetail(next);
    setTitle(next.title);
    setCapacity(String(next.capacity));
    setMatchMinutes(String(next.ruleset.rules.match.matchMinutes));
    setVisibility(next.visibility);
  }, []);

  const load = useCallback(async () => {
    if (!session || !id) return;
    setLoading(true);
    setMessage(null);
    try {
      const [nextDetail, nextPreview] = await Promise.all([
        fetchMyTournament(session.access_token, id),
        fetchTournamentPreview(session.access_token, id),
      ]);
      sync(nextDetail);
      setPreview(nextPreview);
    } catch (error: unknown) {
      setMessage(
        error instanceof ApiClientError ? error.message : 'The tournament could not load.',
      );
    } finally {
      setLoading(false);
    }
  }, [id, session, sync]);

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

  const refreshPreview = async (next: TournamentOwnerDetail) => {
    if (!session) return;
    sync(next);
    setPreview(await fetchTournamentPreview(session.access_token, next.id));
  };

  const save = async () => {
    if (!session || !detail) return;
    const parsedCapacity = Number(capacity);
    const parsedMatchMinutes = Number(matchMinutes);
    if (!Number.isInteger(parsedCapacity) || !Number.isInteger(parsedMatchMinutes)) {
      setMessage('Capacity and match length must be whole numbers.');
      return;
    }
    setWorking(true);
    setMessage(null);
    try {
      const next = await updateTournamentDraft(session.access_token, detail.id, {
        version: detail.version,
        title: title.trim(),
        capacity: parsedCapacity,
        visibility,
        rules: { match: { matchMinutes: parsedMatchMinutes } },
      });
      await refreshPreview(next);
    } catch (error: unknown) {
      setMessage(error instanceof ApiClientError ? error.message : 'The draft could not be saved.');
    } finally {
      setWorking(false);
    }
  };

  const publish = async () => {
    if (!session || !detail) return;
    setWorking(true);
    setMessage(null);
    try {
      const next = await publishTournament(
        session.access_token,
        detail.id,
        detail.version,
        publishKey.current,
      );
      publishKey.current = createIdempotencyKey('tournament-publish');
      await refreshPreview(next);
    } catch (error: unknown) {
      setMessage(
        error instanceof ApiClientError ? error.message : 'Publication could not complete.',
      );
    } finally {
      setWorking(false);
    }
  };

  const cancel = async () => {
    if (!session || !detail) return;
    if (cancelExplanation.trim().length < 10) {
      setMessage('Explain the cancellation in at least 10 characters.');
      return;
    }
    setWorking(true);
    setMessage(null);
    try {
      const next = await cancelTournament(
        session.access_token,
        detail.id,
        {
          version: detail.version,
          reasonCode: cancelReason,
          explanation: cancelExplanation.trim(),
        },
        cancelKey.current,
      );
      cancelKey.current = createIdempotencyKey('tournament-cancel');
      await refreshPreview(next);
    } catch (error: unknown) {
      setMessage(
        error instanceof ApiClientError ? error.message : 'Cancellation could not complete.',
      );
    } finally {
      setWorking(false);
    }
  };

  return (
    <Screen>
      {loading ? (
        <NoticeCard title="Loading tournament">Loading the owner record…</NoticeCard>
      ) : null}
      {message ? (
        <NoticeCard title="Tournament needs attention" tone="danger">
          {message}
        </NoticeCard>
      ) : null}
      {!detail ? (
        <PrimaryButton disabled={loading} label="Try again" onPress={() => void load()} />
      ) : (
        <>
          <View style={styles.headerRow}>
            <StatusPill
              label={detail.status.replaceAll('_', ' ')}
              tone={detail.status === 'PUBLISHED' ? 'success' : 'neutral'}
            />
            <Text style={styles.version}>Tournament version {detail.version}</Text>
          </View>
          <Text style={styles.title}>{detail.title}</Text>
          <Text style={styles.meta}>
            {detail.game.name} · {detail.platform} · {detail.region} ·{' '}
            {detail.format.replaceAll('_', ' ')}
          </Text>
          <Text style={styles.meta}>Public link: /tournaments/{detail.slug}</Text>

          {detail.status === 'DRAFT' ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Edit private draft</Text>
              <TextField
                editable={!working}
                label="Title"
                maxLength={100}
                onChangeText={setTitle}
                value={title}
              />
              <TextField
                editable={!working}
                keyboardType="number-pad"
                label="Capacity"
                onChangeText={setCapacity}
                value={capacity}
              />
              <TextField
                editable={!working}
                keyboardType="number-pad"
                label="In-game match length"
                onChangeText={setMatchMinutes}
                value={matchMinutes}
              />
              <Text style={styles.label}>Visibility</Text>
              <View style={styles.choiceRow}>
                {(['PUBLIC', 'UNLISTED', 'INVITE_ONLY', 'APPROVAL_REQUIRED'] as const).map(
                  (choice) => (
                    <Pressable
                      key={choice}
                      disabled={working}
                      onPress={() => setVisibility(choice)}
                      style={[
                        styles.choice,
                        visibility === choice ? styles.choiceSelected : undefined,
                      ]}
                    >
                      <Text style={styles.choiceText}>{choice.replaceAll('_', ' ')}</Text>
                    </Pressable>
                  ),
                )}
              </View>
              <PrimaryButton
                disabled={working}
                label={working ? 'Saving…' : 'Save draft changes'}
                onPress={() => void save()}
              />
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Exact rules preview</Text>
            <Text selectable style={styles.rules}>
              {detail.ruleset.renderedRules}
            </Text>
            <Text selectable style={styles.digest}>
              SHA-256: {detail.ruleset.contentDigest}
            </Text>
            {preview?.issues.map((issue) => (
              <Text key={issue} style={styles.issue}>
                • {issue}
              </Text>
            ))}
            {detail.status === 'DRAFT' ? (
              <PrimaryButton
                disabled={working || !preview?.publishable}
                label={working ? 'Publishing…' : 'Publish immutable rules'}
                onPress={() => void publish()}
              />
            ) : null}
          </View>

          {detail.cancellation ? (
            <NoticeCard title="Tournament cancelled" tone="danger">
              {detail.cancellation.reasonCode.replaceAll('_', ' ')} —{' '}
              {detail.cancellation.explanation}
            </NoticeCard>
          ) : detail.status === 'DRAFT' || detail.status === 'PUBLISHED' ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Cancel with a visible reason</Text>
              <View style={styles.choiceRow}>
                {cancellationReasons.map((reason) => (
                  <Pressable
                    key={reason}
                    disabled={working}
                    onPress={() => setCancelReason(reason)}
                    style={[
                      styles.choice,
                      cancelReason === reason ? styles.choiceSelected : undefined,
                    ]}
                  >
                    <Text style={styles.choiceText}>{reason.replaceAll('_', ' ')}</Text>
                  </Pressable>
                ))}
              </View>
              <TextField
                editable={!working}
                label="Cancellation explanation"
                maxLength={1000}
                multiline
                onChangeText={setCancelExplanation}
                placeholder="Explain what changed and what participants should know."
                value={cancelExplanation}
              />
              <PrimaryButton
                disabled={working}
                label={working ? 'Cancelling…' : 'Cancel tournament'}
                onPress={() => void cancel()}
              />
            </View>
          ) : null}

          <NoticeCard title="What cannot change">
            Published rules are immutable. Registration, waitlists, participant communication, and
            fixtures are implemented in later slices and are not simulated here.
          </NoticeCard>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  version: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  title: { color: colors.text, fontSize: 32, fontWeight: '900' },
  meta: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  label: { color: colors.text, fontSize: 14, fontWeight: '800' },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choice: {
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  choiceSelected: { borderColor: colors.primary, backgroundColor: colors.surfaceRaised },
  choiceText: { color: colors.text, fontSize: 11, fontWeight: '700' },
  rules: { color: colors.text, fontSize: 14, lineHeight: 22 },
  digest: { color: colors.accent, fontSize: 11, lineHeight: 17 },
  issue: { color: colors.warning, fontSize: 13, lineHeight: 20 },
});
