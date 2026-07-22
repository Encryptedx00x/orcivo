import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../../services/api';
import type { ClientesStackParamList } from '../../navigation/AppTabs';

interface Customer { id: string; name: string; phone: string | null; }

type Props = NativeStackScreenProps<ClientesStackParamList, 'ClientesList'>;

export function ClientesScreen({ navigation }: Props) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    api.get<{ data: Customer[] }>('/customers')
      .then(r => setCustomers(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []));

  return (
    <View style={styles.container}>
      {loading ? <ActivityIndicator color="#6D28D9" /> : (
        <FlatList
          data={customers}
          keyExtractor={c => c.id}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <Text style={styles.name}>{item.name}</Text>
              {item.phone && <Text style={styles.phone}>{item.phone}</Text>}
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>Nenhum cliente cadastrado ainda.</Text>}
        />
      )}
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('ClienteCreate')}>
        <Text style={styles.fabText}>+ Novo cliente</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  item: { padding: 16, borderBottomWidth: 1, borderColor: '#E5E7EB' },
  name: { fontSize: 16, fontWeight: '500', color: '#0A0A0F' },
  phone: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  empty: { textAlign: 'center', color: '#6B7280', marginTop: 48, fontSize: 14 },
  fab: { position: 'absolute', bottom: 24, right: 16, backgroundColor: '#6D28D9', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 14 },
  fabText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
});
