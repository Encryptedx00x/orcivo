// Modo fácil building blocks (React Native port of apps/web/app/facil/ui.tsx).
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronDown, ChevronRight, ChevronUp, type LucideIcon } from 'lucide-react-native';

export const C = {
  purple: '#6D28D9',
  purple700: '#5B21B6',
  purple800: '#4C1D95',
  purple50: '#F5F3FF',
  purple100: '#EDE9FE',
  purple200: '#DDD6FE',
  purple300: '#C4B5FD',
  ink: '#0A0A0F',
  fg2: '#334155',
  fg3: '#475569',
  fg4: '#64748B',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  line: '#F1F5F9',
  bg: '#F8FAFC',
  green: '#16A34A',
  red: '#DC2626',
};

export const CHIP = {
  wait: { bg: '#FEF3C7', fg: '#92400E', dot: '#D97706' },
  ok: { bg: '#DCFCE7', fg: '#166534', dot: '#16A34A' },
  draft: { bg: '#F1F5F9', fg: '#334155', dot: '#64748B' },
  late: { bg: '#FEE2E2', fg: '#991B1B', dot: '#DC2626' },
  doing: { bg: '#EDE9FE', fg: '#4C1D95', dot: '#6D28D9' },
} as const;
export type ChipKind = keyof typeof CHIP;

