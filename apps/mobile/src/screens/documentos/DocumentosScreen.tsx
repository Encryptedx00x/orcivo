import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { easy, methodLabel, receiptNo, receiptOrigin, type EasyReceipt } from '../../easy/data';
import { shareReceiptPdf } from '../../easy/share';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ClipboardList, Download, FileText, Inbox, Plus, ReceiptText } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as SecureStore from 'expo-secure-store';
import { formatMoney, WORK_ORDER_STATUS_LABELS } from '@orcivo/shared-types';
import { API_URL } from '../../config';
import { refreshSession } from '../../services/api';
import { quoteService } from '../../services/quote.service';
import type { Quote, QuoteStatus } from '../../services/quote.service';
import { workOrderService } from '../../services/work-order.service';
import type { WorkOrder } from '../../services/work-order.service';
import { documentosError } from './documentos-errors';

type WorkOrderStatus = WorkOrder['status'];

const QUOTE_PILL: Record<QuoteStatus, { label: string; bg: string; color: string }> = {
  DRAFT: { label: 'Rascunho', bg: '#F1F5F9', color: '#334155' },
  SENT: { label: 'Enviado', bg: '#E0F2FE', color: '#075985' },
  APPROVED: { label: 'Aprovado', bg: '#DCFCE7', color: '#166534' },
  REJECTED: { label: 'Recusado', bg: '#FEE2E2', color: '#991B1B' },
  CANCELLED: { label: 'Cancelado', bg: '#F1F5F9', color: '#64748B' },
  EXPIRED: { label: 'Expirado', bg: '#FFEDD5', color: '#9A3412' },
};

const WORK_ORDER_PILL: Record<WorkOrderStatus, { label: string; bg: string; color: string }> = {
  PENDING: { label: 'Pendente', bg: '#F1F5F9', color: '#334155' },
  IN_PROGRESS: { label: 'Em andamento', bg: '#E0F2FE', color: '#075985' },
  DONE: { label: 'Concluída', bg: '#DCFCE7', color: '#166534' },
  CANCELLED: { label: 'Cancelada', bg: '#F1F5F9', color: '#64748B' },
  // Status extras (R5b): label publicado no shared-types.
  AWAITING_PAYMENT: {
    label: WORK_ORDER_STATUS_LABELS.AWAITING_PAYMENT,
    bg: '#DBEAFE',
    color: '#1E40AF',
  },
  WARRANTY: { label: WORK_ORDER_STATUS_LABELS.WARRANTY, bg: '#EDE9FE', color: '#4C1D95' },
};

