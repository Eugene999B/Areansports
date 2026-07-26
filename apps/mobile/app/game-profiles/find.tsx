import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  createGameProfileOwnershipChallenge,
  fetchPublicGameProfiles,
  type PublicGameProfile,
} from '../../src/api/client';
import { useAuth } from '../../src/auth/AuthProvider';
import { NoticeCard } from '../../src/components/NoticeCard';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { Screen } from '../../src/components/Screen';
import { StatusPill } from '../../src/components/StatusPill';
import { TextField } from '../../src/components/TextField';
import { colors, radius, spacing } from '../../src/theme';

function verificationCopy(profile: PublicGameProfile): string {
  if (profile.verificationState === 'COMMUNITY_CONFIRMED') {
    return 'ArenaSports community-confirmed. This does not mean the game publisher verified it.';
  }
  if (profile.verificationState === 'AUTHORIZED_PROVIDER_VERIFIED') {
    return 'Verified through an authorised result-provider integration.';
  }
  return 'Unverified public username. Treat it as a player-supplied identity.';
}

export default function FindGameProfilesScreen() {
  const { status, session, user } = useAuth();
  const [handle, setHandle] = useState('');
  const [searchedHandle, setSearchedHandle] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<PublicGameProfile[]>([]);
  const [selected, setSelected] = useState<PublicGameProfile | null>(null);
  const [statement, setStatement] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const search = async () => {
    const normalizedHandle = handle.trim();
    if (!/^[A-Za-z0-9_]{3,24}$/.test(normalizedHandle)) {
      setError('Enter an ArenaSports handle using 3–24 letters, numbers, or underscores.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setSelected(null);
    try {
      const result = await fetchPublicGameProfiles(normalizedHandle);
      setProfiles(result);
      setSearchedHandle(normalizedHandle);
    } catch (searchError: unknown) {
      setError(searchError instanceof Error ? searchError.message : 'Player identities could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  const challenge = async () => {
    if (!selected || !session) return;
    if (statement.trim().length < 20) {
      setError('Explain the ownership concern in at least 20 characters.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await createGameProfileOwnershipChallenge(session.access_token, selected.id, statement.trim());
      setSuccess(
        'Ownership review opened. Support will review evidence; this does not automatically remove or punish the other player.',
      );
      setSelected(null);
      setStatement('');
    } catch (challengeError: unknown) {
      setError(
        challengeError instanceof Error
          ? challengeError.message
          : 'The ownership review could not be opened.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.eyebrow}>PLAYER IDENTITY LOOKUP</Text>
      <Text style={styles.title}>Find public game usernames by ArenaSports handle.</Text>
      <Text style={styles.body}>
        These are player-supplied public identities. A matching name is not proof of game-account ownership
        or publisher verification.
      </Text>

      {error ? (
        <NoticeCard title="Lookup needs attention" tone="danger">
          {error}
        </NoticeCard>
      ) : null}
      {success ? (
        <NoticeCard title="Review opened" tone="success">
          {success}
        </NoticeCard>
      ) : null}

      <TextField
        autoCapitalize="none"
        autoCorrect={false}
        editable={!loading}
        helpText="Use the player's ArenaSports handle, not their game password or email."
        label="ArenaSports handle"
        maxLength={24}
        onChangeText={setHandle}
        placeholder="arena_player"
        value={handle}
      />
      <PrimaryButton
        disabled={loading}
        label={loading ? 'Searching…' : 'Find public identities'}
        onPress={() => void search()}
      />

      {searchedHandle && profiles.length === 0 && !loading ? (
        <NoticeCard title="No public identities found">
          @{searchedHandle} may not exist, may have a private profile, or may have hidden all game identities.
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
            {profile.platform} · {profile.region}
          </Text>
          <Text style={styles.help}>{verificationCopy(profile)}</Text>
          {status === 'authenticated' && session ? (
            <Pressable
              accessibilityRole="button"
              disabled={user?.handle === searchedHandle}
              onPress={() => {
                setSelected(profile);
                setStatement('');
                setError(null);
                setSuccess(null);
              }}
            >
              <Text style={styles.challengeLink}>
                {user?.handle === searchedHandle ? 'This is your ArenaSports profile' : 'Challenge ownership'}
              </Text>
            </Pressable>
          ) : (
            <Link href="/auth/sign-in" style={styles.challengeLink}>
              Sign in to challenge ownership
            </Link>
          )}
        </View>
      ))}

      {selected ? (
        <View style={styles.challengeCard}>
          <Text style={styles.cardTitle}>Open an ownership review</Text>
          <Text style={styles.help}>
            Use this only when you reasonably believe “{selected.username}” belongs to you or is being used
            to impersonate you. Do not include a password, login code, government ID, or private account data.
          </Text>
          <TextField
            editable={!submitting}
            helpText="Support may ask both players for limited, safer proof. Opening a case is not a finding of guilt."
            label="What happened?"
            maxLength={1_000}
            multiline
            onChangeText={setStatement}
            placeholder="Explain why you believe this public game identity is yours…"
            value={statement}
          />
          <PrimaryButton
            disabled={submitting}
            label={submitting ? 'Opening review…' : 'Open ownership review'}
            onPress={() => void challenge()}
          />
          <Pressable accessibilityRole="button" onPress={() => setSelected(null)}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
        </View>
      ) : null}

      <Text style={styles.disclaimer}>
        ArenaSports is independent and is not affiliated with Konami or Electronic Arts.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { color: colors.accent, fontSize: 13, fontWeight: '900', letterSpacing: 1.3 },
  title: { color: colors.text, fontSize: 34, fontWeight: '900', lineHeight: 40 },
  body: { color: colors.textMuted, fontSize: 16, lineHeight: 24, marginBottom: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  challengeCard: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.warning,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  cardHeader: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cardTitle: { color: colors.text, flex: 1, fontSize: 18, fontWeight: '900' },
  username: { color: colors.primary, fontSize: 20, fontWeight: '900' },
  line: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  help: { color: colors.textMuted, fontSize: 13, lineHeight: 20 },
  challengeLink: { color: colors.primary, fontSize: 14, fontWeight: '800', paddingVertical: spacing.sm },
  cancel: { color: colors.primary, fontSize: 14, fontWeight: '800', padding: spacing.sm, textAlign: 'center' },
  disclaimer: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    paddingTop: spacing.md,
    textAlign: 'center',
  },
});
