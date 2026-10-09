import React, { useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CheckCircle, ClipboardList, Clock, Plus } from 'lucide-react-native';
import { formatMoney, WORK_ORDER_STATUS_LABELS } from '@orcivo/shared-types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { usePagedList } from '../hooks/usePagedList';
import { workOrderService, WorkOrder } from '../services/work-order.service';
import type { MaisStackParamList } from '../navigation/MaisStack';
import { STATUS_COLORS, type WorkOrderStatus } from './os/os-status';

type Props = NativeStackScreenProps<MaisStackParamList, 'WorkOrderList'>;

function StatusBadge({ status }: { status: WorkOrderStatus }) {
  const cfg = STATUS_COLORS[status] ?? STATUS_COLORS.PENDING;
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.badgeText, { color: cfg.color }]}>
        {WORK_ORDER_STATUS_LABELS[status]}
      </Text>
    </View>
  );
}

export function WorkOrderListScreen({ navigation }: Props) {
  const fetchPage = useCallback(
    async (page: number) => (await workOrderService.fetchAll(page)).data ?? [],
    [],
  );
  const list = usePagedList(fetchPage);
  const { items: orders, loading, refresh: load } = list;
  const error = list.failed ? 'Não foi possível carregar as ordens de serviço.' : null;

  useEffect(() => {
    load();
    // Back from "Nova OS" or a detail: show the fresh list.
    return navigation.addListener('focus', load);
  }, [load, navigation]);

  const renderItem = ({ item }: { item: WorkOrder }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('WorkOrderDetail', { id: item.id })}
      accessibilityRole="button"
    >
      <View style={styles.cardHeader}>
        <ClipboardList size={16} color="#6D28D9" />
        <Text style={styles.orderNumber}>OS #{item.number}</Text>
        <StatusBadge status={item.status} />
      </View>
      <Text style={styles.orderTitle}>{item.title}</Text>
      <View style={styles.cardFooter}>
        <Clock size={14} color="#6B7280" />
        <Text style={styles.customerName}>{item.customer.name}</Text>
        {item.quote?.total ? (
          <Text style={styles.total}>{formatMoney(item.quote.total)}</Text>
        ) : null}
      </View>
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
        data={orders}
        keyExtractor={(o) => o.id}
        renderItem={renderItem}
        onRefresh={load}
        refreshing={loading}
        onEndReached={list.loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          list.loadingMore ? <ActivityIndicator color="#6D28D9" style={{ margin: 16 }} /> : null
        }
        contentContainerStyle={orders.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={
          <View style={styles.center}>
            <CheckCircle size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>Nenhuma ordem de serviço encontrada</Text>
          </View>
        }
      />
      <TouchableOpacity
        accessibilityRole="button"
        style={styles.fab}
        onPress={() => navigation.navigate('WorkOrderCreate')}
      >
        <Plus size={18} color="#FFFFFF" />
        <Text style={styles.fabText}>Nova OS</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#6D28D9',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  fabText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  total: { marginLeft: 'auto', fontSize: 14, fontWeight: '700', color: '#0A0A0F' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyContainer: { flex: 1 },
  card: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  orderNumber: { fontSize: 14, fontWeight: '700', color: '#0A0A0F', flex: 1 },
  orderTitle: { fontSize: 15, color: '#0A0A0F', marginBottom: 8 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  customerName: { fontSize: 13, color: '#6B7280' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  badgeText: { fontSize: 12, fontWeight: '500' },
  errorText: { fontSize: 15, color: '#DC2626', textAlign: 'center', marginBottom: 16 },
  retryBtn: {
    backgroundColor: '#6D28D9',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  emptyText: { fontSize: 15, color: '#6B7280', textAlign: 'center', marginTop: 16 },
});
