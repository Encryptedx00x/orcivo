import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { usePagedList } from '../../hooks/usePagedList';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../../services/api';
import type { ClientesStackParamList } from '../../navigation/AppTabs';

interface Customer {
  id: string;
  name: string;
  phone: string | null;
}

type Props = NativeStackScreenProps<ClientesStackParamList, 'ClientesList'>;

export function ClientesScreen({ navigation }: Props) {
  const { company } = useAuth();
  const fetchPage = useCallback(
    async (page: number) =>
      (await api.get<{ data: Customer[] }>(`/customers?page=${page}&limit=50`)).data,
    [company?.id],
  );
  const { items, loading, failed, refresh, loadMore, loadingMore } = usePagedList(fetchPage, 50);
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator color="#6D28D9" />
      ) : failed ? (
        <View accessibilityRole="alert">
          <Text style={styles.empty}>Não foi possível carregar os clientes.</Text>
          <TouchableOpacity accessibilityRole="button" onPress={refresh} style={styles.item}>
            <Text style={styles.name}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          refreshing={loading}
          onRefresh={refresh}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? <ActivityIndicator color="#6D28D9" style={{ margin: 16 }} /> : null
          }
          contentContainerStyle={{ paddingBottom: 100 }}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.item}
              accessibilityRole="button"
              accessibilityLabel={`Ver cliente ${item.name}`}
              onPress={() => navigation.navigate('ClienteDetail', { id: item.id })}
            >
              <Text style={styles.name}>{item.name}</Text>
              {item.phone && <Text style={styles.phone}>{item.phone}</Text>}
            </TouchableOpacity>
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
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    backgroundColor: '#6D28D9',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  fabText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
});
