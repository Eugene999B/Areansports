import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useAuth } from '../../src/auth/AuthProvider';
import { NoticeCard } from '../../src/components/NoticeCard';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { Screen } from '../../src/components/Screen';
import { TextField } from '../../src/components/TextField';
import { colors, spacing } from '../../src/theme';

export default function ProfileOnboardingScreen() {
  const { status, errorMessage, completeProfile } = useAuth();
  const [handle, setHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [countryCode, setCountryCode] = useState('GH');
  const [timezone, setTimezone] = useState('Africa/Accra');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (status === 'signedOut' || status === 'unavailable') return <Redirect href="/auth/sign-in" />;
  if (status === 'authenticated') return <Redirect href="/account" />;

  const submit = async () => {
    const normalizedHandle = handle.trim();
    if (!/^[A-Za-z0-9_]{3,24}$/.test(normalizedHandle)) {
      setFormError('Your handle must be 3–24 letters, numbers, or underscores.');
      return;
    }
    if (!displayName.trim()) {
      setFormError('Enter the name other players should see.');
      return;
    }
    if (!/^[A-Za-z]{2}$/.test(countryCode.trim())) {
      setFormError('Use a two-letter country code, such as GH.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await completeProfile({
        handle: normalizedHandle,
        displayName: displayName.trim(),
        countryCode: countryCode.trim().toLocaleUpperCase('en-US'),
        timezone: timezone.trim(),
        profileVisible: true,
      });
      router.replace('/account');
    } catch (error: unknown) {
      setFormError(error instanceof Error ? error.message : 'Your profile could not be created.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.eyebrow}>CREATE YOUR PLAYER PROFILE</Text>
      <Text style={styles.title}>Choose how ArenaSports knows you.</Text>
      <Text style={styles.body}>
        This profile is separate from your public eFootball or FC Mobile username. Game profiles are
        linked later and never require a game password.
      </Text>

      {errorMessage ? (
        <NoticeCard title="Account setup needs attention" tone="danger">
          {errorMessage}
        </NoticeCard>
      ) : null}
      {formError ? (
        <NoticeCard title="Check your profile" tone="danger">
          {formError}
        </NoticeCard>
      ) : null}

      <TextField
        autoCapitalize="none"
        autoCorrect={false}
        editable={!submitting}
        helpText="Unique, 3–24 characters. Letters, numbers, and underscores only."
        label="Public handle"
        maxLength={24}
        onChangeText={setHandle}
        placeholder="arena_player"
        value={handle}
      />
      <TextField
        editable={!submitting}
        label="Display name"
        maxLength={60}
        onChangeText={setDisplayName}
        placeholder="Arena Player"
        value={displayName}
      />
      <TextField
        autoCapitalize="characters"
        editable={!submitting}
        helpText="Two-letter country code. Ghana is GH."
        label="Country code"
        maxLength={2}
        onChangeText={setCountryCode}
        value={countryCode}
      />
      <TextField
        autoCapitalize="none"
        editable={!submitting}
        helpText="Used only to display tournament deadlines correctly."
        label="Timezone"
        onChangeText={setTimezone}
        value={timezone}
      />

      <PrimaryButton
        disabled={submitting || status === 'loading'}
        label={submitting ? 'Creating profile…' : 'Create ArenaSports profile'}
        onPress={() => void submit()}
      />

      <Text style={styles.privacy}>
        Do not enter a game password, government ID, school, or precise location in your profile.
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
  body: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  privacy: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    paddingTop: spacing.md,
    textAlign: 'center',
  },
});
