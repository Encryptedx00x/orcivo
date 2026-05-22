import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { EmBreveScreen } from '../screens/placeholders/EmBreveScreen';

const Stack = createNativeStackNavigator();

const MAIS_ITEMS = [
  'Ordens de Serviço', 'Catálogo', 'Financeiro', 'Documentos',
  'Conta', 'Configurações', 'Usuários e permissões', 'Plano e assinatura', 'Ajuda',
];

function MaisMenuScreen({ navigation }: { navigation: any }) {
  return (
    <View style={styles.container}>
      {MAIS_ITEMS.map(item => (
        <TouchableOpacity key={item} style={styles.row} onPress={() => navigation.navigate('EmBreve', { title: item })}>
          <Text style={styles.label}>{item}</Text>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function MaisStack() {
  return (
    <Stack.Navigator screenOptions={{ headerTintColor: '#6D28D9' }}>
      <Stack.Screen name="MaisMenu" component={MaisMenuScreen} options={{ title: 'Mais' }} />
      <Stack.Screen name="EmBreve" component={EmBreveScreen} options={({ route }: any) => ({ title: route.params?.title ?? 'Em breve' })} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#E5E7EB' },
  label: { fontSize: 16, color: '#0A0A0F' },
  arrow: { fontSize: 20, color: '#6B7280' },
});
