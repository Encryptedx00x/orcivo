import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { CalendarClock, FileText, StickyNote, User, Wrench } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AgendaStackParamList } from '../../navigation/AppTabs';
import { AppointmentType } from '../../services/appointment.service';

type Props = NativeStackScreenProps<AgendaStackParamList, 'AgendaDetail'>;

const TYPE_LABEL: Record<AppointmentType, string> = {
  VISITA: 'Visita',
  INSTALACAO: 'Instalação',
  ORCAMENTO: 'Orçamento',
  MANUTENCAO: 'Manutenção',
  REUNIAO: 'Reunião',
  OUTRO: 'Outro',
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AgendaDetailScreen({ route }: Props) {
  const { appointment } = route.params;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <FileText size={24} color="#6D28D9" />
        <View style={styles.headerInfo}>
          <Text style={styles.title}>{appointment.title}</Text>
          <Text style={styles.type}>{TYPE_LABEL[appointment.type]}</Text>
        </View>
      </View>

      <View style={styles.row}>
        <CalendarClock size={18} color="#6B7280" />
        <View style={styles.rowBody}>
          <Text style={styles.rowLabel}>Início</Text>
          <Text style={styles.rowValue}>{formatDateTime(appointment.starts_at)}</Text>
        </View>
      </View>

      {appointment.ends_at && (
        <View style={styles.row}>
          <CalendarClock size={18} color="#6B7280" />
          <View style={styles.rowBody}>
            <Text style={styles.rowLabel}>Fim</Text>
            <Text style={styles.rowValue}>{formatDateTime(appointment.ends_at)}</Text>
          </View>
        </View>
      )}

      {appointment.customer && (
        <View style={styles.row}>
          <User size={18} color="#6B7280" />
          <View style={styles.rowBody}>
            <Text style={styles.rowLabel}>Cliente</Text>
            <Text style={styles.rowValue}>{appointment.customer.name}</Text>
          </View>
        </View>
      )}

      {appointment.work_order_id && (
        <View style={styles.row}>
          <Wrench size={18} color="#6B7280" />
          <View style={styles.rowBody}>
            <Text style={styles.rowLabel}>Ordem de serviço</Text>
            <Text style={styles.rowValue}>{appointment.work_order_id}</Text>
          </View>
        </View>
      )}

      {appointment.notes && (
        <View style={styles.row}>
          <StickyNote size={18} color="#6B7280" />
          <View style={styles.rowBody}>
            <Text style={styles.rowLabel}>Observações</Text>
            <Text style={styles.rowValue}>{appointment.notes}</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 16 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 24 },
  headerInfo: { flex: 1 },
  title: { fontSize: 18, fontWeight: '700', color: '#0A0A0F', marginBottom: 2 },
  type: { fontSize: 14, color: '#6D28D9', fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
  },
  rowBody: { flex: 1 },
  rowLabel: { fontSize: 12, color: '#6B7280', textTransform: 'uppercase', marginBottom: 2 },
  rowValue: { fontSize: 15, color: '#0A0A0F' },
});
