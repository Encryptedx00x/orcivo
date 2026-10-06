import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home, Users, FileText, Calendar, MoreHorizontal } from 'lucide-react-native';
import { InicioScreen } from '../screens/inicio/InicioScreen';
import { ClientesScreen } from '../screens/clientes/ClientesScreen';
import { ClienteCreateScreen } from '../screens/clientes/ClienteCreateScreen';
import { ClienteDetailScreen } from '../screens/clientes/ClienteDetailScreen';
import type { NavigatorScreenParams } from '@react-navigation/native';
import { QuoteListScreen } from '../screens/QuoteListScreen';
import { QuoteDetailScreen } from '../screens/QuoteDetailScreen';
import { QuoteCreateScreen } from '../screens/QuoteCreateScreen';
import { AgendaScreen } from '../screens/agenda/AgendaScreen';
import { AgendaCreateScreen } from '../screens/agenda/AgendaCreateScreen';
import { AgendaDetailScreen } from '../screens/agenda/AgendaDetailScreen';
import type { Appointment } from '../services/appointment.service';
import { MaisStack } from './MaisStack';

export type AppTabsParamList = {
  Início: undefined;
  Clientes: NavigatorScreenParams<ClientesStackParamList>;
  Orçamentos: NavigatorScreenParams<QuotesStackParamList>;
  Agenda: NavigatorScreenParams<AgendaStackParamList>;
  Mais: undefined;
};

const Tab = createBottomTabNavigator<AppTabsParamList>();

export type ClientesStackParamList = {
  ClientesList: undefined;
  ClienteCreate: undefined;
  ClienteDetail: { id: string };
};

const ClientesStack = createNativeStackNavigator<ClientesStackParamList>();

export type QuotesStackParamList = {
  QuotesList: undefined;
  QuoteDetail: { id: string };
  /** With id: edits that draft. */
  QuoteCreate: { id?: string } | undefined;
};

const QuotesStack = createNativeStackNavigator<QuotesStackParamList>();

export type AgendaStackParamList = {
  AgendaList: undefined;
  AgendaCreate: undefined;
  AgendaDetail: { appointment: Appointment };
};

const AgendaStack = createNativeStackNavigator<AgendaStackParamList>();

function ClientesNavigator() {
  return (
    <ClientesStack.Navigator screenOptions={{ headerTintColor: '#6D28D9' }}>
      <ClientesStack.Screen
        name="ClientesList"
        component={ClientesScreen}
        options={{ title: 'Clientes' }}
      />
      <ClientesStack.Screen
        name="ClienteDetail"
        component={ClienteDetailScreen}
        options={{ title: 'Detalhes do cliente' }}
      />
      <ClientesStack.Screen
        name="ClienteCreate"
        component={ClienteCreateScreen}
        options={{ title: 'Novo cliente' }}
      />
    </ClientesStack.Navigator>
  );
}

function QuotesNavigator() {
  return (
    <QuotesStack.Navigator screenOptions={{ headerTintColor: '#6D28D9' }}>
      <QuotesStack.Screen
        name="QuotesList"
        component={QuoteListScreen}
        options={{ title: 'Orçamentos' }}
      />
      <QuotesStack.Screen
        name="QuoteDetail"
        component={QuoteDetailScreen}
        options={{ title: 'Orçamento' }}
      />
      <QuotesStack.Screen
        name="QuoteCreate"
        component={QuoteCreateScreen}
        options={{ title: 'Novo orçamento' }}
      />
    </QuotesStack.Navigator>
  );
}

function AgendaNavigator() {
  return (
    <AgendaStack.Navigator screenOptions={{ headerTintColor: '#6D28D9' }}>
      <AgendaStack.Screen
        name="AgendaList"
        component={AgendaScreen}
        options={{ title: 'Agenda' }}
      />
      <AgendaStack.Screen
        name="AgendaCreate"
        component={AgendaCreateScreen}
        options={{ title: 'Novo compromisso' }}
      />
      <AgendaStack.Screen
        name="AgendaDetail"
        component={AgendaDetailScreen}
        options={{ title: 'Compromisso' }}
      />
    </AgendaStack.Navigator>
  );
}

export function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#6D28D9',
        tabBarInactiveTintColor: '#6B7280',
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Início"
        component={InicioScreen}
        options={{ tabBarIcon: ({ color, size }) => <Home size={size} color={color} /> }}
      />
      <Tab.Screen
        name="Clientes"
        component={ClientesNavigator}
        options={{ tabBarIcon: ({ color, size }) => <Users size={size} color={color} /> }}
      />
      <Tab.Screen
        name="Orçamentos"
        component={QuotesNavigator}
        options={{ tabBarIcon: ({ color, size }) => <FileText size={size} color={color} /> }}
      />
      <Tab.Screen
        name="Agenda"
        component={AgendaNavigator}
        options={{ tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} /> }}
      />
      <Tab.Screen
        name="Mais"
        component={MaisStack}
        options={{ tabBarIcon: ({ color, size }) => <MoreHorizontal size={size} color={color} /> }}
      />
    </Tab.Navigator>
  );
}
