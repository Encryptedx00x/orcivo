import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { EmBreveScreen } from '../screens/placeholders/EmBreveScreen';
import { CatalogScreen } from '../screens/CatalogScreen';
import { CatalogItemFormScreen } from '../screens/CatalogItemFormScreen';
import { WorkOrderListScreen } from '../screens/WorkOrderListScreen';
import { WorkOrderDetailScreen } from '../screens/WorkOrderDetailScreen';
import { WorkOrderPhotoScreen } from '../screens/WorkOrderPhotoScreen';

const Stack = createNativeStackNavigator();

const MAIS_ITEMS = [
  { label: 'Ordens de Serviço', screen: 'WorkOrderList' },
  { label: 'Catálogo', screen: 'Catalog' },
  { label: 'Financeiro', screen: 'EmBreve' },
  { label: 'Documentos', screen: 'EmBreve' },
  { label: 'Conta', screen: 'EmBreve' },
  { label: 'Configurações', screen: 'EmBreve' },
  { label: 'Usuários e permissões', screen: 'EmBreve' },
  { label: 'Plano e assinatura', screen: 'EmBreve' },
  { label: 'Ajuda', screen: 'EmBreve' },
];

function MaisMenuScreen({ navigation }: { navigation: any }) {
  return (
    <View style={styles.container}>
      {MAIS_ITEMS.map(item => (
        <TouchableOpacity
          key={item.label}
          style={styles.row}
          onPress={() =>
            navigation.navigate(item.screen, item.screen === 'EmBreve' ? { title: item.label } : undefined)
          }
        >
          <Text style={styles.label}>{item.label}</Text>
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

      {/* Catálogo */}
      <Stack.Screen name="Catalog" component={CatalogScreen} options={{ title: 'Catálogo' }} />
      <Stack.Screen
        name="CatalogItemForm"
        component={CatalogItemFormScreen}
        options={({ route }: any) => ({ title: route.params?.item ? 'Editar item' : 'Novo item' })}
      />

      {/* Ordens de Serviço */}
      <Stack.Screen name="WorkOrderList" component={WorkOrderListScreen} options={{ title: 'Ordens de Serviço' }} />
      <Stack.Screen name="WorkOrderDetail" component={WorkOrderDetailScreen} options={{ title: 'Detalhes da OS' }} />
      <Stack.Screen name="WorkOrderPhoto" component={WorkOrderPhotoScreen} options={{ title: 'Adicionar foto' }} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#E5E7EB' },
  label: { fontSize: 16, color: '#0A0A0F' },
  arrow: { fontSize: 20, color: '#6B7280' },
});
