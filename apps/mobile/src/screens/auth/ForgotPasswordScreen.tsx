import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../../services/api';
import type { AuthStackParamList } from '../../navigation/AuthStack';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

// Solicita o link de redefinição (mesmo endpoint do web). A troca da senha em si é concluída
// pelo link enviado por e-mail, aberto no navegador — não há formulário de nova senha no app.
export function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Informe o e-mail da sua conta.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/forgot-password', { email: trimmed });
      setSent(true);
    } catch (e: unknown) {
      const status = ((e ?? {}) as { status?: number }).status;
      if (status === 400) setError('Informe um e-mail válido.');
      else if (status === 429) setError('Muitas tentativas. Aguarde alguns minutos e tente novamente.');
      else setError('Não foi possível enviar o e-mail. Verifique sua conexão e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Verifique seu e-mail</Text>
        <Text style={styles.subtitle}>
          Se {email.trim()} estiver cadastrado, enviamos um link para redefinir sua senha. Abra o e-mail e toque no link
          (ele abre no navegador e vale por 15 minutos). Depois, volte aqui e entre com a nova senha.
        </Text>
        <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.btnText}>Voltar para o login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Esqueci minha senha</Text>
      <Text style={styles.subtitle}>Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.</Text>
      <TextInput
        style={styles.input}
        placeholder="E-mail"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleSubmit} disabled={loading}>
        <Text style={styles.btnText}>{loading ? 'Enviando...' : 'Enviar link'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>Voltar para o login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#FFFFFF' },
  title: { fontSize: 24, fontWeight: '700', color: '#0A0A0F', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 24, lineHeight: 20 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 16 },
  error: { color: '#DC2626', fontSize: 13, marginBottom: 8 },
  btn: { backgroundColor: '#6D28D9', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
  link: { color: '#6D28D9', textAlign: 'center', marginTop: 16, fontSize: 14 },
});
