import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../../services/api';
import type { AuthStackParamList } from '../../navigation/AuthStack';
import { classifyInviteError, extractInviteToken } from './invite-state';
import type { InviteFailureInfo } from './invite-state';

type Props = NativeStackScreenProps<AuthStackParamList, 'AcceptInvite'>;

// Aceita o convite pelo mesmo endpoint do web (POST /invites/accept). O token vem do deep link
// (route.params.token) ou é colado manualmente (token puro ou o link completo do e-mail).
export function AcceptInviteScreen({ navigation, route }: Props) {
  const [tokenInput, setTokenInput] = useState(route.params?.token ?? '');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [terminal, setTerminal] = useState<InviteFailureInfo | null>(null);
  const [acceptedCompany, setAcceptedCompany] = useState<string | null | undefined>(undefined);

  const handleAccept = async () => {
    setError(null);
    const token = extractInviteToken(tokenInput);
    if (!token) {
      setError('Cole o código ou o link do convite recebido por e-mail.');
      return;
    }
    if (!name.trim() || password.length < 8) {
      setError('Informe seu nome e uma senha com no mínimo 8 caracteres.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<{ company?: { trade_name?: string } }>('/invites/accept', {
        token,
        name: name.trim(),
        password,
      });
      setAcceptedCompany(res?.company?.trade_name ?? null);
    } catch (e: unknown) {
      const info = classifyInviteError(e);
      if (info.terminal) setTerminal(info);
      else setError(info.message);
    } finally {
      setLoading(false);
    }
  };

  if (acceptedCompany !== undefined) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Convite aceito!</Text>
        <Text style={styles.subtitle}>
          {acceptedCompany ? `Você agora faz parte da equipe ${acceptedCompany}.` : 'Você agora faz parte da equipe.'} Entre
          com seu e-mail e a senha que acabou de criar.
        </Text>
        <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.btnText}>Entrar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (terminal) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{terminal.title}</Text>
        <Text style={styles.subtitle}>{terminal.message}</Text>
        <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.btnText}>Ir para o login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Aceitar convite</Text>
      <Text style={styles.subtitle}>
        Você foi convidado para uma equipe no Orcivo. Cole o código (ou o link) do convite e crie seu acesso.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Código ou link do convite"
        value={tokenInput}
        onChangeText={setTokenInput}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TextInput style={styles.input} placeholder="Seu nome" value={name} onChangeText={setName} />
      <TextInput
        style={styles.input}
        placeholder="Senha (mín. 8 caracteres)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleAccept} disabled={loading}>
        <Text style={styles.btnText}>{loading ? 'Aguarde...' : 'Aceitar convite'}</Text>
      </TouchableOpacity>
      <Text style={styles.hint}>
        Já tem conta? Entre nela e abra o link do convite no navegador para aceitar.
      </Text>
      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>Voltar para o login</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, justifyContent: 'center', backgroundColor: '#FFFFFF' },
  title: { fontSize: 24, fontWeight: '700', color: '#0A0A0F', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 24, lineHeight: 20 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 16 },
  error: { color: '#DC2626', fontSize: 13, marginBottom: 8 },
  btn: { backgroundColor: '#6D28D9', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
  hint: { fontSize: 12, color: '#6B7280', textAlign: 'center', marginTop: 16 },
  link: { color: '#6D28D9', textAlign: 'center', marginTop: 12, fontSize: 14 },
});
