import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Linking, ScrollView } from 'react-native';
import { LEGAL_DOCS_VERSION, SignupStep1Schema } from '@orcivo/shared-types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../../services/api';
import type { AuthStackParamList } from '../../navigation/AuthStack';

const TERMOS_URL = 'https://orcivo.com.br/termos';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignupStep1'>;

export function SignupStep1Screen({ navigation }: Props) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', accepted_terms: false });
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    const parsed = SignupStep1Schema.safeParse({
      ...form,
      accepted_terms: form.accepted_terms || undefined,
      terms_version: LEGAL_DOCS_VERSION,
      privacy_version: LEGAL_DOCS_VERSION,
    });
    if (!parsed.success) {
      Alert.alert('Dados inválidos', parsed.error.issues.map(i => i.message).join('\n'));
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<{ access_token: string; user: { id: string } }>('/auth/signup/user', parsed.data);
      navigation.navigate('SignupStep2', { userId: res.user.id, accessToken: res.access_token });
    } catch (e: unknown) {
      const error = (e ?? {}) as { data?: { message?: string } };
      Alert.alert('Erro', error.data?.message ?? 'Não foi possível criar a conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Criar conta</Text>
      <Text style={styles.step}>Etapa 1 de 2 — Seus dados</Text>
      <TextInput style={styles.input} placeholder="Nome completo" value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} />
      <TextInput style={styles.input} placeholder="E-mail" value={form.email} onChangeText={v => setForm(f => ({ ...f, email: v }))} keyboardType="email-address" autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Telefone (opcional)" value={form.phone} onChangeText={v => setForm(f => ({ ...f, phone: v }))} keyboardType="phone-pad" />
      <TextInput style={styles.input} placeholder="Senha (mín. 8 caracteres)" value={form.password} onChangeText={v => setForm(f => ({ ...f, password: v }))} secureTextEntry />
      <TouchableOpacity style={styles.checkRow} onPress={() => setForm(f => ({ ...f, accepted_terms: !f.accepted_terms }))}>
        <View style={[styles.checkbox, form.accepted_terms && styles.checkboxActive]} />
        <Text style={styles.checkLabel}>Aceito os termos de uso e a política de privacidade</Text>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="link"
        onPress={() => void Linking.openURL(TERMOS_URL)}
        style={styles.termsLink}
      >
        <Text style={styles.termsLinkText}>Ver termos de uso</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btn} onPress={handleNext} disabled={loading}>
        <Text style={styles.btnText}>{loading ? 'Aguarde...' : 'Continuar'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: '#FFFFFF', flexGrow: 1 },
  title: { fontSize: 24, fontWeight: '700', color: '#0A0A0F', marginBottom: 4 },
  step: { fontSize: 14, color: '#6B7280', marginBottom: 24 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 16 },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  checkbox: { width: 20, height: 20, borderWidth: 2, borderColor: '#6D28D9', borderRadius: 4, marginRight: 10 },
  checkboxActive: { backgroundColor: '#6D28D9' },
  checkLabel: { fontSize: 14, color: '#0A0A0F', flex: 1 },
  termsLink: { marginTop: -8, marginBottom: 20, paddingVertical: 4 },
  termsLinkText: { fontSize: 14, color: '#6D28D9', textDecorationLine: 'underline' },
  btn: { backgroundColor: '#6D28D9', borderRadius: 8, padding: 14, alignItems: 'center' },
  btnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
});
