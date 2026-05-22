import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home, Users, FileText, Calendar, MoreHorizontal } from 'lucide-react-native';
import { InicioScreen } from '../screens/inicio/InicioScreen';
import { ClientesScreen } from '../screens/clientes/ClientesScreen';
import { ClienteCreateScreen } from '../screens/clientes/ClienteCreateScreen';
import { EmBreveScreen } from '../screens/placeholders/EmBreveScreen';
import { MaisStack } from './MaisStack';

const Tab = createBottomTabNavigator();
const ClientesStack = createNativeStackNavigator();

function ClientesNavigator() {
  return (
    <ClientesStack.Navigator screenOptions={{ headerTintColor: '#6D28D9' }}>
      <ClientesStack.Screen name="ClientesList" component={ClientesScreen} options={{ title: 'Clientes' }} />
      <ClientesStack.Screen name="ClienteCreate" component={ClienteCreateScreen} options={{ title: 'Novo cliente' }} />
    </ClientesStack.Navigator>
  );
}

export function AppTabs() {
  return (
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: '#6D28D9', tabBarInactiveTintColor: '#6B7280', headerShown: false }}>
      <Tab.Screen name="Início" component={InicioScreen} options={{ tabBarIcon: ({ color, size }) => <Home size={size} color={color} /> }} />
      <Tab.Screen name="Clientes" component={ClientesNavigator} options={{ tabBarIcon: ({ color, size }) => <Users size={size} color={color} /> }} />
      <Tab.Screen name="Orçamentos" component={EmBreveScreen} options={{ tabBarIcon: ({ color, size }) => <FileText size={size} color={color} /> }} />
      <Tab.Screen name="Agenda" component={EmBreveScreen} options={{ tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} /> }} />
      <Tab.Screen name="Mais" component={MaisStack} options={{ tabBarIcon: ({ color, size }) => <MoreHorizontal size={size} color={color} /> }} />
    </Tab.Navigator>
  );
}
