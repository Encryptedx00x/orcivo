import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Package, Plus, Wrench } from 'lucide-react-native';
import { formatMoney } from '@orcivo/shared-types';
import { catalogService, CatalogItem } from '../services/catalog.service';

interface Props {
  navigation: any;
}

export function CatalogScreen({ navigation }: Props) {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await catalogService.fetchCatalog(true);
      setItems(data);
    } catch {
      setError('Não foi possível carregar o catálogo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const renderItem = ({ item }: { item: CatalogItem }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('CatalogItemForm', { item })}
      accessibilityRole="button"
    >
      <View style={styles.cardLeft}>
        {item.type === 'PRODUCT' ? (
          <Package size={20} color="#6D28D9" />
        ) : (
          <Wrench size={20} color="#6D28D9" />
        )}
        <View style={styles.cardInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <View
            style={[
              styles.badge,
              item.type === 'PRODUCT' ? styles.badgeProduct : styles.badgeService,
            ]}
          >
            <Text style={styles.badgeText}>
              {item.type === 'PRODUCT' ? 'Produto' : 'Serviço'}
            </Text>
          </View>
        </View>
      </View>
      <Text style={styles.price}>{formatMoney(item.unit_price)}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6D28D9" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        onRefresh={load}
        refreshing={loading}
        contentContainerStyle={items.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>Nenhum item no catálogo ainda</Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => navigation.navigate('CatalogItemForm', {})}
            >
              <Text style={styles.addBtnText}>Adicionar item</Text>
            </TouchableOpacity>
          </View>
        }
      />
      {items.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('CatalogItemForm', {})}
          accessibilityLabel="Adicionar item ao catálogo"
        >
          <Plus size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyContainer: { flex: 1 },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  cardInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '600', color: '#0A0A0F', marginBottom: 4 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  badgeService: { backgroundColor: '#EDE9FE' },
  badgeProduct: { backgroundColor: '#DCFCE7' },
  badgeText: { fontSize: 12, color: '#6D28D9', fontWeight: '500' },
  price: { fontSize: 15, fontWeight: '700', color: '#0A0A0F' },
  errorText: { fontSize: 15, color: '#DC2626', textAlign: 'center', marginBottom: 16 },
  retryBtn: { backgroundColor: '#6D28D9', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  emptyText: { fontSize: 15, color: '#6B7280', textAlign: 'center', marginBottom: 16 },
  addBtn: { backgroundColor: '#6D28D9', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  addBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6D28D9',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});
