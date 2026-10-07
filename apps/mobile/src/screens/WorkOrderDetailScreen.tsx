import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Camera,
  CheckCircle,
  History,
  MessageCircle,
  RotateCcw,
  XCircle,
} from 'lucide-react-native';
import { formatMoney } from '@orcivo/shared-types';
import { easy, errorText } from '../easy/data';
import { reasonSheet, useSheet } from '../easy/sheet';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { workOrderService, WorkOrder, WorkOrderPhoto } from '../services/work-order.service';
import type { MaisStackParamList } from '../navigation/MaisStack';

import {
  auditService,
  auditActionLabel,
  auditActorLabel,
  auditDateLabel,
  auditReason,
  auditErrorMessage,
  type AuditEntityType,
  type AuditRow,
} from '../services/audit.service';

type Props = NativeStackScreenProps<MaisStackParamList, 'WorkOrderDetail'>;

type WorkOrderStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';

const dateText = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '—';

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}
type PhotoStage = 'BEFORE' | 'DURING' | 'AFTER';

const STATUS_CONFIG: Record<WorkOrderStatus, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'Pendente', color: '#374151', bg: '#F3F4F6' },
  IN_PROGRESS: { label: 'Em andamento', color: '#FFFFFF', bg: '#2563EB' },
  DONE: { label: 'Concluída', color: '#FFFFFF', bg: '#16A34A' },
  CANCELLED: { label: 'Cancelada', color: '#FFFFFF', bg: '#DC2626' },
};

const STAGE_LABELS: Record<PhotoStage, string> = {
  BEFORE: 'Antes',
  DURING: 'Durante',
  AFTER: 'Depois',
};

