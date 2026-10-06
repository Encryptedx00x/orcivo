import React from 'react';
import { Alert, Text, View } from 'react-native';
import {
  ClipboardList,
  DollarSign,
  FileText,
  FolderOpen,
  LogOut,
  Package,
  ReceiptText,
  Settings,
  Star,
} from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { easy } from '../data';
import { useEasyNav } from '../draft';
import { useSheet } from '../sheet';
import { Card, H1, Page, Row, s, useLoad } from '../ui';

const PLAN: Record<string, string> = {
  LIVRE: 'Orcivo Livre',
  SOLO: 'Orcivo Solo',
  MAIS: 'Orcivo Mais',
  EQUIPE: 'Orcivo Equipe',
};

export function MenuScreen() {
  const nav = useEasyNav();
  const sheet = useSheet();
  const { user, company, logout } = useAuth();
  const summary = useLoad(easy.summary, 'Não foi possível carregar o resumo.');
  const pending = summary.data?.kpis.os_pending;
  const companyInfo = useLoad(easy.company, 'Não foi possível carregar a empresa.');
  const plan = PLAN[companyInfo.data?.plan_code ?? 'LIVRE'] ?? 'Orcivo Livre';

  return (
    <Page top>
      <H1>Menu</H1>
      <View>
        <Text style={[s.body, { fontWeight: '700' }]}>{user?.name}</Text>
        <Text style={s.muted}>{company?.trade_name}</Text>
      </View>

      <Card style={{ overflow: 'hidden' }}>
        <Row
          icon={ClipboardList}
          label="Serviços de hoje"
          sub={pending !== undefined ? `${pending} para fazer` : 'O que fazer hoje'}
          onPress={() => nav.navigate('Services')}
        />
        <Row
          icon={DollarSign}
          label="Financeiro"
          sub="Recebido e a receber"
          onPress={() => nav.navigate('Money')}
        />
        <Row
          icon={ReceiptText}
          label="Recibos"
          sub="Gerados ao receber um pagamento"
          onPress={() => nav.navigate('Receipts')}
        />
        <Row
          icon={FolderOpen}
          label="Documentos"
          sub="Orçamentos, serviços e recibos"
          onPress={() =>
            sheet({
              title: 'Documentos',
              sub: 'Escolha o tipo',
              actions: [
                {
                  label: 'Orçamentos',
                  icon: FileText,
                  run: () => nav.navigate('EasyTabs', { screen: 'Orcamentos' }),
                },
                { label: 'Serviços', icon: ClipboardList, run: () => nav.navigate('Services') },
                { label: 'Recibos', icon: ReceiptText, run: () => nav.navigate('Receipts') },
                {
                  label: 'Todos os PDFs',
                  sub: 'Lista completa para baixar',
                  icon: FolderOpen,
                  run: () => nav.navigate('Documentos'),
                },
              ],
            })
          }
        />
        <Row
          icon={Package}
          label="Meus serviços e preços"
          sub="Itens e preços dos orçamentos"
          onPress={() => nav.navigate('Catalog')}
        />
        <Row
          icon={Settings}
          label="Configurações"
          sub="Modo fácil, empresa, Pix, aprovação"
          onPress={() => nav.navigate('Settings')}
        />
        <Row icon={Star} label="Meu plano" sub={plan} onPress={() => nav.navigate('Plano')} />
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
    </Page>
  );
}
