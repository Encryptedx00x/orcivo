import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home, Users, FileText, Calendar, MoreHorizontal } from 'lucide-react-native';
import { InicioScreen } from '../screens/inicio/InicioScreen';
import { ClientesScreen } from '../screens/clientes/ClientesScreen';
import { ClienteCreateScreen } from '../screens/clientes/ClienteCreateScreen';
import { EmBreveScreen } from '../screens/placeholders/EmBreveScreen';
import { QuoteListScreen } from '../screens/QuoteListScreen';
import { QuoteDetailScreen } from '../screens/QuoteDetailScreen';
import { QuoteCreateScreen } from '../screens/QuoteCreateScreen';
import { MaisStack } from './MaisStack';

const Tab = createBottomTabNavigator();
const ClientesStack = createNativeStackNavigator();
const QuotesStack = createNativeStackNavigator();

function ClientesNavigator() {
  return (
    <ClientesStack.Navigator screenOptions={{ headerTintColor: '#6D28D9' }}>
      <ClientesStack.Screen name="ClientesList" component={ClientesScreen} options={{ title: 'Clientes' }} />
      <ClientesStack.Screen name="ClienteCreate" component={ClienteCreateScreen} options={{ title: 'Novo cliente' }} />
    </ClientesStack.Navigator>
  );
}

function QuotesNavigator() {
  return (
    <QuotesStack.Navigator screenOptions={{ headerTintColor: '#6D28D9' }}>
      <QuotesStack.Screen name="QuotesList" component={QuoteListScreen} options={{ title: 'Orçamentos' }} />
      <QuotesStack.Screen name="QuoteDetail" component={QuoteDetailScreen} options={{ title: 'Orçamento' }} />
      <QuotesStack.Screen name="QuoteCreate" component={QuoteCreateScreen} options={{ title: 'Novo orçamento' }} />
    </QuotesStack.Navigator>
  );
}

export function AppTabs() {
  return (
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: '#6D28D9', tabBarInactiveTintColor: '#6B7280', headerShown: false }}>
      <Tab.Screen name="Início" component={InicioScreen} options={{ tabBarIcon: ({ color, size }) => <Home size={size} color={color} /> }} />
      <Tab.Screen name="Clientes" component={ClientesNavigator} options={{ tabBarIcon: ({ color, size }) => <Users size={size} color={color} /> }} />
      <Tab.Screen name="Orçamentos" component={QuotesNavigator} options={{ tabBarIcon: ({ color, size }) => <FileText size={size} color={color} /> }} />
      <Tab.Screen name="Agenda" component={EmBreveScreen} options={{ tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} /> }} />
      <Tab.Screen name="Mais" component={MaisStack} options={{ tabBarIcon: ({ color, size }) => <MoreHorizontal size={size} color={color} /> }} />
    </Tab.Navigator>
  );
}
