import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { Screen } from '../src/components/Screen';
import { StatusPill } from '../src/components/StatusPill';
import { colors, radius, spacing } from '../src/theme';

export default function CreateTournamentScreen() {
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
