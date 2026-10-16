import React, { useCallback, useEffect, useState } from 'react';
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
import { AppButton, AppCard, AppInput, ListRow, ScreenHeader } from '../../components/AppUI';
import { User } from 'lucide-react-native';
import { PlanUsageIndicator } from '../../components/PlanUsageIndicator';

interface Customer {
  id: string;
  name: string;
  phone: string | null;
}

type Props = NativeStackScreenProps<ClientesStackParamList, 'ClientesList'>;

export function ClientesScreen({ navigation }: Props) {
  const { company } = useAuth();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);
  const fetchPage = useCallback(
    async (page: number) =>
      (
        await api.get<{ data: Customer[] }>(
          `/customers?page=${page}&limit=20${query ? `&search=${encodeURIComponent(query)}` : ''}`,
        )
      ).data,
    [company?.id, query],
  );
  const { items, loading, failed, refresh, loadMore, loadingMore, hasMore } = usePagedList(
    fetchPage,
    20,
  );
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Clientes" subtitle="Pessoas e empresas atendidas" />
      <PlanUsageIndicator code="CUSTOMERS" />
      <AppInput
        label="Buscar cliente"
        value={search}
        onChangeText={setSearch}
        placeholder="Nome ou telefone"
      />
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
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator color="#6D28D9" style={{ margin: 16 }} />
            ) : hasMore ? (
              <AppButton label="Ver mais clientes" variant="secondary" onPress={loadMore} />
            ) : null
          }
          contentContainerStyle={{ paddingBottom: 100 }}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <AppCard style={styles.item}>
              <ListRow
                icon={User}
                label={item.name}
                sub={item.phone ?? undefined}
                onPress={() => navigation.navigate('ClienteDetail', { id: item.id })}
              />
            </AppCard>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {search.trim()
                ? 'Nenhum cliente com esse nome ou telefone.'
                : 'Nenhum cliente cadastrado ainda.'}
            </Text>
          }
        />
      )}
      <View style={styles.fab}>
        <AppButton label="Novo cliente" onPress={() => navigation.navigate('ClienteCreate')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  item: { marginBottom: 8, paddingVertical: 0 },
  name: { fontSize: 16, fontWeight: '500', color: '#0A0A0F' },
  phone: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  empty: { textAlign: 'center', color: '#6B7280', marginTop: 48, fontSize: 14 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    width: 168,
  },
  fabText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
});
