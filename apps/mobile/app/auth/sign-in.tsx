import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useAuth } from '../../src/auth/AuthProvider';
import { NoticeCard } from '../../src/components/NoticeCard';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { Screen } from '../../src/components/Screen';
import { TextField } from '../../src/components/TextField';
import { colors, spacing } from '../../src/theme';

export default function SignInScreen() {
  const { status, errorMessage, sendEmailOtp } = useAuth();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (status === 'authenticated') return <Redirect href="/account" />;
  if (status === 'needsProfile') return <Redirect href="/auth/profile" />;

  const submit = async () => {
    const normalizedEmail = email.trim().toLocaleLowerCase('en-US');
    if (!normalizedEmail.includes('@')) {
      setFormError('Enter a valid email address.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await sendEmailOtp(normalizedEmail);
      router.push({ pathname: '/auth/verify', params: { email: normalizedEmail } });
    } catch (error: unknown) {
      setFormError(error instanceof Error ? error.message : 'The sign-in code could not be sent.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.eyebrow}>SECURE ACCESS</Text>
      <Text style={styles.title}>Sign in without a password.</Text>
      <Text style={styles.body}>
        ArenaSports sends a one-time code to your verified email. We never ask for your eFootball or
        FC Mobile password.
      </Text>

      {status === 'unavailable' ? (
        <NoticeCard title="Authentication is not configured" tone="danger">
          This build needs its public Supabase project URL and publishable key before sign-in can be
          used.
        </NoticeCard>
      ) : null}
      {errorMessage && status === 'error' ? (
        <NoticeCard title="Your session needs attention" tone="danger">
          {errorMessage}
        </NoticeCard>
      ) : null}

      <TextField
        autoCapitalize="none"
        autoComplete="email"
        editable={!submitting && status !== 'unavailable'}
        error={formError}
        keyboardType="email-address"
        label="Email address"
        onChangeText={setEmail}
        onSubmitEditing={() => void submit()}
        placeholder="you@example.com"
        returnKeyType="send"
        textContentType="emailAddress"
        value={email}
      />

      <PrimaryButton
        disabled={submitting || status === 'unavailable'}
        label={submitting ? 'Sending code…' : 'Send sign-in code'}
        onPress={() => void submit()}
      />

      <Pressable accessibilityRole="link" onPress={() => router.replace('/')}>
        <Text style={styles.link}>Return to public home</Text>
      </Pressable>

      <Text style={styles.privacy}>
        The pilot starts with email only. Phone sign-in remains disabled until delivery, abuse,
        cost, and privacy controls are approved.
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
    fontSize: 36,
    fontWeight: '900',
    lineHeight: 42,
  },
  body: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  link: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '800',
    padding: spacing.sm,
    textAlign: 'center',
  },
  privacy: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 'auto',
    paddingTop: spacing.xl,
    textAlign: 'center',
  },
});
