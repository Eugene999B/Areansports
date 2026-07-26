import { Redirect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import {
  createGameProfile,
  fetchGameCatalogue,
  fetchMyGameProfiles,
  updateGameProfile,
  type GameCatalogEntry,
  type GamePlatform,
  type GameProfile,
} from '../../src/api/client';
import { useAuth } from '../../src/auth/AuthProvider';
import { NoticeCard } from '../../src/components/NoticeCard';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { Screen } from '../../src/components/Screen';
import { StatusPill } from '../../src/components/StatusPill';
import { TextField } from '../../src/components/TextField';
import { colors, radius, spacing } from '../../src/theme';

function verificationCopy(profile: GameProfile): string {
  if (profile.verificationState === 'COMMUNITY_CONFIRMED') {
    return 'Community-confirmed through an ArenaSports review. This is not publisher verification.';
  }
  if (profile.verificationState === 'AUTHORIZED_PROVIDER_VERIFIED') {
    return 'Verified through an authorised result-provider integration.';
  }
  return 'Unverified public username. ArenaSports has not confirmed ownership with the game publisher.';
}

export default function GameProfilesScreen() {
  const { status, session, user, refresh } = useAuth();
  const [games, setGames] = useState<GameCatalogEntry[]>([]);
  const [profiles, setProfiles] = useState<GameProfile[]>([]);
  const [gameSlug, setGameSlug] = useState('efootball');
  const [platform, setPlatform] = useState<GamePlatform>('ANDROID');
  const [region, setRegion] = useState('GH');
  const [username, setUsername] = useState('');
  const [visible, setVisible] = useState(true);
  const [editing, setEditing] = useState<GameProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const [nextGames, nextProfiles] = await Promise.all([
        fetchGameCatalogue(),
        fetchMyGameProfiles(session.access_token),
      ]);
      setGames(nextGames);
      setProfiles(nextProfiles);
      if (!editing && nextGames.length > 0 && !nextGames.some((game) => game.slug === gameSlug)) {
        setGameSlug(nextGames[0]?.slug ?? 'efootball');
      }
    } catch (loadError: unknown) {
      setError(
        loadError instanceof Error ? loadError.message : 'Game identities could not be loaded.',
      );
    } finally {
      setLoading(false);
    }
  }, [editing, gameSlug, session]);

  useEffect(() => {
    if (status === 'authenticated') void load();
  }, [load, status]);

  if (status === 'signedOut' || status === 'unavailable') return <Redirect href="/auth/sign-in" />;
  if (status === 'needsProfile') return <Redirect href="/auth/profile" />;

  if (!session || !user) {
    return (
      <Screen>
        <NoticeCard title="Checking your account">Confirming your secure session…</NoticeCard>
        {status === 'error' ? (
          <PrimaryButton label="Retry account check" onPress={() => void refresh()} />
        ) : null}
      </Screen>
    );
  }

  const resetForm = () => {
    setEditing(null);
    setGameSlug(games[0]?.slug ?? 'efootball');
    setPlatform('ANDROID');
    setRegion(user.countryCode);
    setUsername('');
    setVisible(true);
  };

  const beginEdit = (profile: GameProfile) => {
    setEditing(profile);
    setGameSlug(profile.game.slug);
    setPlatform(profile.platform);
    setRegion(profile.region);
    setUsername(profile.username);
    setVisible(profile.visible);
    setError(null);
  };

  const submit = async () => {
    if (!username.trim()) {
      setError('Enter the public username shown inside the game.');
      return;
    }
    if (!region.trim()) {
      setError('Enter the game region, such as GH or GLOBAL.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      if (editing) {
        await updateGameProfile(session.access_token, editing.id, {
          platform,
          region,
          username,
          visible,
          version: editing.version,
        });
      } else {
        await createGameProfile(session.access_token, {
          gameSlug,
          platform,
          region,
          username,
          visible,
        });
      }
      resetForm();
      await load();
    } catch (submitError: unknown) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'The game identity could not be saved.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.eyebrow}>PUBLIC GAME IDENTITIES</Text>
      <Text style={styles.title}>Link how opponents find you in-game.</Text>
      <Text style={styles.body}>
        Enter only the public username visible in eFootball or FC Mobile. ArenaSports never needs
        your game password, login code, account cookie, or recovery details.
      </Text>

      {error ? (
        <NoticeCard title="Game identity needs attention" tone="danger">
          {error}
        </NoticeCard>
      ) : null}

      <View style={styles.choiceSection}>
        <Text style={styles.label}>Game</Text>
        <View style={styles.choiceRow}>
          {games.map((game) => (
            <Pressable
              key={game.id}
              accessibilityRole="button"
              disabled={Boolean(editing) || submitting}
              onPress={() => setGameSlug(game.slug)}
              style={[styles.choice, gameSlug === game.slug ? styles.choiceSelected : undefined]}
            >
              <Text style={styles.choiceText}>{game.name}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.choiceSection}>
        <Text style={styles.label}>Mobile platform</Text>
        <View style={styles.choiceRow}>
          {(['ANDROID', 'IOS'] as const).map((value) => (
            <Pressable
              key={value}
              accessibilityRole="button"
              disabled={submitting}
              onPress={() => setPlatform(value)}
              style={[styles.choice, platform === value ? styles.choiceSelected : undefined]}
            >
              <Text style={styles.choiceText}>{value === 'IOS' ? 'iPhone / iPad' : 'Android'}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <TextField
        autoCapitalize="characters"
        editable={!submitting}
        helpText="Use the region displayed by the game or tournament community, such as GH or GLOBAL."
        label="Game region"
        maxLength={16}
        onChangeText={setRegion}
        value={region}
      />
      <TextField
        autoCapitalize="none"
        autoCorrect={false}
        editable={!submitting}
        helpText="Public username only. Never enter a password, email login, or recovery code."
        label="Public game username"
        maxLength={32}
        onChangeText={setUsername}
        placeholder="Eugene FC"
        value={username}
      />

      <View style={styles.switchRow}>
        <View style={styles.switchCopy}>
          <Text style={styles.label}>Show publicly</Text>
          <Text style={styles.help}>Hidden identities remain available only in your account.</Text>
        </View>
        <Switch value={visible} onValueChange={setVisible} disabled={submitting} />
      </View>

      <PrimaryButton
        disabled={submitting || loading || games.length === 0}
        label={submitting ? 'Saving…' : editing ? 'Save identity changes' : 'Link public identity'}
        onPress={() => void submit()}
      />
      {editing ? (
        <Pressable accessibilityRole="button" onPress={resetForm}>
          <Text style={styles.cancel}>Cancel editing</Text>
        </Pressable>
      ) : null}

      <Text style={styles.sectionTitle}>Your linked identities</Text>
      {profiles.length === 0 && !loading ? (
        <NoticeCard title="No game identity linked yet">
          Link one public username before registering for a tournament that requires it.
        </NoticeCard>
      ) : null}

      {profiles.map((profile) => (
        <View key={profile.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{profile.game.name}</Text>
            <StatusPill
              label={profile.verificationState.replaceAll('_', ' ')}
              tone={profile.verificationState === 'UNVERIFIED' ? 'warning' : 'success'}
            />
          </View>
          <Text style={styles.username}>{profile.username}</Text>
          <Text style={styles.line}>
            {profile.platform} · {profile.region} · {profile.visible ? 'Public' : 'Hidden'}
          </Text>
          <Text style={styles.help}>{verificationCopy(profile)}</Text>
          {profile.openOwnershipChallengeCount > 0 ? (
            <NoticeCard title="Ownership review open">
              Support will review the challenge. The profile remains labelled accurately during
              review.
            </NoticeCard>
          ) : null}
          <Pressable accessibilityRole="button" onPress={() => beginEdit(profile)}>
            <Text style={styles.edit}>Edit this identity</Text>
          </Pressable>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { color: colors.accent, fontSize: 13, fontWeight: '900', letterSpacing: 1.3 },
  title: { color: colors.text, fontSize: 34, fontWeight: '900', lineHeight: 40 },
  body: { color: colors.textMuted, fontSize: 16, lineHeight: 24, marginBottom: spacing.sm },
  choiceSection: { gap: spacing.xs },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choice: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  choiceSelected: { borderColor: colors.primary },
  choiceText: { color: colors.text, fontSize: 14, fontWeight: '800' },
  label: { color: colors.text, fontSize: 14, fontWeight: '800' },
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
  help: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  cancel: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
    padding: spacing.sm,
    textAlign: 'center',
  },
  sectionTitle: { color: colors.text, fontSize: 22, fontWeight: '900', marginTop: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  cardHeader: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cardTitle: { color: colors.text, flex: 1, fontSize: 18, fontWeight: '900' },
  username: { color: colors.primary, fontSize: 19, fontWeight: '900' },
  line: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  edit: { color: colors.primary, fontSize: 14, fontWeight: '800', paddingVertical: spacing.sm },
});
