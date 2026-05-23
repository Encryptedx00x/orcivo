import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CheckCircle, ClipboardList, Clock } from 'lucide-react-native';
import { workOrderService, WorkOrder } from '../services/work-order.service';

interface Props {
  navigation: any;
}

type WorkOrderStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';

const STATUS_CONFIG: Record<WorkOrderStatus, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'Pendente', color: '#374151', bg: '#F3F4F6' },
  IN_PROGRESS: { label: 'Em andamento', color: '#FFFFFF', bg: '#2563EB' },
  DONE: { label: 'Concluída', color: '#FFFFFF', bg: '#16A34A' },
  CANCELLED: { label: 'Cancelada', color: '#FFFFFF', bg: '#DC2626' },
};

function StatusBadge({ status }: { status: WorkOrderStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

export function WorkOrderListScreen({ navigation }: Props) {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await workOrderService.fetchAll(1);
      setOrders(res.data ?? []);
    } catch {
      setError('Não foi possível carregar as ordens de serviço.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const renderItem = ({ item }: { item: WorkOrder }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('WorkOrderDetail', { id: item.id })}
      accessibilityRole="button"
    >
      <View style={styles.cardHeader}>
        <ClipboardList size={16} color="#6D28D9" />
        <Text style={styles.orderNumber}>OS #{item.number}</Text>
        <StatusBadge status={item.status as WorkOrderStatus} />
      </View>
      <Text style={styles.orderTitle}>{item.title}</Text>
      <View style={styles.cardFooter}>
        <Clock size={14} color="#6B7280" />
        <Text style={styles.customerName}>{item.customer.name}</Text>
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
        contentContainerStyle={orders.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={
          <View style={styles.center}>
            <CheckCircle size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>Nenhuma ordem de serviço encontrada</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
  retryBtn: { backgroundColor: '#6D28D9', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  emptyText: { fontSize: 15, color: '#6B7280', textAlign: 'center', marginTop: 16 },
});