export function Chip({ kind, label }: { kind: ChipKind; label: string }) {
  const c = CHIP[kind];
  return (
    <View style={[s.chip, { backgroundColor: c.bg }]}>
      <View style={[s.dot, { backgroundColor: c.dot }]} />
      <Text style={[s.chipText, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

/** Scrollable page with optional fixed bottom action bar. */
export function Page({
  children,
  bar,
  top = false,
}: {
  children: React.ReactNode;
  bar?: React.ReactNode;
  /** true on tab roots (no native header above). */
  top?: boolean;
}) {
  return (
    <SafeAreaView style={s.page} edges={top ? ['top'] : []}>
      <ScrollView contentContainerStyle={s.pageContent} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      {bar ? <View style={s.bar}>{bar}</View> : null}
    </SafeAreaView>
  );
}

export function H1({ children, size = 30 }: { children: React.ReactNode; size?: number }) {
  return (
    <Text accessibilityRole="header" style={[s.h1, { fontSize: size, lineHeight: size + 6 }]}>
      {children}
    </Text>
  );
}

export function Sub({ children }: { children: React.ReactNode }) {
  return <Text style={s.sub}>{children}</Text>;
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={s.section}>{children}</Text>;
}

export function Card({
  children,
  style,
  onPress,
  label,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  label?: string;
}) {
  if (!onPress) return <View style={[s.card, style]}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [s.card, style, pressed && { opacity: 0.85 }]}
    >
      {children}
    </Pressable>
  );
}

type Tone = 'primary' | 'outline' | 'soft' | 'link' | 'dashed' | 'danger';
export function Btn({
  tone = 'primary',
  icon: Icon,
  children,
  onPress,
  disabled,
  busy,
  height = 60,
  style,
}: {
  tone?: Tone;
  icon?: LucideIcon;
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  busy?: boolean;
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const t = TONES[tone];
  const off = disabled || busy;
  const color = tone === 'primary' && off ? C.fg4 : t.color;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!busy }}
      onPress={off ? undefined : onPress}
      style={({ pressed }) => [
        s.btn,
        { minHeight: tone === 'link' ? 52 : height },
        t.box,
        tone === 'primary' && off && { backgroundColor: C.border },
        pressed && !off && { opacity: 0.85 },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={color} />
      ) : (
        <>
          {Icon && <Icon size={tone === 'primary' ? 24 : 22} color={color} />}
          <Text style={[s.btnText, { color, fontSize: t.size }]}>{children}</Text>
        </>
      )}
    </Pressable>
  );
}
const TONES: Record<Tone, { box: ViewStyle; color: string; size: number }> = {
  primary: { box: { backgroundColor: C.purple }, color: '#FFFFFF', size: 19 },
  outline: {
    box: { backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: C.borderStrong },
    color: C.ink,
    size: 18,
  },
  soft: {
    box: { backgroundColor: C.purple50, borderWidth: 1.5, borderColor: C.purple200 },
    color: C.purple800,
    size: 18,
  },
  link: { box: { backgroundColor: 'transparent' }, color: C.purple700, size: 17 },
  dashed: {
    box: {
      backgroundColor: C.purple50,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: C.purple300,
      borderRadius: 20,
    },
    color: C.purple800,
    size: 18,
  },
  danger: {
    box: { backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#FECACA' },
    color: C.red,
    size: 18,
  },
};

export function Options<T extends string | number>({
  options,
  value,
  onPick,
  cols = 3,
}: {
  options: Array<{ value: T; label: string }>;
  /** An array makes it multi-select (each pick toggles). */
  value: T | null | T[];
  onPick: (v: T) => void;
  cols?: number;
}) {
  return (
    <View style={s.options}>
      {options.map((o) => {
        const on = Array.isArray(value) ? value.includes(o.value) : o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onPick(o.value)}
            style={[
              s.option,
              { width: `${100 / cols - 2}%` },
              on && { backgroundColor: C.purple, borderColor: C.purple },
            ]}
          >
            <Text style={[s.optionText, on && { color: '#FFFFFF' }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Toggle({
  on,
  onChange,
  label,
  sub,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
  sub?: string;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      onPress={() => onChange(!on)}
      style={s.toggle}
    >
      <View style={{ flex: 1 }}>
        <Text style={s.toggleLabel}>{label}</Text>
        {sub ? <Text style={s.toggleSub}>{sub}</Text> : null}
      </View>
      <Switch
        value={on}
        onValueChange={onChange}
        trackColor={{ true: C.purple, false: C.borderStrong }}
        thumbColor="#FFFFFF"
      />
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboard,
  big,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboard?: 'default' | 'phone-pad' | 'number-pad';
  big?: boolean;
  multiline?: boolean;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.fg4}
        keyboardType={keyboard ?? 'default'}
        multiline={multiline}
        accessibilityLabel={label}
        style={[
          s.input,
          big && { fontSize: 20, fontWeight: '700' },
          multiline && { height: 120, paddingTop: 14, textAlignVertical: 'top' },
        ]}
      />
    </View>
  );
}

export function Search({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={C.fg4}
      accessibilityLabel={placeholder}
      autoCorrect={false}
      style={s.input}
    />
  );
}

export function Avatar({ name, size = 52 }: { name: string; size?: number }) {
  return (
    <View
      style={[s.avatar, { width: size, height: size, borderRadius: size / 2 }]}
      accessibilityElementsHidden
    >
      <Text style={[s.avatarText, { fontSize: size * 0.36 }]}>{initialsOf(name)}</Text>
    </View>
  );
}

/** Tappable list row with a chevron (menus, "Mais opções"). */
export function Row({
  icon: Icon,
  label,
  sub,
  onPress,
  danger,
}: {
  icon: LucideIcon;
  label: string;
  sub?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [s.row, pressed && { backgroundColor: C.line }]}
    >
      <View style={[s.rowIcon, danger && { backgroundColor: '#FEF2F2' }]}>
        <Icon size={22} color={danger ? C.red : C.purple} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.rowLabel, danger && { color: C.red }]}>{label}</Text>
        {sub ? <Text style={s.rowSub}>{sub}</Text> : null}
      </View>
      <ChevronRight size={22} color={C.fg4} />
    </Pressable>
  );
}

/** Progressive disclosure: advanced options stay one tap away. */
export function More({
  children,
  label = 'Mais opções',
}: {
  children: React.ReactNode;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 10 }}>
      <Btn tone="link" icon={open ? ChevronUp : ChevronDown} onPress={() => setOpen(!open)}>
        {label}
      </Btn>
      {open ? children : null}
    </View>
  );
}

/** Asks for the reason the backend requires (cancelar, recusar, reabrir…). */
export function ReasonModal({
  title,
  confirm,
  danger,
  onClose,
  onConfirm,
}: {
  title: string | null;
  confirm: string;
  danger?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const close = () => {
    setReason('');
    onClose();
  };
  return (
    <Modal visible={!!title} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.4)' }}
      >
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 20,
            gap: 14,
          }}
        >
          <H1 size={24}>{title ?? ''}</H1>
          <Field
            label="Motivo"
            value={reason}
            onChange={setReason}
            placeholder="Explique em poucas palavras"
            multiline
          />
          <Btn
            tone={danger ? 'danger' : 'primary'}
            disabled={reason.trim().length < 3}
            busy={busy}
            onPress={async () => {
              setBusy(true);
              try {
                await onConfirm(reason.trim());
                setReason('');
              } finally {
                setBusy(false);
              }
            }}
          >
            {confirm}
          </Btn>
          <Btn tone="link" onPress={close}>
            Voltar
          </Btn>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function Loading({ label = 'Carregando…' }: { label?: string }) {
  return (
    <View style={s.center} accessibilityLabel={label}>
      <ActivityIndicator color={C.purple} size="large" />
    </View>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card style={{ padding: 18, gap: 12 }}>
      <Text accessibilityRole="alert" style={s.body}>
        {message}
      </Text>
      {onRetry ? (
        <Btn tone="outline" onPress={onRetry}>
          Tentar de novo
        </Btn>
      ) : null}
    </Card>
  );
}

export function EmptyBox({ children }: { children: React.ReactNode }) {
  return (
    <View style={s.empty}>
      <Text style={[s.body, { color: C.fg3, textAlign: 'center' }]}>{children}</Text>
    </View>
  );
}

/** Load on focus; keeps the previous data while refreshing (no flicker). */
export function useLoad<T>(load: () => Promise<T>, fallback: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const gen = useRef(0);
  const refresh = useCallback(async () => {
    const g = ++gen.current;
    setError(null);
    try {
      const v = await load();
      if (g === gen.current) setData(v);
    } catch (err) {
      if (g === gen.current)
        setError(/ 403$/.test(String(err)) ? 'Seu perfil não pode ver isso.' : fallback);
    }
  }, [load, fallback]);
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );
  return { data, error, refresh, setData };
}

