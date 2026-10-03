import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../config';
import type { AuthStackParamList } from '../../navigation/AuthStack';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    try {
      await login(email, password);
    } catch (e: unknown) {
      const error = (e ?? {}) as { status?: number; message?: string };
      if (error.status === 401) {
        Alert.alert('Erro', 'E-mail ou senha inválidos.');
      } else {
        Alert.alert('Erro de conexão', `Não foi possível conectar ao servidor.\n\nURL: ${API_URL}\nDetalhe: ${error.message ?? 'desconhecido'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Entrar no Orcivo</Text>
      <TextInput style={styles.input} placeholder="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Senha" value={password} onChangeText={setPassword} secureTextEntry />
      <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
        <Text style={styles.btnText}>{loading ? 'Entrando...' : 'Entrar'}</Text>
      </TouchableOpacity>
      <TouchableOpacity accessibilityRole="link" onPress={() => navigation.navigate('ForgotPassword')}>
        <Text style={styles.link}>Esqueci minha senha</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('SignupStep1')}>
        <Text style={styles.link}>Criar conta</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('AcceptInvite')}>
        <Text style={styles.link}>Tenho um convite</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#FFFFFF' },
  title: { fontSize: 24, fontWeight: '700', color: '#0A0A0F', marginBottom: 32 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 16 },
  btn: { backgroundColor: '#6D28D9', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
  link: { color: '#6D28D9', textAlign: 'center', marginTop: 16, fontSize: 14 },
});
