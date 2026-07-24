import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { Screen } from '../../src/components/Screen';
import { StatusPill } from '../../src/components/StatusPill';
import { colors, radius, spacing } from '../../src/theme';

export default function TournamentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <Screen>
      <StatusPill label="DETAIL FOUNDATION" tone="warning" />
      <Text style={styles.title}>Tournament details</Text>
      <Text style={styles.muted}>
        Tournament ID: {id ?? 'unknown'}
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>What will appear here</Text>
        <Text style={styles.line}>? Published rules and exact version</Text>
        <Text style={styles.line}>? Registration deadline and availability</Text>
        <Text style={styles.line}>? Format, scoring, and tie-breakers</Text>
        <Text style={styles.line}>? Organizer trust and audit information</Text>
        <Text style={styles.line}>? Fixtures, standings, and dispute policy</Text>
      </View>

      <PrimaryButton
        label="Registration coming next"
        disabled
        onPress={() => undefined}
      />

      <Text style={styles.notice}>
        This screen intentionally does not pretend registration is implemented.
        Authentication and persistent tournament details are the next vertical
        slice.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '900',
  },
  muted: {
    color: colors.textMuted,
    fontSize: 14,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    marginVertical: spacing.md,
    padding: spacing.lg,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  line: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  notice: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
});
