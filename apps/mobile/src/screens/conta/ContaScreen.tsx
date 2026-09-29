import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import type { TextInputProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { newIdempotencyKey } from '../../services/api';
import { authService } from '../../services/auth.service';
import { useAuth } from '../../contexts/AuthContext';
import { accountError, EMAIL_RE, EMPTY_ACCOUNT_FORM } from './account-form';
import type { AccountFormState } from './account-form';

function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput accessibilityLabel={label} placeholderTextColor="#64748B" style={styles.input} {...props} />
    </View>
  );
}

function SaveButton({ label, busy, onPress }: { label: string; busy: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: busy, busy }}
      disabled={busy} onPress={onPress} style={[styles.button, busy && styles.disabled]}>
      <Text style={styles.buttonText}>{busy ? 'Salvando…' : label}</Text>
    </TouchableOpacity>
  );
}

export function ContaScreen() {
  const insets = useSafeAreaInsets();
  const { company, setSession } = useAuth();
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [original, setOriginal] = useState({ name: '', email: '' });
  const [form, setForm] = useState<AccountFormState>(EMPTY_ACCOUNT_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const requestKey = useRef<string | null>(null);
  const lock = useRef(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError('');
    void authService.getAccount().then((account) => {
      if (!active) return;
      setOriginal({ name: account.name, email: account.email });
      setForm((current) => ({ ...current, name: account.name, email: account.email }));
    }).catch((err) => {
      if (active) setLoadError(accountError(err, 'load'));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [attempt]);

  function edit(field: keyof AccountFormState, value: string) {
    setSaved('');
    setError('');
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function save() {
    if (lock.current) return;
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const changingPassword = form.new_password.length > 0;
    const nameChanged = name !== original.name;
    const emailChanged = email !== original.email;
    const credentialsChanged = emailChanged || changingPassword;

    setSaved('');
    if (name.length < 2) {
      setError('Informe seu nome com pelo menos 2 caracteres.');
      return;
    }
    if (!EMAIL_RE.test(email)) {
      setError('Informe um e-mail válido.');
      return;
    }
    if (changingPassword && form.new_password.length < 8) {
      setError('A nova senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (changingPassword && form.new_password !== form.confirm_password) {
      setError('A confirmação da nova senha não confere.');
      return;
    }
    if (credentialsChanged && !form.current_password) {
      setError('Informe sua senha atual para alterar e-mail ou senha.');
      return;
    }
    if (!nameChanged && !credentialsChanged) {
      setSaved('Nenhuma alteração para salvar.');
      return;
    }

    const payload: { name?: string; email?: string; current_password?: string; new_password?: string } = {};
    if (nameChanged) payload.name = name;
    if (emailChanged) payload.email = email;
    if (credentialsChanged) payload.current_password = form.current_password;
    if (changingPassword) payload.new_password = form.new_password;

    lock.current = true;
    setBusy(true);
    setError('');
    if (!requestKey.current) requestKey.current = newIdempotencyKey();
    try {
      const result = await authService.updateAccount(payload, { idempotencyKey: requestKey.current });
      requestKey.current = null;
      setOriginal({ name: result.account.name, email: result.account.email });
      setForm({
        name: result.account.name, email: result.account.email,
        current_password: '', new_password: '', confirm_password: '',
      });
      if (result.access_token && result.refresh_token && company) {
        await setSession(result.access_token, result.refresh_token, result.account, company);
      }
      setSaved(result.access_token ? 'Senha atualizada. As outras sessões foram encerradas.' : 'Dados da conta atualizados.');
    } catch (err) {
      setError(accountError(err, 'save'));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator accessibilityLabel="Carregando conta" color="#6D28D9" /><Text style={styles.description}>Carregando…</Text></View>;
  if (loadError) return (
    <View style={styles.center}>
      <Text accessibilityRole="alert" style={styles.error}>{loadError}</Text>
      <SaveButton label="Tentar novamente" busy={false} onPress={() => setAttempt((value) => value + 1)} />
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={insets.top + (Platform.OS === 'ios' ? 44 : 56)}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingBottom: Math.max(16, insets.bottom) }]}>
        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.title}>Meus dados</Text>
          <Text style={styles.description}>Nome e e-mail usados para entrar no Orcivo.</Text>
          <Field label="Nome" value={form.name} maxLength={100} editable={!busy} onChangeText={(value) => edit('name', value)} />
          <Field label="E-mail" value={form.email} maxLength={150} autoCapitalize="none" autoCorrect={false}
            keyboardType="email-address" editable={!busy} onChangeText={(value) => edit('email', value)} />
        </View>
        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.title}>Alterar senha</Text>
          <Text style={styles.description}>Obrigatória para alterar e-mail ou senha. Deixe a nova senha em branco para mantê-la.</Text>
          <Field label="Senha atual" value={form.current_password} secureTextEntry autoCapitalize="none"
            editable={!busy} onChangeText={(value) => edit('current_password', value)} />
          <Field label="Nova senha" value={form.new_password} secureTextEntry autoCapitalize="none"
            editable={!busy} onChangeText={(value) => edit('new_password', value)} />
          <Field label="Confirmar nova senha" value={form.confirm_password} secureTextEntry autoCapitalize="none"
            editable={!busy} onChangeText={(value) => edit('confirm_password', value)} />
        </View>
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        {!!saved && <Text accessibilityLiveRegion="polite" style={styles.success}>{saved}</Text>}
        <SaveButton label="Salvar alterações" busy={busy} onPress={() => void save()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', padding: 24, gap: 16, backgroundColor: '#FFFFFF' },
  content: { padding: 16, gap: 16 },
  card: { padding: 16, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  title: { color: '#0A0A0F', fontSize: 20, lineHeight: 28, fontWeight: '600' },
  description: { color: '#64748B', fontSize: 14, lineHeight: 20, marginTop: 4, marginBottom: 16 },
  field: { marginBottom: 12, gap: 8 },
  label: { color: '#0A0A0F', fontSize: 14, fontWeight: '500' },
  input: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, minHeight: 48, fontSize: 16, color: '#0A0A0F', backgroundColor: '#FFFFFF' },
  button: { backgroundColor: '#6D28D9', borderRadius: 12, minHeight: 48, padding: 14, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  error: { color: '#DC2626', fontSize: 14, lineHeight: 20 },
  success: { color: '#15803D', fontSize: 14, lineHeight: 20 },
});
