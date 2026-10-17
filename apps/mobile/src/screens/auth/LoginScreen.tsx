import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Building2, LockKeyhole, Mail } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../contexts/AuthContext';
import type { AuthStackParamList } from '../../navigation/AuthStack';
import { AuthScaffold } from '../../components/AuthScaffold';
import { theme } from '../../theme';
import { describeLoginError } from './login-feedback';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { login, pendingCompanySelection, selectCompany, cancelCompanySelection } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    try {
      await login(email, password);
    } catch (e: unknown) {
      const feedback = describeLoginError(e);
      Alert.alert(feedback.title, feedback.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompany = async (companyId: string) => {
    setLoading(true);
    try {
      await selectCompany(companyId);
    } catch (e: unknown) {
      const feedback = describeLoginError(e);
      Alert.alert('Não foi possível entrar', feedback.message);
      cancelCompanySelection();
    } finally {
      setLoading(false);
    }
  };

  if (pendingCompanySelection) {
    return (
      <AuthScaffold
        title="Escolha a empresa"
        subtitle="Clientes, serviços e históricos ficam separados em cada empresa."
      >
        <View style={styles.companyList}>
          {pendingCompanySelection.companies.map((company) => (
            <TouchableOpacity
              key={company.company_id}
              accessibilityRole="button"
              disabled={loading}
              style={styles.companyButton}
              onPress={() => void handleCompany(company.company_id)}
            >
              <Building2 size={20} color={theme.colors.purple600} />
              <View style={styles.companyText}>
                <Text style={styles.companyName}>{company.trade_name}</Text>
                <Text style={styles.companyRole}>
                  {company.role === 'OWNER'
                    ? 'Proprietário'
                    : company.role === 'ADMIN'
                      ? 'Administrador'
                      : 'Membro'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.secondaryBtn} onPress={cancelCompanySelection}>
          <Text style={styles.secondaryText}>Voltar</Text>
        </TouchableOpacity>
      </AuthScaffold>
    );
  }

  return (
    <AuthScaffold
      title="Bem-vindo de volta"
      subtitle="Entre para continuar organizando seus atendimentos."
    >
      <Text style={styles.label}>E-mail</Text>
      <View style={styles.inputRow}>
        <Mail size={18} color={theme.colors.slate500} />
        <TextInput
          style={styles.input}
          placeholder="voce@empresa.com.br"
          placeholderTextColor={theme.colors.slate500}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
      </View>
      <View style={styles.passwordHeader}>
        <Text style={styles.label}>Senha</Text>
        <TouchableOpacity
          accessibilityRole="link"
          onPress={() => navigation.navigate('ForgotPassword')}
        >
          <Text style={styles.inlineLink}>Esqueci minha senha</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.inputRow}>
        <LockKeyhole size={18} color={theme.colors.slate500} />
        <TextInput
          style={styles.input}
          placeholder="Sua senha"
          placeholderTextColor={theme.colors.slate500}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
        />
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        style={[styles.btn, loading && styles.disabled]}
        onPress={handleLogin}
        disabled={loading || !email || !password}
      >
        <Text style={styles.btnText}>{loading ? 'Entrando…' : 'Entrar'}</Text>
      </TouchableOpacity>
      <View style={styles.dividerRow}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>Primeiro acesso?</Text>
        <View style={styles.divider} />
      </View>
      <TouchableOpacity
        style={styles.secondaryBtn}
        onPress={() => navigation.navigate('SignupStep1')}
      >
        <Text style={styles.secondaryText}>Criar conta grátis</Text>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="link"
        onPress={() => navigation.navigate('AcceptInvite')}
      >
        <Text style={styles.inviteLink}>Entrar com um convite</Text>
      </TouchableOpacity>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  label: {
    color: theme.colors.slate700,
    fontSize: theme.type.small,
    fontWeight: theme.type.semibold,
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.space.lg,
  },
  inlineLink: {
    color: theme.colors.purple600,
    fontSize: theme.type.caption,
    fontWeight: theme.type.semibold,
  },
  inputRow: {
    minHeight: 50,
    marginTop: theme.space.sm,
    paddingHorizontal: theme.space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    borderWidth: 1,
    borderColor: theme.colors.slate200,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.white,
  },
  input: { flex: 1, minHeight: 48, color: theme.colors.ink, fontSize: theme.type.body },
  btn: {
    minHeight: 50,
    backgroundColor: theme.colors.purple600,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.space.xl,
  },
  disabled: { opacity: 0.55 },
  btnText: {
    color: theme.colors.white,
    fontWeight: theme.type.semibold,
    fontSize: theme.type.body,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    marginVertical: theme.space.xl,
  },
  divider: { flex: 1, height: 1, backgroundColor: theme.colors.slate200 },
  dividerText: { color: theme.colors.slate500, fontSize: theme.type.caption },
  secondaryBtn: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: theme.colors.slate300,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    color: theme.colors.slate700,
    fontSize: theme.type.small,
    fontWeight: theme.type.semibold,
  },
  inviteLink: {
    marginTop: theme.space.lg,
    color: theme.colors.purple600,
    textAlign: 'center',
    fontSize: theme.type.small,
    fontWeight: theme.type.semibold,
  },
  companyList: { gap: theme.space.sm, marginBottom: theme.space.lg },
  companyButton: {
    minHeight: 60,
    padding: theme.space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    borderWidth: 1,
    borderColor: theme.colors.slate200,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.white,
  },
  companyText: { flex: 1 },
  companyName: { color: theme.colors.ink, fontSize: theme.type.body, fontWeight: '600' },
  companyRole: { marginTop: 2, color: theme.colors.slate500, fontSize: theme.type.caption },
});
