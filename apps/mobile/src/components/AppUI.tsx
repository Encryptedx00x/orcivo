import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { statusTheme, theme } from '../theme';

type ButtonVariant = 'primary' | 'secondary';
export function AppButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' ? styles.primary : styles.secondary,
        (pressed || disabled) && styles.muted,
      ]}
    >
      <Text style={variant === 'primary' ? styles.primaryText : styles.secondaryText}>{label}</Text>
    </Pressable>
  );
}

export function AppCard({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function AppInput({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput placeholderTextColor={theme.colors.slate500} style={styles.input} {...props} />
    </View>
  );
}

export function StatusBadge({ kind, label }: { kind: keyof typeof statusTheme; label: string }) {
  const value = statusTheme[kind];
  return (
    <View style={[styles.badge, { backgroundColor: value.bg }]}>
      <View style={[styles.dot, { backgroundColor: value.dot }]} />
      <Text style={[styles.badgeText, { color: value.fg }]}>{label}</Text>
    </View>
  );
}

export function ScreenHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.header}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function ListRow({
  icon: Icon,
  label,
  sub,
  onPress,
}: {
  icon?: LucideIcon;
  label: string;
  sub?: string;
  onPress?: () => void;
}) {
  const content = (
    <>
      <View style={styles.rowLeading}>
        {Icon ? <Icon size={20} color={theme.colors.purple600} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      {onPress ? <ChevronRight size={20} color={theme.colors.slate500} /> : null}
    </>
  );
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  ) : (
    <View style={styles.row}>{content}</View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: theme.colors.purple600 },
  secondary: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.slate200,
  },
  muted: { opacity: 0.65 },
  primaryText: {
    color: theme.colors.white,
    fontSize: theme.type.body,
    fontWeight: theme.type.semibold,
  },
  secondaryText: {
    color: theme.colors.ink,
    fontSize: theme.type.body,
    fontWeight: theme.type.semibold,
  },
  card: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.slate200,
    borderRadius: theme.radius.md,
    padding: theme.space.lg,
  },
  field: { gap: theme.space.sm },
  fieldLabel: {
    color: theme.colors.slate700,
    fontSize: theme.type.caption,
    fontWeight: theme.type.medium,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: theme.colors.slate200,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space.md,
    color: theme.colors.ink,
    fontSize: theme.type.body,
    backgroundColor: theme.colors.white,
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
  },
  dot: { width: 5, height: 5, borderRadius: 99 },
  badgeText: { fontSize: theme.type.caption, fontWeight: theme.type.semibold },
  header: { gap: theme.space.xs, marginBottom: theme.space.lg },
  title: {
    color: theme.colors.ink,
    fontSize: theme.type.h2,
    lineHeight: 32,
    fontWeight: theme.type.bold,
  },
  subtitle: { color: theme.colors.slate500, fontSize: theme.type.small, lineHeight: 20 },
  row: {
    minHeight: 64,
    paddingVertical: theme.space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    borderBottomWidth: 1,
    borderColor: theme.colors.slate100,
  },
  rowLeading: { width: 28, alignItems: 'center' },
  rowLabel: { color: theme.colors.ink, fontSize: theme.type.body, fontWeight: theme.type.medium },
  rowSub: { color: theme.colors.slate500, fontSize: theme.type.small, marginTop: 2 },
  pressed: { opacity: 0.72 },
});
