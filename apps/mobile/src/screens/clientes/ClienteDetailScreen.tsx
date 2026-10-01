import React, { useCallback } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ClientesStackParamList } from '../../navigation/AppTabs';
import { useAuth } from '../../contexts/AuthContext';
import { useFocusedResource } from '../../hooks/useFocusedResource';
import { customerService } from '../../services/customer.service';

type Props = NativeStackScreenProps<ClientesStackParamList, 'ClienteDetail'>;

export function ClienteDetailScreen({ route }: Props) {
  const { company } = useAuth();
  const { id } = route.params;
  const load = useCallback(() => customerService.detail(id), [id, company?.id]);
  const { data: customer, loading, failed, refresh } = useFocusedResource(load);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#6D28D9" />}>
      {loading && <ActivityIndicator color="#6D28D9" accessibilityLabel="Carregando cliente" />}
      {failed && <View accessibilityRole="alert">
        <Text style={styles.value}>Não foi possível carregar o cliente. Verifique sua conexão; ele pode ter sido removido ou não estar disponível para sua conta.</Text>
        <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={refresh}><Text style={styles.buttonText}>Tentar novamente</Text></TouchableOpacity>
      </View>}
      {customer && <>
        <Text style={styles.title}>{customer.name}</Text>
        <Text style={styles.heading}>Dados do cliente</Text>
        {[
          ['Tipo', customer.type === 'PJ' ? 'Pessoa jurídica' : customer.type === 'PF' ? 'Pessoa física' : null],
          ['CPF/CNPJ', customer.tax_id],
          ['Telefone', customer.phone],
          ['E-mail', customer.email],
          ['Cidade / UF', [customer.city, customer.state].filter(Boolean).join(' / ')],
          ['Observações', customer.notes],
        ].map(([label, value]) => <View key={label} style={styles.field}><Text style={styles.label}>{label}</Text><Text selectable style={styles.value}>{value || 'Não informado'}</Text></View>)}
      </>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 16, gap: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#0A0A0F' },
  heading: { fontSize: 18, fontWeight: '600', color: '#0A0A0F' },
  field: { paddingVertical: 12, borderBottomWidth: 1, borderColor: '#E5E7EB', gap: 6 },
  label: { fontSize: 14, color: '#6B7280' },
  value: { fontSize: 16, color: '#0A0A0F' },
  button: { backgroundColor: '#6D28D9', borderRadius: 8, padding: 16, marginTop: 16 },
  buttonText: { color: '#FFFFFF', fontWeight: '600', textAlign: 'center' },
});
