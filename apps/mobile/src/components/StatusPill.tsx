import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

type StatusPillProps = {
  label: string;
  tone?: 'neutral' | 'success' | 'warning';
};

export function StatusPill({ label, tone = 'neutral' }: StatusPillProps) {
  return (
    <View
      accessibilityLabel={`Status: ${label}`}
      style={[
        styles.pill,
        tone === 'success' && styles.success,
        tone === 'warning' && styles.warning,
      ]}
    >
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  success: {
    borderColor: colors.success,
  },
  warning: {
    borderColor: colors.warning,
  },
  text: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
});
