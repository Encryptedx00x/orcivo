import React, { useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CheckCircle, Clock, FileText, Plus, XCircle } from 'lucide-react-native';
import { formatMoney } from '@orcivo/shared-types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { usePagedList } from '../hooks/usePagedList';
import { quoteService, Quote, QuoteStatus } from '../services/quote.service';
import type { QuotesStackParamList } from '../navigation/AppTabs';

type Props = NativeStackScreenProps<QuotesStackParamList, 'QuotesList'>;

const STATUS_LABEL: Record<QuoteStatus, string> = {
  DRAFT: 'Rascunho',
  SENT: 'Enviado',
  APPROVED: 'Aprovado',
  REJECTED: 'Recusado',
  CANCELLED: 'Cancelado',
  EXPIRED: 'Expirado',
};

const STATUS_COLOR: Record<QuoteStatus, string> = {
  DRAFT: '#6B7280',
  SENT: '#F59E0B',
  APPROVED: '#16A34A',
  REJECTED: '#DC2626',
  CANCELLED: '#374151',
  EXPIRED: '#EA580C',
};

function StatusIcon({ status }: { status: QuoteStatus }) {
  const color = STATUS_COLOR[status];
  const size = 16;
  switch (status) {
    case 'APPROVED':
      return <CheckCircle size={size} color={color} />;
    case 'REJECTED':
    case 'CANCELLED':
      return <XCircle size={size} color={color} />;
    case 'SENT':
    case 'EXPIRED':
      return <Clock size={size} color={color} />;
    default:
      return <FileText size={size} color={color} />;
  }
}

export function QuoteListScreen({ navigation }: Props) {
  const fetchPage = useCallback(
    async (page: number) => (await quoteService.fetchQuotes(page)).data ?? [],
    [],
  );
  const list = usePagedList(fetchPage);
  const { items: quotes, loading, refresh: load } = list;
  const error = list.failed ? 'Não foi possível carregar os orçamentos.' : null;

  useEffect(() => {
    load();
  }, [load]);

  const renderItem = ({ item }: { item: Quote }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('QuoteDetail', { id: item.id })}
      accessibilityRole="button"
    >
      <View style={styles.cardRow}>
        <FileText size={20} color="#6D28D9" />
        <View style={styles.cardInfo}>
          <Text style={styles.quoteTitle}>
            {item.title ? `#${item.number} — ${item.title}` : `Orçamento #${item.number}`}
          </Text>
          <Text style={styles.clientName}>{item.customer.name}</Text>
        </View>
        <View style={styles.rightCol}>
          <Text style={styles.total}>{formatMoney(item.total)}</Text>
          <View style={[styles.badge, { backgroundColor: STATUS_COLOR[item.status] + '20' }]}>
            <StatusIcon status={item.status} />
            <Text style={[styles.badgeText, { color: STATUS_COLOR[item.status] }]}>
              {STATUS_LABEL[item.status]}
            </Text>
          </View>
        </View>
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
        data={quotes}
        keyExtractor={(q) => q.id}
        renderItem={renderItem}
        onRefresh={load}
        refreshing={loading}
        onEndReached={list.loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          list.loadingMore ? <ActivityIndicator color="#6D28D9" style={{ margin: 16 }} /> : null
        }
        contentContainerStyle={quotes.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>Nenhum orçamento ainda</Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => navigation.navigate('QuoteCreate')}
            >
              <Text style={styles.addBtnText}>Criar orçamento</Text>
            </TouchableOpacity>
          </View>
        }
      />
      {quotes.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('QuoteCreate')}
          accessibilityLabel="Criar orçamento"
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
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  cardInfo: { flex: 1 },
  rightCol: { alignItems: 'flex-end', gap: 4 },
  quoteTitle: { fontSize: 15, fontWeight: '600', color: '#0A0A0F', marginBottom: 2 },
  clientName: { fontSize: 13, color: '#6B7280' },
  total: { fontSize: 15, fontWeight: '700', color: '#0A0A0F' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: { fontSize: 12, fontWeight: '500' },
  errorText: { fontSize: 15, color: '#DC2626', textAlign: 'center', marginBottom: 16 },
  retryBtn: {
    backgroundColor: '#6D28D9',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  emptyText: { fontSize: 15, color: '#6B7280', textAlign: 'center', marginBottom: 16 },
  addBtn: {
    backgroundColor: '#6D28D9',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
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
