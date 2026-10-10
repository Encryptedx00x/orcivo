import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CalendarClock, ChevronLeft, ChevronRight, Plus, User } from 'lucide-react-native';
import type { AgendaStackParamList } from '../../navigation/AppTabs';
import {
  appointmentService,
  Appointment,
  AppointmentType,
} from '../../services/appointment.service';

type Props = NativeStackScreenProps<AgendaStackParamList, 'AgendaList'>;

const TYPE_LABEL: Record<AppointmentType, string> = {
  VISITA: 'Visita',
  INSTALACAO: 'Instalação',
  ORCAMENTO: 'Orçamento',
  MANUTENCAO: 'Manutenção',
  REUNIAO: 'Reunião',
  OUTRO: 'Outro',
};

function formatDayLabel(date: Date): string {
  return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function AgendaScreen({ navigation }: Props) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState(() => new Date());

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const from = new Date(month.getFullYear(), month.getMonth(), 1).toISOString();
      const to = new Date(month.getFullYear(), month.getMonth() + 1, 1).toISOString();
      const result = await appointmentService.fetchAppointments(from, to);
      setAppointments(result.data);
    } catch {
      setError('Não foi possível carregar a agenda.');
    } finally {
      setLoading(false);
    }
  }, [month]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const sections = groupByDay(appointments);
  const monthDays = getMonthDays(month);

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator color="#6D28D9" style={styles.loading} />
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(s) => s.key}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.calendar}>
              <View style={styles.calendarHead}>
                <TouchableOpacity
                  accessibilityLabel="Mês anterior"
                  onPress={() =>
                    setMonth(
                      (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1),
                    )
                  }
                >
                  <ChevronLeft size={22} color="#6D28D9" />
                </TouchableOpacity>
                <Text style={styles.calendarTitle}>
                  {month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </Text>
                <TouchableOpacity
                  accessibilityLabel="Próximo mês"
                  onPress={() =>
                    setMonth(
                      (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1),
                    )
                  }
                >
                  <ChevronRight size={22} color="#6D28D9" />
                </TouchableOpacity>
              </View>
              <View style={styles.calendarGrid}>
                {['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'].map((label) => (
                  <Text key={label} style={styles.calendarWeekday}>
                    {label}
                  </Text>
                ))}
                {monthDays.map((day) => {
                  const count = appointments.filter(
                    (item) => new Date(item.starts_at).toDateString() === day.toDateString(),
                  ).length;
                  return (
                    <View
                      key={day.toISOString()}
                      style={styles.calendarDay}
                      accessibilityLabel={`${day.toLocaleDateString('pt-BR')}: ${count} compromisso(s)`}
                    >
                      <Text
                        style={[
                          styles.calendarDayText,
                          day.getMonth() !== month.getMonth() && styles.calendarDayMuted,
                        ]}
                      >
                        {day.getDate()}
                      </Text>
                      {count > 0 ? <View style={styles.calendarDot} /> : null}
                    </View>
                  );
                })}
              </View>
            </View>
          }
          renderItem={({ item: section }) => (
            <View>
              <Text style={styles.sectionHeader}>{section.label}</Text>
              {section.items.map((appointment) => (
                <TouchableOpacity
                  key={appointment.id}
                  style={styles.item}
                  onPress={() => navigation.navigate('AgendaDetail', { appointment })}
                >
                  <View style={styles.itemTime}>
                    <CalendarClock size={16} color="#6D28D9" />
                    <Text style={styles.itemTimeText}>{formatTime(appointment.starts_at)}</Text>
                  </View>
                  <View style={styles.itemBody}>
                    <Text style={styles.itemTitle}>{appointment.title}</Text>
                    <Text style={styles.itemMeta}>{TYPE_LABEL[appointment.type]}</Text>
                    {appointment.customer && (
                      <View style={styles.itemCustomer}>
                        <User size={13} color="#6B7280" />
                        <Text style={styles.itemCustomerText}>{appointment.customer.name}</Text>
                      </View>
                    )}
                  </View>
                  <ChevronRight size={18} color="#9CA3AF" />
                </TouchableOpacity>
              ))}
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>Nenhum compromisso agendado.</Text>}
        />
      )}
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AgendaCreate')}>
        <Plus size={18} color="#FFFFFF" />
        <Text style={styles.fabText}>Novo compromisso</Text>
      </TouchableOpacity>
    </View>
  );
}

interface DaySection {
  key: string;
  label: string;
  items: Appointment[];
}

function groupByDay(appointments: Appointment[]): DaySection[] {
  const map = new Map<string, DaySection>();
  for (const appointment of appointments) {
    const date = new Date(appointment.starts_at);
    const key = date.toISOString().slice(0, 10);
    if (!map.has(key)) {
      map.set(key, { key, label: formatDayLabel(date), items: [] });
    }
    map.get(key)!.items.push(appointment);
  }
  return Array.from(map.values());
}

function getMonthDays(base: Date): Date[] {
  const first = new Date(base.getFullYear(), base.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  first.setDate(first.getDate() - offset);
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(first);
    day.setDate(first.getDate() + index);
    return day;
  });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loading: { marginTop: 48 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  listContent: { paddingBottom: 96 },
  calendar: { padding: 16, gap: 10 },
  calendarHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calendarTitle: { fontSize: 17, fontWeight: '700', color: '#0A0A0F', textTransform: 'capitalize' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarWeekday: { width: '14.285%', textAlign: 'center', fontSize: 11, color: '#6B7280' },
  calendarDay: { width: '14.285%', minHeight: 38, alignItems: 'center', justifyContent: 'center' },
  calendarDayText: { fontSize: 14, color: '#0A0A0F' },
  calendarDayMuted: { color: '#9CA3AF' },
  calendarDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#6D28D9', marginTop: 2 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  itemTime: { alignItems: 'center', gap: 2, width: 56 },
  itemTimeText: { fontSize: 12, fontWeight: '600', color: '#6D28D9' },
  itemBody: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: '500', color: '#0A0A0F' },
  itemMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  itemCustomer: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  itemCustomerText: { fontSize: 13, color: '#6B7280' },
  empty: { textAlign: 'center', color: '#6B7280', marginTop: 48, fontSize: 14 },
  errorText: { fontSize: 15, color: '#DC2626', textAlign: 'center', marginBottom: 16 },
  retryBtn: {
    backgroundColor: '#6D28D9',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    left: 16,
    backgroundColor: '#6D28D9',
    borderRadius: 8,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  fabText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
});
