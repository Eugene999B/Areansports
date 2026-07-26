import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../src/auth/AuthProvider';
import { NoticeCard } from '../src/components/NoticeCard';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { Screen } from '../src/components/Screen';
import { StatusPill } from '../src/components/StatusPill';
import { colors, radius, spacing } from '../src/theme';

export default function CreateTournamentScreen() {
  const { status, user } = useAuth();

  if (status === 'loading') {
    return (
      <Screen>
        <NoticeCard title="Checking organizer access">Confirming your ArenaSports role…</NoticeCard>
      </Screen>
    );
  }

  if (status === 'signedOut' || status === 'unavailable' || status === 'error') {
    return (
      <Screen>
        <StatusPill label="SIGN-IN REQUIRED" tone="warning" />
        <Text style={styles.title}>Organizer actions require a secure account.</Text>
        <Text style={styles.body}>
          Public tournament discovery stays open, but creating or changing a competition requires an
          authenticated ArenaSports identity and an assigned organizer role.
        </Text>
        <PrimaryButton label="Sign in" onPress={() => router.replace('/auth/sign-in')} />
        <PrimaryButton label="Return home" onPress={() => router.replace('/')} />
      </Screen>
    );
  }

  if (status === 'needsProfile') {
    return (
      <Screen>
        <StatusPill label="PROFILE REQUIRED" tone="warning" />
        <Text style={styles.title}>Complete your player profile first.</Text>
        <Text style={styles.body}>
          Your public handle, country, and timezone are required before roles or tournament ownership
          can be assigned safely.
        </Text>
        <PrimaryButton label="Create profile" onPress={() => router.replace('/auth/profile')} />
      </Screen>
    );
  }

  const canOrganize = Boolean(
    user?.roles.some((role) => role === 'ORGANIZER' || role === 'ADMINISTRATOR'),
  );

  if (!canOrganize) {
    return (
      <Screen>
        <StatusPill label="ORGANIZER ROLE REQUIRED" tone="warning" />
        <Text style={styles.title}>Your account is not an organizer yet.</Text>
        <Text style={styles.body}>
          Organizer access is assigned separately from ordinary player access. This prevents any
          signed-in user from creating competitions or receiving organizer powers automatically.
        </Text>
        <NoticeCard title="Pilot access">
          Trusted pilot organizers will be reviewed and assigned through audited platform operations.
        </NoticeCard>
        <PrimaryButton label="Open my account" onPress={() => router.replace('/account')} />
        <PrimaryButton label="Return home" onPress={() => router.replace('/')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <StatusPill label="PLANNED" tone="warning" />
      <Text style={styles.title}>Build a competition people can trust.</Text>
      <Text style={styles.body}>
        The organizer flow will guide you through game, format, visibility, registration, match
        windows, scoring, evidence, no-show policy, and a final rules preview before publication.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Why this is not a quick form</Text>
        <Text style={styles.body}>
          Published rules become the competition contract. ArenaSports will validate dates,
          capacity, tie-breakers, evidence requirements, and organizer powers before anyone joins.
        </Text>
      </View>

      <PrimaryButton label="Return home" onPress={() => router.replace('/')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 40,
  },
  body: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 25,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    marginVertical: spacing.lg,
    padding: spacing.lg,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
});
