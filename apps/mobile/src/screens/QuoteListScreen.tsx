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
import { theme } from '../theme';
import { PlanUsageIndicator } from '../components/PlanUsageIndicator';

const { colors, radius, space, type } = theme;

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
  DRAFT: colors.slate500,
  SENT: colors.warning,
  APPROVED: colors.success,
  REJECTED: colors.danger,
  CANCELLED: colors.slate700,
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
        <FileText size={20} color={colors.purple600} />
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
        ListHeaderComponent={<PlanUsageIndicator code="QUOTES_MONTH" />}
        data={quotes}
        keyExtractor={(q) => q.id}
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
        contentContainerStyle={quotes.length === 0 ? styles.emptyContainer : styles.listContent}
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
          <Plus size={24} color={colors.white} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  listContent: { paddingTop: 12, paddingHorizontal: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: space.xl },
  emptyContainer: { flex: 1 },
  card: {
    padding: space.lg,
    borderBottomWidth: 1,
    borderColor: colors.slate200,
  },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  cardInfo: { flex: 1 },
  rightCol: { alignItems: 'flex-end', gap: 4 },
  quoteTitle: {
    fontSize: type.small,
    fontWeight: type.semibold,
    color: colors.ink,
    marginBottom: 2,
  },
  clientName: { fontSize: 13, color: colors.slate500 },
  total: { fontSize: type.small, fontWeight: type.bold, color: colors.ink },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  badgeText: { fontSize: 12, fontWeight: '500' },
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
