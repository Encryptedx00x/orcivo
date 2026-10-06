import React from 'react';
import { Alert, Text, View } from 'react-native';
import {
  ClipboardList,
  CreditCard,
  FileStack,
  LogOut,
  Settings,
  Tag,
  User,
  Users,
  Wallet,
} from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useEasyMode } from '../EasyModeContext';
import { useEasyNav } from '../draft';
import { C, Card, H1, Page, Row, SectionLabel, Toggle, s } from '../ui';

export function MenuScreen() {
  const nav = useEasyNav();
  const { user, company, logout } = useAuth();
  const { setEasy } = useEasyMode();

  return (
    <Page top>
      <H1>Menu</H1>
      <View>
        <Text style={[s.body, { fontWeight: '700' }]}>{user?.name}</Text>
        <Text style={s.muted}>{company?.trade_name}</Text>
      </View>

      <SectionLabel>Trabalho</SectionLabel>
      <Card style={{ overflow: 'hidden' }}>
        <Row
          icon={ClipboardList}
          label="Serviços"
          sub="Hoje e em andamento"
          onPress={() => nav.navigate('Services')}
        />
        <Row
          icon={Wallet}
          label="Financeiro"
          sub="Receber e ver o que entrou"
          onPress={() => nav.navigate('Money')}
        />
        <Row icon={Tag} label="Meus serviços e preços" onPress={() => nav.navigate('Catalog')} />
        <Row icon={FileStack} label="Documentos" onPress={() => nav.navigate('Documentos')} />
      </Card>

      <SectionLabel>Conta e empresa</SectionLabel>
      <Card style={{ overflow: 'hidden' }}>
        <Row icon={User} label="Minha conta" onPress={() => nav.navigate('Conta')} />
        <Row icon={Users} label="Equipe" onPress={() => nav.navigate('Equipe')} />
        <Row
          icon={Settings}
          label="Configurações"
          sub="Dados da empresa, Pix, aprovação"
          onPress={() => nav.navigate('Configuracoes')}
        />
        <Row icon={CreditCard} label="Plano e assinatura" onPress={() => nav.navigate('Plano')} />
      </Card>

      <Card style={{ paddingHorizontal: 16, paddingVertical: 6 }}>
        <Toggle
          on
          onChange={(on) => !on && setEasy(false)}
          label="Modo fácil"
          sub="Desligue para ver o app completo. Dá para voltar pelo menu Mais."
        />
      </Card>

      <Card style={{ overflow: 'hidden' }}>
        <Row
          icon={LogOut}
          label="Sair"
          danger
          onPress={() =>
            Alert.alert('Sair', 'Sair da sua conta neste celular?', [
              { text: 'Voltar', style: 'cancel' },
              { text: 'Sair', style: 'destructive', onPress: () => void logout() },
            ])
          }
        />
      </Card>
      <Text style={[s.muted, { textAlign: 'center', color: C.fg4 }]}>Orcivo</Text>
    </Page>
  );
}
