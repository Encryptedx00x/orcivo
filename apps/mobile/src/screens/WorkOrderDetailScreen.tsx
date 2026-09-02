import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Camera, CheckCircle, XCircle } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { workOrderService, WorkOrder, WorkOrderPhoto } from '../services/work-order.service';
import { newIdempotencyKey } from '../services/api';
import type { MaisStackParamList } from '../navigation/MaisStack';

type Props = NativeStackScreenProps<MaisStackParamList, 'WorkOrderDetail'>;

type WorkOrderStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
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

  const handleStatusChange = async (newStatus: WorkOrderStatus) => {
    if (!order) return;
    const labels: Record<WorkOrderStatus, string> = {
      PENDING: 'Pendente',
      IN_PROGRESS: 'Em andamento',
      DONE: 'Concluída',
      CANCELLED: 'Cancelada',
    };
    Alert.alert('Confirmar', `Alterar status para "${labels[newStatus]}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        onPress: async () => {
          try {
            setUpdatingStatus(true);
            const updated = await workOrderService.updateStatus(order.id, newStatus, {
              idempotencyKey: newIdempotencyKey(),
            });
            setOrder(updated);
          } catch {
            Alert.alert('Erro', 'Não foi possível alterar o status. Tente novamente.');
          } finally {
            setUpdatingStatus(false);
          }
        },
      },
    ]);
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
      </View>

      {/* Ações de status */}
      {updatingStatus ? (
        <ActivityIndicator style={styles.statusLoader} color="#6D28D9" />
      ) : (
        <View style={styles.actions}>
          {status === 'PENDING' && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleStatusChange('IN_PROGRESS')}
            >
              <CheckCircle size={18} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>Iniciar OS</Text>
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
