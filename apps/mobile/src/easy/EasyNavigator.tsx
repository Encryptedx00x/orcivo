import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Calendar, FileText, Home, Menu, Users } from 'lucide-react-native';
import { C } from './ui';
import type { EasyAppointment, EasyClient } from './data';
import { DraftProvider } from './draft';
import { HomeScreen } from './screens/Home';
import { ClientsScreen, ClientDetailScreen, ClientNewScreen } from './screens/Clients';
import { QuotesScreen } from './screens/Quotes';
import {
  QuoteClientScreen,
  QuoteItemsScreen,
  QuoteReviewScreen,
  QuoteSignScreen,
  QuoteDoneScreen,
} from './screens/QuoteFlow';
import { ServicesScreen, RunScreen } from './screens/Services';
import { AgendaScreen, AgendaNewScreen } from './screens/Agenda';
import { MoneyScreen } from './screens/Money';
import { MenuScreen } from './screens/Menu';
import { ReceiptsScreen, ReceiptScreen, ReceiptNewScreen } from './screens/Receipts';
import { NoticesScreen } from './screens/Notices';
import { SettingsScreen, ApprovalsScreen, EditScreen } from './screens/Settings';
// Full screens reused behind "Mais opções" — Modo fácil never removes a capability.
import { QuoteDetailScreen } from '../screens/QuoteDetailScreen';
import { WorkOrderDetailScreen } from '../screens/WorkOrderDetailScreen';
import { WorkOrderPhotoScreen } from '../screens/WorkOrderPhotoScreen';
import { CatalogScreen } from '../screens/CatalogScreen';
import { CatalogItemFormScreen } from '../screens/CatalogItemFormScreen';
import { FinanceiroScreen } from '../screens/financeiro/FinanceiroScreen';
import { DocumentosScreen } from '../screens/documentos/DocumentosScreen';
import { ConfiguracoesScreen } from '../screens/configuracoes/ConfiguracoesScreen';
import { EquipeScreen } from '../screens/equipe/EquipeScreen';
import { PlanoScreen } from '../screens/plano/PlanoScreen';
import { ContaScreen } from '../screens/conta/ContaScreen';
import { WorkOrderListScreen } from '../screens/WorkOrderListScreen';
import type { NavigatorScreenParams } from '@react-navigation/native';
import type { MaisStackParamList } from '../navigation/MaisStack';

export type EasyTabsParamList = {
  Inicio: undefined;
  Clientes: undefined;
  Orcamentos: undefined;
  /** day (yyyy-mm-dd): opens on the day just booked. */
  Agenda: { day?: string } | undefined;
  Menu: undefined;
};

export type EasyStackParamList = {
  EasyTabs: NavigatorScreenParams<EasyTabsParamList> | undefined;
  QuoteClient: undefined;
  QuoteItems: undefined;
  QuoteReview: undefined;
  QuoteSign: { standalone?: boolean } | undefined;
  QuoteDone: { number: number; total: string; name: string };
  ClientDetail: { id: string };
  ClientNew: { forQuote?: boolean; forReceipt?: boolean; edit?: EasyClient } | undefined;
  Services: undefined;
  Run: { id: string };
  Money: undefined;
  Notices: undefined;
  Receipts: undefined;
  Receipt: { id: string };
  /** due: "Cobrança para receber depois" (due date instead of how/when it was paid). */
  ReceiptNew: { link?: boolean; clientId?: string; due?: boolean } | undefined;
  Settings: undefined;
  Approvals: undefined;
  Edit: { kind: string; id?: string; name?: string; price?: string; amount?: string; due?: string };
  AgendaNew:
    | {
        edit?: EasyAppointment;
        day?: string;
        time?: string;
        client?: { id: string; name: string };
        type?: string;
      }
    | undefined;
  // Reused full screens (same route names/params as MaisStack / QuotesStack).
  QuoteDetail: { id: string };
  WorkOrderList: undefined;
  WorkOrderDetail: { id: string };
  WorkOrderPhoto: MaisStackParamList['WorkOrderPhoto'];
  Catalog: undefined;
  CatalogItemForm: MaisStackParamList['CatalogItemForm'];
  Financeiro: undefined;
  Documentos: undefined;
  Configuracoes: undefined;
  Equipe: undefined;
  Plano: undefined;
  Conta: undefined;
};

const Tab = createBottomTabNavigator<EasyTabsParamList>();
const Stack = createNativeStackNavigator<EasyStackParamList>();

// The full screens are typed against their own stacks; route names and params match.
const reuse = (c: unknown) => c as React.ComponentType<object>;

function EasyTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.purple,
        tabBarInactiveTintColor: C.fg4,
        tabBarLabelStyle: { fontSize: 13, fontWeight: '600' },
        tabBarStyle: { height: 70, paddingBottom: 10, paddingTop: 6 },
      }}
    >
      <Tab.Screen
        name="Inicio"
        component={HomeScreen}
        options={{ title: 'Início', tabBarIcon: ({ color }) => <Home size={26} color={color} /> }}
      />
      <Tab.Screen
        name="Clientes"
        component={ClientsScreen}
        options={{ tabBarIcon: ({ color }) => <Users size={26} color={color} /> }}
      />
      <Tab.Screen
        name="Orcamentos"
        component={QuotesScreen}
        options={{
          title: 'Orçamentos',
          tabBarIcon: ({ color }) => <FileText size={26} color={color} />,
        }}
      />
      <Tab.Screen
        name="Agenda"
        component={AgendaScreen}
        options={{ tabBarIcon: ({ color }) => <Calendar size={26} color={color} /> }}
      />
      <Tab.Screen
        name="Menu"
        component={MenuScreen}
        options={{ tabBarIcon: ({ color }) => <Menu size={26} color={color} /> }}
      />
    </Tab.Navigator>
  );
}

export function EasyNavigator() {
  return (
    <DraftProvider>
      <Stack.Navigator
        screenOptions={{
          headerTintColor: C.purple,
          headerTitleStyle: { fontSize: 18, fontWeight: '700', color: C.ink },
          headerBackTitle: 'Voltar',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: C.bg },
        }}
      >
        <Stack.Screen name="EasyTabs" component={EasyTabs} options={{ headerShown: false }} />
        <Stack.Screen
          name="QuoteClient"
          component={QuoteClientScreen}
          options={{ title: 'Passo 1 de 3' }}
        />
        <Stack.Screen
          name="QuoteItems"
          component={QuoteItemsScreen}
          options={{ title: 'Passo 2 de 3' }}
        />
        <Stack.Screen
          name="QuoteReview"
          component={QuoteReviewScreen}
          options={{ title: 'Passo 3 de 3' }}
        />
        <Stack.Screen
          name="QuoteSign"
          component={QuoteSignScreen}
          options={{ title: 'Assinatura' }}
        />
        <Stack.Screen
          name="QuoteDone"
          component={QuoteDoneScreen}
          options={{ title: 'Pronto', headerBackVisible: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="ClientDetail"
          component={ClientDetailScreen}
          options={{ title: 'Cliente' }}
        />
        <Stack.Screen
          name="ClientNew"
          component={ClientNewScreen}
          options={{ title: 'Cliente novo' }}
        />
        <Stack.Screen name="Services" component={ServicesScreen} options={{ title: 'Serviços' }} />
        <Stack.Screen name="Run" component={RunScreen} options={{ title: 'Serviço' }} />
        <Stack.Screen name="Money" component={MoneyScreen} options={{ title: 'Financeiro' }} />
        <Stack.Screen name="Notices" component={NoticesScreen} options={{ title: 'Avisos' }} />
        <Stack.Screen name="Receipts" component={ReceiptsScreen} options={{ title: 'Recibos' }} />
        <Stack.Screen name="Receipt" component={ReceiptScreen} options={{ title: 'Recibo' }} />
        <Stack.Screen
          name="ReceiptNew"
          component={ReceiptNewScreen}
          options={{ title: 'Novo recibo' }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: 'Configurações' }}
        />
        <Stack.Screen
          name="Approvals"
          component={ApprovalsScreen}
          options={{ title: 'Como o cliente aprova' }}
        />
        <Stack.Screen name="Edit" component={EditScreen} options={{ title: 'Editar' }} />
        <Stack.Screen
          name="AgendaNew"
          component={AgendaNewScreen}
          options={{ title: 'Marcar horário' }}
        />

        <Stack.Screen
          name="QuoteDetail"
          component={reuse(QuoteDetailScreen)}
          options={{ title: 'Orçamento' }}
        />
        <Stack.Screen
          name="WorkOrderList"
          component={reuse(WorkOrderListScreen)}
          options={{ title: 'Ordens de Serviço' }}
        />
        <Stack.Screen
          name="WorkOrderDetail"
          component={reuse(WorkOrderDetailScreen)}
          options={{ title: 'Detalhes da OS' }}
        />
        <Stack.Screen
          name="WorkOrderPhoto"
          component={reuse(WorkOrderPhotoScreen)}
          options={{ title: 'Adicionar foto' }}
        />
        <Stack.Screen
          name="Catalog"
          component={reuse(CatalogScreen)}
          options={{ title: 'Meus serviços e preços' }}
        />
        <Stack.Screen
          name="CatalogItemForm"
          component={reuse(CatalogItemFormScreen)}
          options={({ route }) => ({ title: route.params?.item ? 'Editar item' : 'Novo item' })}
        />
        <Stack.Screen
          name="Financeiro"
          component={reuse(FinanceiroScreen)}
          options={{ title: 'Financeiro' }}
        />
        <Stack.Screen
          name="Documentos"
          component={reuse(DocumentosScreen)}
          options={{ title: 'Documentos' }}
        />
        <Stack.Screen
          name="Configuracoes"
          component={reuse(ConfiguracoesScreen)}
          options={{ title: 'Configurações' }}
        />
        <Stack.Screen name="Equipe" component={reuse(EquipeScreen)} options={{ title: 'Equipe' }} />
        <Stack.Screen
          name="Plano"
          component={reuse(PlanoScreen)}
          options={{ title: 'Plano e assinatura' }}
        />
        <Stack.Screen name="Conta" component={reuse(ContaScreen)} options={{ title: 'Conta' }} />
      </Stack.Navigator>
    </DraftProvider>
  );
}
