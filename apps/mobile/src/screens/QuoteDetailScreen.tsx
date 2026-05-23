import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CheckCircle, Clock, FileText, MessageCircle, XCircle } from 'lucide-react-native';
import { formatMoney } from '@orcivo/shared-types';
import { quoteService, Quote, QuoteStatus } from '../services/quote.service';

interface Props {
  route: { params: { id: string } };
  navigation: any;
}

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

function buildWhatsAppLink(phone: string, message: string): string {
  // Remove tudo que não é dígito e garante DDI 55
  const digits = phone.replace(/\D/g, '');
  const normalized = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function QuoteDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approvalUrl, setApprovalUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await quoteService.fetchQuote(id);
      setQuote(data);
    } catch {
      setError('Não foi possível carregar o orçamento.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSend = async () => {
    if (!quote) return;
    try {
      setSending(true);
      const result = await quoteService.sendQuote(quote.id);
      setApprovalUrl(result.approvalUrl);
      // Recarrega para atualizar status para SENT
      await load();
    } catch {
      Alert.alert('Erro', 'Não foi possível enviar o orçamento. Tente novamente.');
    } finally {
      setSending(false);
    }
  };

  const handleCancel = () => {
    if (!quote) return;
    Alert.alert(
      'Cancelar orçamento',
      'Tem certeza que deseja cancelar este orçamento?',
      [
        { text: 'Voltar', style: 'cancel' },
        {
          text: 'Cancelar orçamento',
          style: 'destructive',
          onPress: async () => {
            try {
              await quoteService.cancelQuote(quote.id);
              navigation.goBack();
            } catch {
              Alert.alert('Erro', 'Não foi possível cancelar o orçamento.');
            }
          },
        },
      ],
    );
  };

  const handleWhatsApp = () => {
    if (!quote) return;
    const url = approvalUrl ?? '';
    if (!url) {
      Alert.alert('Atenção', 'Envie o orçamento primeiro para obter o link de aprovação.');
      return;
    }
    const phone = quote.customer.phone ?? '';
    if (!phone) {
      Alert.alert('Atenção', 'Cliente sem telefone cadastrado.');
      return;
    }
    const message = `Olá ${quote.customer.name}! Segue o orçamento #${quote.number} para aprovação: ${url}`;
    const waUrl = buildWhatsAppLink(phone, message);
    Linking.openURL(waUrl);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6D28D9" />
      </View>
    );
  }

  if (error || !quote) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? 'Orçamento não encontrado.'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusColor = STATUS_COLOR[quote.status];
  const hasDiscount = quote.discount_value !== '0.00' && quote.discount_value !== '0';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <FileText size={24} color="#6D28D9" />
        <View style={styles.headerInfo}>
          <Text style={styles.quoteNumber}>
            {quote.title ? `#${quote.number} — ${quote.title}` : `Orçamento #${quote.number}`}
          </Text>
          <Text style={styles.clientName}>{quote.customer.name}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          {quote.status === 'APPROVED' && <CheckCircle size={14} color={statusColor} />}
          {(quote.status === 'REJECTED' || quote.status === 'CANCELLED') && (
            <XCircle size={14} color={statusColor} />
          )}
          {(quote.status === 'SENT' || quote.status === 'EXPIRED') && (
            <Clock size={14} color={statusColor} />
          )}
          {quote.status === 'DRAFT' && <FileText size={14} color={statusColor} />}
          <Text style={[styles.statusText, { color: statusColor }]}>
            {STATUS_LABEL[quote.status]}
          </Text>
        </View>
      </View>

      {/* Itens */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Itens</Text>
        {quote.items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <View style={styles.itemDesc}>
              <Text style={styles.itemName}>{item.description}</Text>
              <Text style={styles.itemMeta}>
                {item.quantity} × {formatMoney(item.unit_price)}
              </Text>
            </View>
            <Text style={styles.itemTotal}>{formatMoney(item.total)}</Text>
          </View>
        ))}
      </View>

      {/* Totais */}
      <View style={styles.totalsSection}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>{formatMoney(quote.subtotal)}</Text>
        </View>
        {hasDiscount && (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Desconto</Text>
            <Text style={[styles.totalValue, { color: '#16A34A' }]}>
              − {formatMoney(quote.discount_value)}
            </Text>
          </View>
        )}
        <View style={[styles.totalRow, styles.grandTotalRow]}>
          <Text style={styles.grandTotalLabel}>Total</Text>
          <Text style={styles.grandTotalValue}>{formatMoney(quote.total)}</Text>
        </View>
      </View>

      {/* Ações por status */}
      {quote.status === 'DRAFT' && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.primaryBtn, sending && styles.btnDisabled]}
            onPress={handleSend}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>Enviar orçamento</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.dangerBtn} onPress={handleCancel}>
            <Text style={styles.dangerBtnText}>Cancelar orçamento</Text>
          </TouchableOpacity>
        </View>
      )}

      {quote.status === 'SENT' && (
        <View style={styles.actions}>
          {approvalUrl && (
            <View style={styles.approvalUrlBox}>
              <Text style={styles.approvalUrlLabel}>Link de aprovação:</Text>
              <Text style={styles.approvalUrlText} selectable>
                {approvalUrl}
              </Text>
            </View>
          )}
          <TouchableOpacity style={styles.whatsappBtn} onPress={handleWhatsApp}>
            <MessageCircle size={20} color="#FFFFFF" />
            <Text style={styles.whatsappBtnText}>Compartilhar no WhatsApp</Text>
          </TouchableOpacity>
        </View>
      )}

      {quote.status === 'APPROVED' && (
        <View style={styles.approvedBox}>
          <CheckCircle size={24} color="#16A34A" />
          <Text style={styles.approvedText}>Aprovado — OS criada</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 24 },
  headerInfo: { flex: 1 },
  quoteNumber: { fontSize: 16, fontWeight: '700', color: '#0A0A0F', marginBottom: 2 },
  clientName: { fontSize: 14, color: '#6B7280' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: { fontSize: 12, fontWeight: '600' },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', marginBottom: 8 },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
  },
  itemDesc: { flex: 1, marginRight: 12 },
  itemName: { fontSize: 14, fontWeight: '500', color: '#0A0A0F', marginBottom: 2 },
  itemMeta: { fontSize: 13, color: '#6B7280' },
  itemTotal: { fontSize: 14, fontWeight: '600', color: '#0A0A0F' },
  totalsSection: {
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
    paddingTop: 12,
    marginBottom: 24,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalLabel: { fontSize: 14, color: '#6B7280' },
  totalValue: { fontSize: 14, color: '#0A0A0F' },
  grandTotalRow: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderColor: '#E5E7EB' },
  grandTotalLabel: { fontSize: 16, fontWeight: '700', color: '#0A0A0F' },
  grandTotalValue: { fontSize: 16, fontWeight: '700', color: '#6D28D9' },
  actions: { gap: 12 },
  primaryBtn: {
    backgroundColor: '#6D28D9',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  dangerBtn: {
    backgroundColor: '#FEF2F2',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  dangerBtnText: { color: '#DC2626', fontSize: 16, fontWeight: '600' },
  whatsappBtn: {
    backgroundColor: '#16A34A',
    paddingVertical: 14,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  whatsappBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  approvalUrlBox: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  approvalUrlLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  approvalUrlText: { fontSize: 13, color: '#6D28D9', fontFamily: 'monospace' },
  approvedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  approvedText: { fontSize: 16, fontWeight: '600', color: '#16A34A' },
  errorText: { fontSize: 15, color: '#DC2626', textAlign: 'center', marginBottom: 16 },
  retryBtn: { backgroundColor: '#6D28D9', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