function Pill({ config }: { config: { label: string; bg: string; color: string } }) {
  return (
    <View style={[styles.pill, { backgroundColor: config.bg }]}>
      <Text style={[styles.pillText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

type Tab = 'orc' | 'os' | 'rec';

export function DocumentosScreen() {
  const insets = useSafeAreaInsets();
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [receipts, setReceipts] = useState<EasyReceipt[]>([]);
  const navigation =
    useNavigation<NativeStackNavigationProp<{ Receipt: { id: string }; ReceiptNew: undefined }>>();
  const [tab, setTab] = useState<Tab>('orc');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const downloadLock = useRef(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setLoadError('');
      Promise.all([
        quoteService.fetchQuotes(),
        workOrderService.fetchAll(),
        easy.receipts().catch(() => [] as EasyReceipt[]),
      ])
        .then(([quotesRes, workOrdersRes, receiptRows]) => {
          if (!active) return;
          setQuotes(quotesRes.data ?? []);
          setWorkOrders(workOrdersRes.data ?? []);
          setReceipts(receiptRows);
        })
        .catch((error: unknown) => {
          if (active) setLoadError(documentosError(error, 'load'));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [attempt]),
  );

  async function downloadQuotePdf(quote: Quote) {
    if (downloadLock.current) return;
    downloadLock.current = true;
    setDownloadingId(quote.id);
    try {
      const fileUri = `${FileSystem.cacheDirectory}orcamento-${quote.number}.pdf`;
      const download = async () => {
        const token = await SecureStore.getItemAsync('access_token');
        return FileSystem.downloadAsync(`${API_URL}/quotes/${quote.id}/pdf`, fileUri, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
      };
      let result = await download();
      // Access token lasts 15 min: renew once and retry.
      if (result.status === 401 && (await refreshSession()) === 'ok') result = await download();
      if (result.status !== 200) {
        throw Object.assign(new Error(`GET quote pdf ${result.status}`), { status: result.status });
      }
      if (!(await Sharing.isAvailableAsync())) {
        throw new Error('Compartilhamento indisponível neste dispositivo.');
      }
      await Sharing.shareAsync(result.uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Orçamento #${quote.number}`,
      });
    } catch (error: unknown) {
      Alert.alert('Erro', documentosError(error, 'download'));
    } finally {
      downloadLock.current = false;
      setDownloadingId(null);
    }
  }

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator accessibilityLabel="Carregando documentos" color="#6D28D9" />
        <Text style={styles.description}>Carregando documentos…</Text>
      </View>
    );
  if (loadError)
    return (
      <View style={styles.center}>
        <Text accessibilityRole="alert" style={styles.error}>
          {loadError}
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.button}
          onPress={() => setAttempt((value) => value + 1)}
        >
          <Text style={styles.buttonText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );

  return (
    <View style={styles.screen}>
      <View style={styles.tabs}>
        <TouchableOpacity
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === 'orc' }}
          style={[styles.tab, tab === 'orc' && styles.tabActive]}
          onPress={() => setTab('orc')}
        >
          <Text style={[styles.tabLabel, tab === 'orc' && styles.tabLabelActive]}>
            Orçamentos ({quotes.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === 'os' }}
          style={[styles.tab, tab === 'os' && styles.tabActive]}
          onPress={() => setTab('os')}
        >
          <Text style={[styles.tabLabel, tab === 'os' && styles.tabLabelActive]}>
            Ordens de Serviço ({workOrders.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === 'rec' }}
          style={[styles.tab, tab === 'rec' && styles.tabActive]}
          onPress={() => setTab('rec')}
        >
          <Text style={[styles.tabLabel, tab === 'rec' && styles.tabLabelActive]}>
            Recibos ({receipts.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(16, insets.bottom) }]}
      >
        {tab === 'orc' &&
          (quotes.length === 0 ? (
            <View style={styles.empty}>
              <Inbox size={32} color="#94A3B8" strokeWidth={1.5} />
              <Text style={styles.emptyText}>Nenhum orçamento gerado ainda.</Text>
            </View>
          ) : (
            quotes.map((quote) => (
              <View key={quote.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <FileText size={16} color="#6D28D9" />
                  <Text style={styles.cardNumber}>ORÇ #{quote.number}</Text>
                  <Pill config={QUOTE_PILL[quote.status] ?? QUOTE_PILL.DRAFT} />
                </View>
                <Text style={styles.cardTitle}>
                  {quote.customer.name}
                  {quote.title ? ` · ${quote.title}` : ''}
                </Text>
                <Text style={styles.cardMeta}>{formatMoney(quote.total)}</Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={{ disabled: downloadingId === quote.id }}
                  disabled={downloadingId === quote.id}
                  style={[styles.downloadBtn, downloadingId === quote.id && styles.disabled]}
                  onPress={() => void downloadQuotePdf(quote)}
                >
                  <Download size={14} color="#6D28D9" />
                  <Text style={styles.downloadBtnText}>
                    {downloadingId === quote.id ? 'Baixando…' : 'Baixar / compartilhar PDF'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          ))}

        {tab === 'os' &&
          (workOrders.length === 0 ? (
            <View style={styles.empty}>
              <Inbox size={32} color="#94A3B8" strokeWidth={1.5} />
              <Text style={styles.emptyText}>Nenhuma ordem de serviço gerada ainda.</Text>
            </View>
          ) : (
            workOrders.map((order) => (
              <View key={order.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <ClipboardList size={16} color="#6D28D9" />
                  <Text style={styles.cardNumber}>OS #{order.number}</Text>
                  <Pill config={WORK_ORDER_PILL[order.status] ?? WORK_ORDER_PILL.PENDING} />
                </View>
                <Text style={styles.cardTitle}>
                  {order.customer.name}
                  {order.title ? ` · ${order.title}` : ''}
                </Text>
                <Text style={styles.cardMeta}>PDF ainda não disponível para OS.</Text>
              </View>
            ))
          ))}
        {tab === 'rec' && (
          <>
            <TouchableOpacity
              accessibilityRole="button"
              style={[styles.button, { flexDirection: 'row', gap: 8 }]}
              onPress={() => navigation.navigate('ReceiptNew')}
            >
              <Plus size={16} color="#FFFFFF" />
              <Text style={styles.buttonText}>Novo recibo</Text>
            </TouchableOpacity>
            {receipts.length === 0 ? (
              <View style={styles.empty}>
                <Inbox size={32} color="#94A3B8" strokeWidth={1.5} />
                <Text style={styles.emptyText}>
                  Nenhum recibo ainda. Ele é gerado quando um recebimento é marcado como pago.
                </Text>
              </View>
            ) : (
              receipts.map((r) => (
                <View key={r.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <ReceiptText size={16} color="#6D28D9" />
                    <Text style={styles.cardNumber}>nº {receiptNo(r.receipt_number)}</Text>
                  </View>
                  <Text style={styles.cardTitle}>{r.customer.name}</Text>
                  <Text style={styles.cardMeta}>
                    {formatMoney(r.amount)} · {receiptOrigin(r)} · {methodLabel(r.method)} ·{' '}
                    {new Date(r.paid_at ?? r.created_at).toLocaleDateString('pt-BR')}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    <TouchableOpacity
                      accessibilityRole="button"
                      style={styles.downloadBtn}
                      onPress={() => navigation.navigate('Receipt', { id: r.id })}
                    >
                      <ReceiptText size={14} color="#6D28D9" />
                      <Text style={styles.downloadBtnText}>Abrir</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      accessibilityRole="button"
                      style={styles.downloadBtn}
                      onPress={() =>
                        void shareReceiptPdf(r.id, receiptNo(r.receipt_number)).catch(
                          (error: unknown) =>
                            Alert.alert('Erro', documentosError(error, 'download')),
                        )
                      }
                    >
                      <Download size={14} color="#6D28D9" />
                      <Text style={styles.downloadBtnText}>Baixar / compartilhar PDF</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', padding: 24, gap: 16, backgroundColor: '#FFFFFF' },
  content: { padding: 16, gap: 12 },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
    paddingBottom: 0,
    backgroundColor: '#F8FAFC',
  },
  tab: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  tabActive: { borderColor: '#6D28D9', backgroundColor: '#F5F3FF' },
  tabLabel: { fontSize: 13, fontWeight: '600', color: '#334155' },
  tabLabelActive: { color: '#6D28D9' },
  card: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardNumber: {
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#6D28D9',
    fontSize: 13,
    flex: 1,
  },
  cardTitle: { color: '#0A0A0F', fontSize: 15, fontWeight: '500' },
  cardMeta: { color: '#64748B', fontSize: 13 },
  pill: { borderRadius: 9999, paddingVertical: 4, paddingHorizontal: 9 },
  pillText: { fontSize: 11, fontWeight: '600' },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#6D28D9',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 4,
    minHeight: 36,
  },
  downloadBtnText: { color: '#6D28D9', fontSize: 13, fontWeight: '600' },
  disabled: { opacity: 0.6 },
  button: {
    backgroundColor: '#6D28D9',
    borderRadius: 12,
    minHeight: 48,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  description: { color: '#64748B', fontSize: 14, lineHeight: 20 },
  error: { color: '#DC2626', fontSize: 14, lineHeight: 20 },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 56,
  },
  emptyText: { color: '#94A3B8', fontSize: 14 },
});
