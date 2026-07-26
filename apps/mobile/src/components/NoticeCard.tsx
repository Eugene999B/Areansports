import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

type NoticeCardProps = PropsWithChildren<{
  title: string;
  tone?: 'info' | 'danger' | 'success';
}>;

export function NoticeCard({ title, tone = 'info', children }: NoticeCardProps) {
  return (
    <View
      accessibilityRole={tone === 'danger' ? 'alert' : 'summary'}
      style={[styles.card, tone === 'danger' ? styles.danger : undefined]}
    >
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  danger: {
    borderColor: colors.danger,
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  body: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
});