export const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? '';
export const hhmm = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
export const longDate = (d: Date) =>
  d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

export const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  pageContent: { padding: 16, paddingBottom: 40, gap: 16 },
  bar: {
    padding: 16,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderColor: C.border,
    gap: 10,
  },
  h1: { fontWeight: '700', color: C.ink, letterSpacing: -0.4 },
  sub: { fontSize: 17, color: C.fg3, lineHeight: 24 },
  section: { fontSize: 17, fontWeight: '700', color: C.fg2, marginHorizontal: 4, marginTop: 2 },
  body: { fontSize: 17, color: C.ink, lineHeight: 24 },
  muted: { fontSize: 15, color: C.fg3 },
  card: { borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.border },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { fontSize: 14, fontWeight: '600' },
  btn: {
    width: '100%',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  btnText: { fontWeight: '700' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: {
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.borderStrong,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  optionText: { fontSize: 17, fontWeight: '700', color: C.ink },
  toggle: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleLabel: { fontSize: 17, color: C.ink },
  toggleSub: { fontSize: 15, color: C.fg3 },
  fieldLabel: { fontSize: 17, fontWeight: '600', color: C.ink },
  input: {
    minHeight: 60,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.borderStrong,
    paddingHorizontal: 16,
    fontSize: 18,
    color: C.ink,
    backgroundColor: '#FFFFFF',
  },
  avatar: { backgroundColor: C.purple100, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: C.purple800, fontWeight: '700' },
  row: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.purple50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { fontSize: 18, fontWeight: '600', color: C.ink },
  rowSub: { fontSize: 15, color: C.fg3, marginTop: 2 },
  center: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  empty: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: C.borderStrong,
  },
});
