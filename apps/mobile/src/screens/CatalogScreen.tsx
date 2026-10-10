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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { catalogService, CatalogItem } from '../services/catalog.service';
import type { MaisStackParamList } from '../navigation/MaisStack';
import { theme } from '../theme';

const { colors, radius, space, type } = theme;

type Props = NativeStackScreenProps<MaisStackParamList, 'Catalog'>;

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
          <Package size={20} color={colors.purple600} />
        ) : (
          <Wrench size={20} color={colors.purple600} />
        )}
        <View style={styles.cardInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <View
            style={[
              styles.badge,
              item.type === 'PRODUCT' ? styles.badgeProduct : styles.badgeService,
            ]}
          >
            <Text style={styles.badgeText}>{item.type === 'PRODUCT' ? 'Produto' : 'Serviço'}</Text>
          </View>
        </View>
      </View>
      <Text style={styles.price}>{formatMoney(item.unit_price)}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.purple600} />
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
          <Plus size={24} color={colors.white} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: space.xl },
  emptyContainer: { flex: 1 },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: space.lg,
    borderBottomWidth: 1,
    borderColor: colors.slate200,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: space.md, flex: 1 },
  cardInfo: { flex: 1 },
  itemName: { fontSize: type.small, fontWeight: type.semibold, color: colors.ink, marginBottom: 4 },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  badgeService: { backgroundColor: colors.purple100 },
  badgeProduct: { backgroundColor: colors.successBg },
  badgeText: { fontSize: type.caption, color: colors.purple600, fontWeight: type.medium },
  price: { fontSize: type.small, fontWeight: type.bold, color: colors.ink },
  errorText: { fontSize: 15, color: colors.danger, textAlign: 'center', marginBottom: space.lg },
  retryBtn: {
    backgroundColor: colors.purple600,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.sm,
  },
  retryText: { color: colors.white, fontSize: 15, fontWeight: type.semibold },
  emptyText: { fontSize: 15, color: colors.slate500, textAlign: 'center', marginBottom: space.lg },
  addBtn: {
    backgroundColor: colors.purple600,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.sm,
  },
  addBtnText: { color: colors.white, fontSize: 15, fontWeight: type.semibold },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.purple600,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});
