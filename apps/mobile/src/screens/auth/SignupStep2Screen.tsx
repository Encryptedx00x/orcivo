import React, { useState } from 'react';
import { Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { SignupStep2Schema } from '@orcivo/shared-types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../contexts/AuthContext';
import type { AuthCompany, AuthUser } from '../../contexts/AuthContext';
import { API_URL } from '../../config';
import type { AuthStackParamList } from '../../navigation/AuthStack';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignupStep2'>;

export function SignupStep2Screen({ route }: Props) {
  const { setSession } = useAuth();
  const { accessToken } = route.params;
  const [form, setForm] = useState({ trade_name: '', document_type: '', document: '', phone: '', city: '', state: '', brand_color: '', pix_key: '' });
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    const payload = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''));
    const parsed = SignupStep2Schema.safeParse(payload);
    if (!parsed.success) {
      Alert.alert('Dados inválidos', parsed.error.issues.map(i => i.message).join('\n'));
      return;
    }
    setLoading(true);
    try {
      // Temporariamente usar o access token do step 1 para autorizar step 2
      const res = await fetch(`${API_URL}/auth/signup/company`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, 'X-Client-Request-Id': String(Date.now()) },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw Object.assign(new Error('Erro ao criar empresa'), { data: err });
      }
      const data = await res.json() as {
        access_token: string;
        refresh_token: string;
        user: AuthUser;
        company: AuthCompany;
      };
      // setSession separado do try/catch do fetch para não confundir erro de rede com erro de sessão
      try {
        await setSession(data.access_token, data.refresh_token, data.user, data.company);
      } catch {
        // Sessão falhou mas empresa foi criada — navegar para login
        Alert.alert('Empresa criada!', 'Faça login para continuar.');
      }
      return;
    } catch (e: unknown) {
      const error = (e ?? {}) as { data?: { message?: string } };
      Alert.alert('Erro', error.data?.message ?? 'Não foi possível criar a empresa. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Criar empresa</Text>
      <Text style={styles.step}>Etapa 2 de 2 — Dados da empresa</Text>
      <Text style={styles.plan}>Plano: Orcivo Livre</Text>
      <TextInput style={styles.input} placeholder="Nome fantasia *" value={form.trade_name} onChangeText={v => setForm(f => ({ ...f, trade_name: v }))} />
      <TextInput style={styles.input} placeholder="Telefone" value={form.phone} onChangeText={v => setForm(f => ({ ...f, phone: v }))} keyboardType="phone-pad" />
      <TextInput style={styles.input} placeholder="Cidade" value={form.city} onChangeText={v => setForm(f => ({ ...f, city: v }))} />
      <TextInput style={styles.input} placeholder="UF (ex: SP)" value={form.state} onChangeText={v => setForm(f => ({ ...f, state: v.toUpperCase() }))} maxLength={2} />
      <TextInput style={styles.input} placeholder="Chave Pix" value={form.pix_key} onChangeText={v => setForm(f => ({ ...f, pix_key: v }))} />
      <TouchableOpacity style={styles.btn} onPress={handleCreate} disabled={loading}>
        <Text style={styles.btnText}>{loading ? 'Criando...' : 'Criar empresa e entrar'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: '#FFFFFF', flexGrow: 1 },
  title: { fontSize: 24, fontWeight: '700', color: '#0A0A0F', marginBottom: 4 },
  step: { fontSize: 14, color: '#6B7280', marginBottom: 4 },
  plan: { fontSize: 13, color: '#6D28D9', marginBottom: 20, fontWeight: '500' },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 16 },
  btn: { backgroundColor: '#6D28D9', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
});
