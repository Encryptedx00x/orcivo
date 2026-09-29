import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UserPlus, Users } from 'lucide-react-native';
import { CreateInviteSchema } from '@orcivo/shared-types';
import type { CreateInviteDto } from '@orcivo/shared-types';
import { api, newIdempotencyKey } from '../../services/api';
import { equipeError } from './equipe-errors';

interface Member {
  id: string;
  user: { name: string; email: string };
  role: string;
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Admin',
  TECNICO: 'Técnico',
  OWNER: 'Proprietário',
};

function Button({
  label,
  busy = false,
  secondary = false,
  onPress,
}: {
  label: string;
  busy?: boolean;
  secondary?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled: busy, busy }}
      disabled={busy}
      onPress={onPress}
      style={[styles.button, secondary && styles.secondaryButton, busy && styles.disabled]}
    >
      <Text style={[styles.buttonText, secondary && styles.secondaryButtonText]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function EquipeScreen() {
  const insets = useSafeAreaInsets();
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<CreateInviteDto['role']>('TECNICO');
  const [busy, setBusy] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [sentTo, setSentTo] = useState('');
  const inviteLock = useRef(false);
  const request = useRef<{ body: string; key: string } | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setLoadError('');
      void api
        .get<Member[]>('/company/members')
        .then((data) => {
          if (active) setMembers(data);
        })
        .catch((error: unknown) => {
          if (active) setLoadError(equipeError(error, 'load'));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [attempt]),
  );

  async function invite() {
    if (inviteLock.current) return;
    const parsed = CreateInviteSchema.safeParse({ email: email.trim(), role });
    if (!parsed.success) {
      setInviteError('Informe um e-mail válido.');
      return;
    }
    inviteLock.current = true;
    setBusy(true);
    setInviteError('');
    setSentTo('');
    try {
      const body = JSON.stringify(parsed.data);
      if (request.current?.body !== body) request.current = { body, key: newIdempotencyKey() };
      await api.post('/invites', parsed.data, { idempotencyKey: request.current.key });
      request.current = null;
      setSentTo(parsed.data.email);
      setEmail('');
      setRole('TECNICO');
      setShowInvite(false);
    } catch (error: unknown) {
      setInviteError(equipeError(error, 'invite'));
    } finally {
      inviteLock.current = false;
      setBusy(false);
    }
  }

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator accessibilityLabel="Carregando equipe" color="#6D28D9" />
        <Text style={styles.description}>Carregando equipe…</Text>
      </View>
    );
  if (loadError)
    return (
      <View style={styles.center}>
        <Text accessibilityRole="alert" style={styles.error}>
          {loadError}
        </Text>
        <Button label="Tentar novamente" onPress={() => setAttempt((value) => value + 1)} />
      </View>
    );

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={insets.top + (Platform.OS === 'ios' ? 44 : 56)}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(16, insets.bottom) }]}
      >
        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.title}>
            Equipe
          </Text>
          <Text style={styles.description}>Gerencie quem pode acessar a empresa.</Text>
          {!!sentTo && (
            <Text accessibilityLiveRegion="polite" style={styles.success}>
              Convite enviado para {sentTo}. O membro aparecerá na equipe após aceitar.
            </Text>
          )}
          {!showInvite ? (
            <Button
              label="Convidar membro"
              onPress={() => {
                setSentTo('');
                setInviteError('');
                setShowInvite(true);
              }}
            />
          ) : (
            <View style={styles.form}>
              <View style={styles.sectionHeading}>
                <UserPlus size={20} color="#6D28D9" />
                <Text accessibilityRole="header" style={styles.subtitle}>
                  Convidar membro
                </Text>
              </View>
              <Text style={styles.label}>E-mail</Text>
              <TextInput
                accessibilityLabel="E-mail do novo membro"
                style={styles.input}
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  setInviteError('');
                }}
                editable={!busy}
                placeholder="email@exemplo.com"
                placeholderTextColor="#64748B"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                maxLength={254}
              />
              <Text style={styles.label}>Função</Text>
              <View style={styles.roles}>
                {(['TECNICO', 'ADMIN'] as const).map((value) => (
                  <TouchableOpacity
                    key={value}
                    accessibilityRole="radio"
                    accessibilityLabel={ROLE_LABEL[value]}
                    accessibilityState={{ checked: role === value, disabled: busy }}
                    disabled={busy}
                    onPress={() => {
                      setRole(value);
                      setInviteError('');
                    }}
                    style={[styles.roleOption, role === value && styles.selectedRole]}
                  >
                    <Text style={role === value ? styles.selectedLabel : styles.label}>
                      {ROLE_LABEL[value]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {!!inviteError && (
                <Text accessibilityRole="alert" style={styles.error}>
                  {inviteError}
                </Text>
              )}
              <Button
                label={busy ? 'Enviando…' : 'Enviar convite'}
                busy={busy}
                onPress={() => void invite()}
              />
              <Button
                label="Cancelar"
                secondary
                busy={busy}
                onPress={() => {
                  setShowInvite(false);
                  setEmail('');
                  setRole('TECNICO');
                  setInviteError('');
                }}
              />
            </View>
          )}
        </View>
        <View style={styles.card}>
          <View style={styles.sectionHeading}>
            <Users size={20} color="#6D28D9" />
            <Text accessibilityRole="header" style={styles.subtitle}>
              Membros ativos ({members.length})
            </Text>
          </View>
          {members.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.name}>Nenhum membro ainda.</Text>
              <Text style={styles.description}>
                Convide técnicos e admins para colaborar na empresa.
              </Text>
            </View>
          ) : (
            members.map((member) => (
              <View key={member.id} style={styles.member}>
                <Text style={styles.name}>{member.user.name}</Text>
                <Text style={styles.email}>{member.user.email}</Text>
                <View style={[styles.badge, member.role !== 'TECNICO' && styles.adminBadge]}>
                  <Text
                    style={[styles.badgeText, member.role !== 'TECNICO' && styles.adminBadgeText]}
                  >
                    {ROLE_LABEL[member.role] ?? member.role}
                  </Text>
                </View>
              </View>
            ))
          )}
          <Button
            label="Atualizar equipe"
            secondary
            busy={busy}
            onPress={() => setAttempt((value) => value + 1)}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', padding: 24, gap: 16, backgroundColor: '#FFFFFF' },
  content: { padding: 16, gap: 16 },
  card: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  title: { color: '#0A0A0F', fontSize: 20, lineHeight: 28, fontWeight: '600' },
  subtitle: { color: '#0A0A0F', fontSize: 16, lineHeight: 24, fontWeight: '600', flexShrink: 1 },
  description: { color: '#64748B', fontSize: 14, lineHeight: 20, marginTop: 4, marginBottom: 16 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  form: { gap: 12, marginTop: 8 },
  label: { color: '#0A0A0F', fontSize: 14, fontWeight: '500' },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    minHeight: 48,
    fontSize: 16,
    color: '#0A0A0F',
    backgroundColor: '#FFFFFF',
  },
  roles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleOption: {
    minHeight: 44,
    minWidth: 44,
    padding: 12,
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedRole: { borderColor: '#6D28D9', backgroundColor: '#F5F3FF' },
  selectedLabel: { color: '#6D28D9', fontSize: 14, fontWeight: '600' },
  button: {
    backgroundColor: '#6D28D9',
    borderRadius: 12,
    minHeight: 48,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  secondaryButton: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  secondaryButtonText: { color: '#6D28D9' },
  disabled: { opacity: 0.6 },
  member: { borderTopWidth: 1, borderColor: '#F1F5F9', paddingVertical: 16, gap: 4, marginTop: 12 },
  name: { color: '#0A0A0F', fontSize: 16, lineHeight: 24, fontWeight: '600' },
  email: { color: '#64748B', fontSize: 14, lineHeight: 20 },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 9999,
    backgroundColor: '#F1F5F9',
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginTop: 4,
  },
  badgeText: { color: '#334155', fontSize: 12, lineHeight: 16, fontWeight: '600' },
  adminBadge: { backgroundColor: '#F5F3FF' },
  adminBadgeText: { color: '#4C1D95' },
  empty: { paddingVertical: 24 },
  error: { color: '#DC2626', fontSize: 14, lineHeight: 20 },
  success: { color: '#15803D', fontSize: 14, lineHeight: 20 },
});