function PhotoGrid({
  photos,
  stage,
  onAdd,
}: {
  photos: WorkOrderPhoto[];
  stage: PhotoStage;
  onAdd: () => void;
}) {
  const stagePhotos = photos.filter((p) => p.photo_stage === stage);
  return (
    <View style={styles.stageSection}>
      <View style={styles.stageHeader}>
        <Text style={styles.stageTitle}>{STAGE_LABELS[stage]}</Text>
        <TouchableOpacity
          style={styles.addPhotoBtn}
          onPress={onAdd}
          accessibilityLabel={`Adicionar foto ${STAGE_LABELS[stage]}`}
        >
          <Camera size={14} color="#6D28D9" />
          <Text style={styles.addPhotoText}>Adicionar foto</Text>
        </TouchableOpacity>
      </View>
      {stagePhotos.length === 0 ? (
        <Text style={styles.noPhotosText}>Nenhuma foto nesta etapa</Text>
      ) : (
        <View style={styles.photoGrid}>
          {stagePhotos.map((photo) => (
            <Image
              key={photo.id}
              source={{ uri: photo.file_url }}
              style={styles.thumbnail}
              accessibilityLabel={photo.caption ?? `Foto ${STAGE_LABELS[stage]}`}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// Both detail screens share the same read-only history presentation.
export function AuditHistorySection({
  entityType,
  entityId,
}: {
  entityType: AuditEntityType;
  entityId: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={historyStyles.section}>
      <TouchableOpacity
        style={historyStyles.button}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((value) => !value)}
      >
        <History size={18} color="#6D28D9" />
        <Text style={historyStyles.buttonText}>
          {open ? 'Ocultar histórico de ações' : 'Histórico de ações'}
        </Text>
      </TouchableOpacity>
      {open && (
        <AuditHistoryRows
          key={`${entityType}:${entityId}`}
          entityType={entityType}
          entityId={entityId}
        />
      )}
    </View>
  );
}

function AuditHistoryRows({
  entityType,
  entityId,
}: {
  entityType: AuditEntityType;
  entityId: string;
}) {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [request, setRequest] = useState<{ cursor?: string; attempt: number }>({ attempt: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    void auditService
      .fetchHistory(entityType, entityId, request.cursor)
      .then((page) => {
        if (!active) return;
        setRows((previous) => (request.cursor ? [...previous, ...page.data] : page.data));
        setNextCursor(page.next_cursor);
      })
      .catch((err: unknown) => {
        if (active) setError(auditErrorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [entityType, entityId, request]);

  return (
    <View accessibilityState={{ busy: loading }}>
      {rows.map((row) => (
        <View key={row.id} style={historyStyles.row}>
          <Text style={historyStyles.action}>{auditActionLabel(row)}</Text>
          <Text style={historyStyles.meta}>{auditDateLabel(row.created_at)}</Text>
          <Text style={historyStyles.meta}>{auditActorLabel(row)}</Text>
          {auditReason(row) && (
            <Text style={historyStyles.meta}>Justificativa: {auditReason(row)}</Text>
          )}
        </View>
      ))}
      {loading && <ActivityIndicator accessibilityLabel="Carregando histórico" color="#6D28D9" />}
      {!!error && (
        <Text accessibilityRole="alert" style={historyStyles.error}>
          {error}
        </Text>
      )}
      {!loading && !error && rows.length === 0 && (
        <Text style={historyStyles.meta}>Nenhuma alteração registrada.</Text>
      )}
      {!loading && (!!error || !!nextCursor) && (
        <TouchableOpacity
          accessibilityRole="button"
          style={historyStyles.button}
          onPress={() => {
            setLoading(true);
            setRequest((previous) =>
              error
                ? { ...previous, attempt: previous.attempt + 1 }
                : { cursor: nextCursor ?? undefined, attempt: 0 },
            );
          }}
        >
          <Text style={historyStyles.buttonText}>
            {error ? 'Tentar novamente' : 'Carregar mais'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const historyStyles = StyleSheet.create({
  section: { padding: 16, marginTop: 16, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8 },
  button: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  buttonText: { flexShrink: 1, fontSize: 15, fontWeight: '600', color: '#6D28D9' },
  row: { paddingVertical: 12, borderBottomWidth: 1, borderColor: '#F3F4F6' },
  action: { fontSize: 14, fontWeight: '600', color: '#0A0A0F' },
  meta: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  error: { fontSize: 14, color: '#DC2626', marginTop: 8 },
});

export function WorkOrderDetailScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const [order, setOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await workOrderService.fetchOne(id);
      setOrder(data);
    } catch {
      setError('Não foi possível carregar a ordem de serviço.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const sheet = useSheet();
  // Domain actions (the backend has no free status edit): iniciar, concluir,
  // cancelar / reabrir with the reason it requires.
  const runAction = async (fn: () => Promise<unknown>, done: string) => {
    if (!order) return;
    try {
      setUpdatingStatus(true);
      await fn();
      await load();
      Alert.alert('Pronto', done);
    } catch (err) {
      Alert.alert('Erro', errorText(err, 'Não foi possível alterar o status. Tente novamente.'));
    } finally {
      setUpdatingStatus(false);
    }
  };
  const handleStatusChange = (newStatus: WorkOrderStatus | 'REOPEN') => {
    if (!order) return;
    if (newStatus === 'IN_PROGRESS')
      return void runAction(() => easy.startWorkOrder(order.id), 'OS iniciada.');
    if (newStatus === 'DONE')
      return Alert.alert('Concluir OS', 'Marcar esta OS como concluída?', [
        { text: 'Voltar', style: 'cancel' },
        {
          text: 'Concluir',
          onPress: () => void runAction(() => easy.completeWorkOrder(order.id), 'OS concluída.'),
        },
      ]);
    const cancel = newStatus === 'CANCELLED';
    reasonSheet(
      sheet,
      cancel ? 'Por que cancelar?' : 'Por que reabrir?',
      cancel
        ? ['Cliente desistiu', 'Cliente remarcou', 'Feito por engano', 'Outro motivo']
        : ['Faltou terminar', 'Cliente pediu ajuste', 'Finalizado por engano', 'Outro motivo'],
      (reason) =>
        void runAction(
          () => easy.workOrderAction(order.id, cancel ? 'cancel' : 'reopen', reason),
          cancel ? 'OS cancelada.' : 'OS reaberta.',
        ),
      cancel ? XCircle : RotateCcw,
    );
  };

  const navigateToPhoto = (stage: PhotoStage) => {
    navigation.navigate('WorkOrderPhoto', { workOrderId: id, stage, onPhotoUploaded: load });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6D28D9" />
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? 'OS não encontrada'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const status = order.status as WorkOrderStatus;
  const statusCfg = STATUS_CONFIG[status];

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.orderNumber}>OS #{order.number}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
            <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
          </View>
        </View>
        <Text style={styles.title}>{order.title}</Text>
        <Text style={styles.customer}>Cliente: {order.customer.name}</Text>
        <View style={styles.facts}>
          <Fact label="Valor" value={order.quote?.total ? formatMoney(order.quote.total) : '—'} />
          <Fact label="Marcada para" value={dateText(order.scheduled_at)} />
          {order.finished_at ? (
            <Fact label="Concluída em" value={dateText(order.finished_at)} />
          ) : null}
          {order.quote ? <Fact label="Orçamento" value={`#${order.quote.number}`} /> : null}
        </View>
        {order.notes ? <Text style={styles.notes}>{order.notes}</Text> : null}
        {order.customer.phone ? (
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.whatsBtn}
            onPress={() =>
              void Linking.openURL(
                `https://wa.me/55${order.customer.phone!.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '')}`,
              )
            }
          >
            <MessageCircle size={16} color="#15803D" />
            <Text style={styles.whatsText}>WhatsApp do cliente</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Ações de status */}
      {updatingStatus ? (
        <ActivityIndicator style={styles.statusLoader} color="#6D28D9" />
      ) : (
        <View style={styles.actions}>
          {status === 'PENDING' && (
            <>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleStatusChange('IN_PROGRESS')}
              >
                <CheckCircle size={18} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>Iniciar OS</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnDanger]}
                onPress={() => handleStatusChange('CANCELLED')}
              >
                <XCircle size={18} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>Cancelar</Text>
              </TouchableOpacity>
            </>
          )}
          {(status === 'DONE' || status === 'CANCELLED') && (
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleStatusChange('REOPEN')}>
              <RotateCcw size={18} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>Reabrir OS</Text>
            </TouchableOpacity>
          )}
          {status === 'IN_PROGRESS' && (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnSuccess]}
                onPress={() => handleStatusChange('DONE')}
              >
                <CheckCircle size={18} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>Concluir</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnDanger]}
                onPress={() => handleStatusChange('CANCELLED')}
              >
                <XCircle size={18} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>Cancelar</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* Fotos por etapa */}
      <View style={styles.photosSection}>
        <Text style={styles.sectionTitle}>Fotos da OS</Text>
        {(['BEFORE', 'DURING', 'AFTER'] as PhotoStage[]).map((stage) => (
          <PhotoGrid
            key={stage}
            photos={order.photos}
            stage={stage}
            onAdd={() => navigateToPhoto(stage)}
          />
        ))}
      </View>
      <AuditHistorySection key={`${id}:${order.status}`} entityType="work_order" entityId={id} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  header: { padding: 20, borderBottomWidth: 1, borderColor: '#E5E7EB' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  orderNumber: { fontSize: 14, fontWeight: '700', color: '#6D28D9' },
  title: { fontSize: 18, fontWeight: '700', color: '#0A0A0F', marginBottom: 8 },
  customer: { fontSize: 14, color: '#6B7280' },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 14 },
  fact: { minWidth: 120 },
  factLabel: { fontSize: 11, fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase' },
  factValue: { fontSize: 15, fontWeight: '600', color: '#0A0A0F', marginTop: 2 },
  notes: { fontSize: 14, color: '#334155', marginTop: 12, lineHeight: 20 },
  whatsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F0FDF4',
  },
  whatsText: { fontSize: 14, fontWeight: '600', color: '#15803D' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 12, padding: 20 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6D28D9',
    paddingVertical: 12,
    borderRadius: 8,
  },
  actionBtnSuccess: { backgroundColor: '#16A34A' },
  actionBtnDanger: { backgroundColor: '#DC2626' },
  actionBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  statusLoader: { marginVertical: 20 },
  photosSection: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0A0A0F', marginBottom: 16 },
  stageSection: { marginBottom: 24 },
  stageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  stageTitle: { fontSize: 14, fontWeight: '600', color: '#374151' },
  addPhotoBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addPhotoText: { fontSize: 13, color: '#6D28D9', fontWeight: '500' },
  noPhotosText: { fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumbnail: { width: 80, height: 80, borderRadius: 6, backgroundColor: '#F3F4F6' },
  errorText: { fontSize: 15, color: '#DC2626', textAlign: 'center', marginBottom: 16 },
  retryBtn: {
    backgroundColor: '#6D28D9',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
