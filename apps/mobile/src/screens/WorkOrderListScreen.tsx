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
import { theme } from '../theme';
import { PlanUsageIndicator } from '../components/PlanUsageIndicator';

const { colors, radius, space, type } = theme;

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
        <ClipboardList size={16} color={colors.purple600} />
        <Text style={styles.orderNumber}>OS #{item.number}</Text>
        <StatusBadge status={item.status} />
      </View>
      <Text style={styles.orderTitle}>{item.title}</Text>
      <View style={styles.cardFooter}>
        <Clock size={14} color={colors.slate500} />
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
        ListHeaderComponent={<PlanUsageIndicator code="WORK_ORDERS_MONTH" />}
        data={orders}
        keyExtractor={(o) => o.id}
        renderItem={renderItem}
        onRefresh={load}
        refreshing={loading}
        onEndReached={list.loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          list.loadingMore ? (
            <ActivityIndicator color={colors.purple600} style={{ margin: 16 }} />
          ) : null
        }
        contentContainerStyle={orders.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={
          <View style={styles.center}>
            <CheckCircle size={48} color={colors.slate300} />
            <Text style={styles.emptyText}>Nenhuma ordem de serviço encontrada</Text>
          </View>
        }
      />
      <TouchableOpacity
        accessibilityRole="button"
        style={styles.fab}
        onPress={() => navigation.navigate('WorkOrderCreate')}
      >
        <Plus size={18} color={colors.white} />
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
    backgroundColor: colors.purple600,
    borderRadius: radius.xl,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  fabText: { color: colors.white, fontSize: 15, fontWeight: type.bold },
  total: { marginLeft: 'auto', fontSize: type.small, fontWeight: type.bold, color: colors.ink },
  container: { flex: 1, backgroundColor: colors.white },
  listContent: { paddingTop: 12, paddingHorizontal: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: space.xl },
  emptyContainer: { flex: 1 },
  card: {
    padding: space.lg,
    borderBottomWidth: 1,
    borderColor: colors.slate200,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: 6 },
  orderNumber: { fontSize: type.small, fontWeight: type.bold, color: colors.ink, flex: 1 },
  orderTitle: { fontSize: 15, color: colors.ink, marginBottom: 8 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  customerName: { fontSize: 13, color: colors.slate500 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm },
  badgeText: { fontSize: type.caption, fontWeight: type.medium },
  errorText: { fontSize: 15, color: colors.danger, textAlign: 'center', marginBottom: space.lg },
  retryBtn: {
    backgroundColor: colors.purple600,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.sm,
  },
  retryText: { color: colors.white, fontSize: 15, fontWeight: type.semibold },
  emptyText: { fontSize: 15, color: colors.slate500, textAlign: 'center', marginTop: space.lg },
});
