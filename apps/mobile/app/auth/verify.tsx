import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useAuth } from '../../src/auth/AuthProvider';
import { NoticeCard } from '../../src/components/NoticeCard';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { Screen } from '../../src/components/Screen';
import { TextField } from '../../src/components/TextField';
import { colors, spacing } from '../../src/theme';

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ email?: string | string[] }>();
  const email = useMemo(
    () => (Array.isArray(params.email) ? params.email[0] : params.email)?.trim() ?? '',
    [params.email],
  );
  const { status, verifyEmailOtp, sendEmailOtp } = useAuth();
  const [token, setToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  if (!email) return <Redirect href="/auth/sign-in" />;
  if (status === 'authenticated') return <Redirect href="/account" />;
  if (status === 'needsProfile') return <Redirect href="/auth/profile" />;

  const verify = async () => {
    if (token.trim().length < 6) {
      setFormError('Enter the complete code from your email.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    setMessage(null);
    try {
      const destination = await verifyEmailOtp(email, token);
      router.replace(destination === 'needsProfile' ? '/auth/profile' : '/account');
    } catch (error: unknown) {
      setFormError(error instanceof Error ? error.message : 'The code could not be verified.');
    } finally {
      setSubmitting(false);
    }
  };

  const resend = async () => {
    setResending(true);
    setFormError(null);
    setMessage(null);
    try {
      await sendEmailOtp(email);
      setMessage('A new code has been sent. Only the newest code may work.');
    } catch (error: unknown) {
      setFormError(error instanceof Error ? error.message : 'A new code could not be sent.');
    } finally {
      setResending(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.eyebrow}>CHECK YOUR EMAIL</Text>
      <Text style={styles.title}>Enter your one-time code.</Text>
      <Text style={styles.body}>
        We sent the code to <Text style={styles.email}>{email}</Text>. The code expires and cannot
        be used as a permanent password.
      </Text>

      {message ? (
        <NoticeCard title="Code sent" tone="success">
          {message}
        </NoticeCard>
      ) : null}

      <TextField
        autoComplete="one-time-code"
        editable={!submitting}
        error={formError}
        keyboardType="number-pad"
        label="One-time code"
        maxLength={8}
        onChangeText={(value) => setToken(value.replace(/\D/g, ''))}
        onSubmitEditing={() => void verify()}
        placeholder="123456"
        returnKeyType="done"
        textContentType="oneTimeCode"
        value={token}
      />

      <PrimaryButton
        disabled={submitting || resending}
        label={submitting ? 'Checking code…' : 'Continue'}
        onPress={() => void verify()}
      />

      <Pressable
        accessibilityRole="button"
        disabled={submitting || resending}
        onPress={() => void resend()}
      >
        <Text style={styles.link}>{resending ? 'Sending another code…' : 'Send another code'}</Text>
      </Pressable>

      <Pressable accessibilityRole="link" onPress={() => router.replace('/auth/sign-in')}>
        <Text style={styles.link}>Use a different email</Text>
      </Pressable>
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
  email: {
    color: colors.text,
    fontWeight: '800',
  },
  link: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '800',
    padding: spacing.sm,
    textAlign: 'center',
  },
});
