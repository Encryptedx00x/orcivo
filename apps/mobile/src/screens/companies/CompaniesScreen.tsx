import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Building2, Check, Plus, TicketCheck } from 'lucide-react-native';
import { useAuth, type CompanyMembership } from '../../contexts/AuthContext';
import { extractInviteToken } from '../auth/invite-state';
import { theme } from '../../theme';
import { useRoute, type RouteProp } from '@react-navigation/native';

type CompaniesRoute = RouteProp<{ Empresas: { token?: string } | undefined }, 'Empresas'>;

const roleLabel = (role: CompanyMembership['role']) =>
  role === 'OWNER' ? 'Proprietário' : role === 'ADMIN' ? 'Administrador' : 'Membro';

export function CompaniesScreen() {
  const route = useRoute<CompaniesRoute>();
  const { listCompanies, switchCompany, createCompany, acceptExistingInvite } = useAuth();
  const [companies, setCompanies] = useState<CompanyMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [invite, setInvite] = useState(route.params?.token ?? '');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCompanies(await listCompanies());
    } catch {
      Alert.alert('Empresas indisponíveis', 'Não foi possível carregar suas empresas.');
    } finally {
      setLoading(false);
    }
  }, [listCompanies]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (route.params?.token) setInvite(route.params.token);
  }, [route.params?.token]);

  const confirmSwitch = (company: CompanyMembership) => {
    if (company.active || busy) return;
    Alert.alert(
      'Trocar empresa?',
      `Os dados exibidos passarão a ser os de ${company.trade_name}.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Trocar',
          onPress: () => {
            setBusy(company.company_id);
            void switchCompany(company.company_id)
              .catch(() =>
                Alert.alert('Não foi possível trocar', 'Entre novamente se a sessão expirou.'),
              )
              .finally(() => setBusy(''));
          },
        },
      ],
    );
  };

  const handleCreate = async () => {
    const name = tradeName.trim();
    if (name.length < 2) return Alert.alert('Informe o nome', 'Use pelo menos 2 caracteres.');
    setBusy('create');
    try {
      await createCompany(name);
      setTradeName('');
      await load();
      Alert.alert('Empresa criada', 'Você continua na empresa atual até escolher Trocar.');
    } catch {
      Alert.alert('Não foi possível criar', 'Tente novamente em instantes.');
    } finally {
      setBusy('');
    }
  };

  const handleInvite = async () => {
    const token = extractInviteToken(invite);
    if (!token) return Alert.alert('Convite inválido', 'Cole o código ou o link recebido.');
    setBusy('invite');
    try {
      await acceptExistingInvite(token);
      setInvite('');
      await load();
      Alert.alert(
        'Convite aceito',
        'Sua empresa atual não mudou. Escolha Trocar quando quiser entrar na nova empresa.',
      );
    } catch {
      Alert.alert('Não foi possível aceitar', 'Confira o convite e tente novamente.');
    } finally {
      setBusy('');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.intro}>
        A empresa ativa define quais clientes, serviços e históricos aparecem neste dispositivo.
      </Text>
      <View style={styles.card}>
        <Text style={styles.title}>Suas empresas</Text>
        {loading ? <ActivityIndicator color={theme.colors.purple600} /> : null}
        {companies.map((company) => (
          <TouchableOpacity
            key={company.company_id}
            accessibilityRole="button"
            accessibilityState={{ selected: Boolean(company.active), disabled: Boolean(busy) }}
            disabled={Boolean(busy)}
            style={styles.company}
            onPress={() => confirmSwitch(company)}
          >
            <Building2 size={20} color={theme.colors.purple600} />
            <View style={styles.companyText}>
              <Text numberOfLines={1} style={styles.companyName}>
                {company.trade_name}
              </Text>
              <Text style={styles.muted}>{roleLabel(company.role)}</Text>
            </View>
            {company.active ? (
              <View style={styles.active}>
                <Check size={14} color="#5B21B6" />
                <Text style={styles.activeText}>Ativa</Text>
              </View>
            ) : (
              <Text style={styles.switchText}>
                {busy === company.company_id ? 'Trocando…' : 'Trocar'}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.card}>
        <View style={styles.heading}>
          <Plus size={19} color={theme.colors.purple600} />
          <Text style={styles.title}>Criar outra empresa</Text>
        </View>
        <Text style={styles.muted}>
          Ela começa vazia no Orcivo Livre e não recebe dados da atual.
        </Text>
        <Text style={styles.label}>Nome da empresa</Text>
        <TextInput
          style={styles.input}
          value={tradeName}
          onChangeText={setTradeName}
          maxLength={120}
        />
        <TouchableOpacity
          style={styles.button}
          disabled={Boolean(busy)}
          onPress={() => void handleCreate()}
        >
          <Text style={styles.buttonText}>{busy === 'create' ? 'Criando…' : 'Criar empresa'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={styles.heading}>
          <TicketCheck size={19} color={theme.colors.purple600} />
          <Text style={styles.title}>Aceitar convite</Text>
        </View>
        <Text style={styles.muted}>Aceitar não troca a empresa ativa automaticamente.</Text>
        <Text style={styles.label}>Código ou link do convite</Text>
        <TextInput
          style={styles.input}
          value={invite}
          onChangeText={setInvite}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={styles.button}
          disabled={Boolean(busy)}
          onPress={() => void handleInvite()}
        >
          <Text style={styles.buttonText}>
            {busy === 'invite' ? 'Aceitando…' : 'Aceitar convite'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, backgroundColor: '#F8FAFC', flexGrow: 1 },
  intro: { color: theme.colors.slate500, fontSize: 14, lineHeight: 20 },
  card: {
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.slate200,
    borderRadius: 16,
    backgroundColor: theme.colors.white,
  },
  title: { color: theme.colors.ink, fontSize: 18, lineHeight: 24, fontWeight: '700' },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  company: {
    minHeight: 64,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: theme.colors.slate200,
    borderRadius: 12,
  },
  companyText: { flex: 1, minWidth: 0 },
  companyName: { color: theme.colors.ink, fontSize: 15, fontWeight: '600' },
  muted: { color: theme.colors.slate500, fontSize: 13, lineHeight: 19 },
  active: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F5F3FF',
  },
  activeText: { color: '#5B21B6', fontSize: 12, fontWeight: '600' },
  switchText: { color: theme.colors.purple600, fontSize: 13, fontWeight: '700' },
  label: { color: theme.colors.slate700, fontSize: 13, fontWeight: '600', marginTop: 4 },
  input: {
    minHeight: 48,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.colors.slate300,
    borderRadius: 12,
    backgroundColor: theme.colors.white,
    color: theme.colors.ink,
    fontSize: 16,
  },
  button: {
    minHeight: 48,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: theme.colors.purple600,
  },
  buttonText: { color: theme.colors.white, fontSize: 15, fontWeight: '700' },
});
