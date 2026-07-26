import { Link, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../src/auth/AuthProvider';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { Screen } from '../src/components/Screen';
import { StatusPill } from '../src/components/StatusPill';
import { colors, radius, spacing } from '../src/theme';

export default function HomeScreen() {
  const { status, user } = useAuth();
  const signedIn = status === 'authenticated' && user;
  const canOrganize = Boolean(
    user?.roles.some((role) => role === 'ORGANIZER' || role === 'ADMINISTRATOR'),
  );

  return (
    <Screen>
      <View style={styles.brandRow}>
        <View style={styles.mark}>
          <Text style={styles.markText}>A</Text>
        </View>
        <Text style={styles.brand}>ArenaSports</Text>
        <StatusPill
          label={signedIn ? 'SIGNED IN' : 'FREE PILOT'}
          tone={signedIn ? 'success' : 'neutral'}
        />
      </View>

      <View style={styles.hero}>
        <Text style={styles.eyebrow}>COMPETE WITH PROOF</Text>
        <Text style={styles.title}>Your league. Your rivals. Fair results.</Text>
        <Text style={styles.subtitle}>
          Join mobile esports tournaments with clear fixtures, deadlines, evidence, standings, and
          decisions everyone can understand.
        </Text>
      </View>

      <PrimaryButton
        label="Find a tournament"
        accessibilityHint="Opens public tournament discovery"
        onPress={() => router.push('/tournaments')}
      />

      <Link href="/game-profiles/find" style={styles.secondaryLink}>
        Find a player's public game identity
      </Link>

      {signedIn ? (
        <>
          <Link href="/game-profiles" style={styles.secondaryLink}>
            Manage your eFootball or FC Mobile identity
          </Link>
          <Link href="/account" style={styles.secondaryLink}>
            Open @{user.handle}'s account
          </Link>
        </>
      ) : (
        <Link href="/auth/sign-in" style={styles.secondaryLink}>
          Sign in or create an account
        </Link>
      )}

      {canOrganize ? (
        <>
          <Link href="/organizer/tournaments" style={styles.secondaryLink}>
            Manage your tournaments
          </Link>
          <Link href="/create-tournament" style={styles.secondaryLink}>
            Create a free tournament
          </Link>
        </>
      ) : null}

      <View style={styles.trustCard}>
        <Text style={styles.cardTitle}>How ArenaSports protects competition</Text>
        <Text style={styles.cardLine}>• Published, versioned tournament rules</Text>
        <Text style={styles.cardLine}>• Opponent confirmation and private evidence</Text>
        <Text style={styles.cardLine}>• Audited disputes, forfeits, and corrections</Text>
        <Text style={styles.cardLine}>• No game passwords and no fake API claims</Text>
      </View>

      <Text style={styles.disclaimer}>
        Independent community platform. Not affiliated with Konami or EA.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  mark: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  markText: {
    color: colors.background,
    fontSize: 22,
    fontWeight: '900',
  },
  brand: {
    color: colors.text,
    flex: 1,
    fontSize: 20,
    fontWeight: '900',
  },
  hero: {
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  title: {
    color: colors.text,
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -1.3,
    lineHeight: 46,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 17,
    lineHeight: 26,
  },
  secondaryLink: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '800',
    padding: spacing.sm,
    textAlign: 'center',
  },
  trustCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.lg,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  cardLine: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  disclaimer: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 'auto',
    paddingTop: spacing.xl,
    textAlign: 'center',
  },
});
