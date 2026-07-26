import { Redirect, router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import {
  ApiClientError,
  createTournamentDraft,
  type GamePlatform,
  type TournamentFormat,
  type TournamentVisibility,
} from '../src/api/client';
import { createIdempotencyKey } from '../src/api/idempotency';
import { useAuth } from '../src/auth/AuthProvider';
import { NoticeCard } from '../src/components/NoticeCard';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { Screen } from '../src/components/Screen';
import { StatusPill } from '../src/components/StatusPill';
import { TextField } from '../src/components/TextField';
import { colors, radius, spacing } from '../src/theme';

function futureIso(days: number, hour: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(hour, 0, 0, 0);
  return date.toISOString();
}

type ChoiceRowProps<T extends string> = {
  label: string;
  values: readonly T[];
  value: T;
  onChange: (value: T) => void;
  disabled: boolean;
};

function ChoiceRow<T extends string>({
  label,
  values,
  value,
  onChange,
  disabled,
}: ChoiceRowProps<T>) {
  return (
    <View style={styles.choiceGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.choiceRow}>
        {values.map((choice) => (
          <Pressable
            key={choice}
            accessibilityRole="button"
            accessibilityState={{ selected: choice === value, disabled }}
            disabled={disabled}
            onPress={() => onChange(choice)}
            style={[styles.choice, choice === value ? styles.choiceSelected : undefined]}
          >
            <Text style={styles.choiceText}>{choice.replaceAll('_', ' ')}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function CreateTournamentScreen() {
  const { status, user, session } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [gameSlug, setGameSlug] = useState<'efootball' | 'fc-mobile'>('efootball');
  const [platform, setPlatform] = useState<GamePlatform>('ANDROID');
  const [region, setRegion] = useState('GH');
  const [visibility, setVisibility] = useState<TournamentVisibility>('PUBLIC');
  const [format, setFormat] = useState<TournamentFormat>('ROUND_ROBIN');
  const [capacity, setCapacity] = useState('16');
  const [registrationOpensAt, setRegistrationOpensAt] = useState(futureIso(1, 8));
  const [registrationClosesAt, setRegistrationClosesAt] = useState(futureIso(5, 20));
  const [startsAt, setStartsAt] = useState(futureIso(6, 18));
  const [matchMinutes, setMatchMinutes] = useState('6');
  const [evidenceRequired, setEvidenceRequired] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const createKey = useRef(createIdempotencyKey('tournament-create'));

  if (status === 'signedOut' || status === 'unavailable' || status === 'error') {
    return <Redirect href="/auth/sign-in" />;
  }
  if (status === 'needsProfile') return <Redirect href="/auth/profile" />;

  const canOrganize = Boolean(
    user?.roles.some((role) => role === 'ORGANIZER' || role === 'ADMINISTRATOR'),
  );
  if (status === 'authenticated' && !canOrganize) {
    return (
      <Screen>
        <StatusPill label="ORGANIZER ROLE REQUIRED" tone="warning" />
        <Text style={styles.title}>Your account is not an organizer yet.</Text>
        <NoticeCard title="Pilot access">
          Organizer access is assigned separately through audited platform operations. Ordinary
          player accounts never receive organizer powers automatically.
        </NoticeCard>
        <PrimaryButton label="Open my account" onPress={() => router.replace('/account')} />
      </Screen>
    );
  }

  const submit = async () => {
    if (!session) return;
    const parsedCapacity = Number(capacity);
    const parsedMatchMinutes = Number(matchMinutes);
    if (!title.trim()) {
      setMessage('Enter a tournament title.');
      return;
    }
    if (!Number.isInteger(parsedCapacity) || parsedCapacity < 2) {
      setMessage('Capacity must be a whole number of at least 2.');
      return;
    }
    if (!Number.isInteger(parsedMatchMinutes)) {
      setMessage('Match length must be a whole number.');
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const tournament = await createTournamentDraft(
        session.access_token,
        {
          title: title.trim(),
          description: description.trim(),
          gameSlug,
          platform,
          region: region.trim().toLocaleUpperCase('en-US'),
          timezone: user?.timezone ?? 'Africa/Accra',
          visibility,
          format,
          capacity: parsedCapacity,
          registrationOpensAt: registrationOpensAt.trim(),
          registrationClosesAt: registrationClosesAt.trim(),
          startsAt: startsAt.trim(),
          rules: {
            match: { matchMinutes: parsedMatchMinutes },
            operations: { evidenceRequired },
          },
        },
        createKey.current,
      );
      createKey.current = createIdempotencyKey('tournament-create');
      router.replace({ pathname: '/organizer/tournaments/[id]', params: { id: tournament.id } });
    } catch (error: unknown) {
      setMessage(
        error instanceof ApiClientError ? error.message : 'The draft could not be created.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <StatusPill label="FREE TOURNAMENT" tone="success" />
      <Text style={styles.title}>Create a trustworthy draft.</Text>
      <Text style={styles.body}>
        Drafts are private. Review the server-rendered rules before publication. Published rules
        cannot be silently edited.
      </Text>

      {message ? (
        <NoticeCard title="Draft needs attention" tone="danger">
          {message}
        </NoticeCard>
      ) : null}

      <TextField
        editable={!submitting}
        label="Tournament title"
        maxLength={100}
        onChangeText={setTitle}
        placeholder="Accra Weekend League"
        value={title}
      />
      <TextField
        editable={!submitting}
        label="Description"
        maxLength={4000}
        multiline
        onChangeText={setDescription}
        placeholder="Explain who the competition is for."
        value={description}
      />
      <ChoiceRow
        disabled={submitting}
        label="Game"
        onChange={setGameSlug}
        value={gameSlug}
        values={['efootball', 'fc-mobile'] as const}
      />
      <ChoiceRow
        disabled={submitting}
        label="Platform"
        onChange={setPlatform}
        value={platform}
        values={['ANDROID', 'IOS'] as const}
      />
      <ChoiceRow
        disabled={submitting}
        label="Visibility"
        onChange={setVisibility}
        value={visibility}
        values={['PUBLIC', 'UNLISTED', 'INVITE_ONLY', 'APPROVAL_REQUIRED'] as const}
      />
      <ChoiceRow
        disabled={submitting}
        label="Format"
        onChange={setFormat}
        value={format}
        values={['ROUND_ROBIN', 'SINGLE_ELIMINATION'] as const}
      />
      <TextField
        autoCapitalize="characters"
        editable={!submitting}
        label="Region"
        maxLength={16}
        onChangeText={setRegion}
        value={region}
      />
      <TextField
        editable={!submitting}
        keyboardType="number-pad"
        label="Capacity"
        onChangeText={setCapacity}
        value={capacity}
      />
      <TextField
        autoCapitalize="none"
        editable={!submitting}
        helpText="RFC 3339 time with timezone offset."
        label="Registration opens"
        onChangeText={setRegistrationOpensAt}
        value={registrationOpensAt}
      />
      <TextField
        autoCapitalize="none"
        editable={!submitting}
        label="Registration closes"
        onChangeText={setRegistrationClosesAt}
        value={registrationClosesAt}
      />
      <TextField
        autoCapitalize="none"
        editable={!submitting}
        label="Tournament starts"
        onChangeText={setStartsAt}
        value={startsAt}
      />
      <TextField
        editable={!submitting}
        helpText="Allowed range: 4–12 minutes."
        keyboardType="number-pad"
        label="In-game match length"
        onChangeText={setMatchMinutes}
        value={matchMinutes}
      />
      <View style={styles.switchRow}>
        <View style={styles.switchCopy}>
          <Text style={styles.label}>Require private result evidence</Text>
          <Text style={styles.help}>Evidence is never made a permanent public URL.</Text>
        </View>
        <Switch
          disabled={submitting}
          onValueChange={setEvidenceRequired}
          value={evidenceRequired}
        />
      </View>

      <NoticeCard title="Competition boundary">
        ArenaSports does not request game passwords and this free tournament has no entry fee,
        wager, wallet, prize custody, or cash settlement.
      </NoticeCard>
      <PrimaryButton
        disabled={submitting || status === 'loading'}
        label={submitting ? 'Creating private draft…' : 'Create private draft'}
        onPress={() => void submit()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 34, fontWeight: '900', lineHeight: 40 },
  body: { color: colors.textMuted, fontSize: 16, lineHeight: 24 },
  label: { color: colors.text, fontSize: 14, fontWeight: '800' },
  help: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  choiceGroup: { gap: spacing.xs },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choice: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  choiceSelected: { borderColor: colors.primary, backgroundColor: colors.surfaceRaised },
  choiceText: { color: colors.text, fontSize: 13, fontWeight: '700' },
  switchRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  switchCopy: { flex: 1, gap: spacing.xs },
});
