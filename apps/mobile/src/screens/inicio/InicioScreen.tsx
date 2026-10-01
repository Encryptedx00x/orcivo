import React, { useCallback } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useAuth } from '../../contexts/AuthContext';
import type { AppTabsParamList } from '../../navigation/AppTabs';
import { homeService } from '../../services/home.service';
import { useFocusedResource } from '../../hooks/useFocusedResource';
import { styles } from './home-styles';

export function InicioScreen({ navigation }: BottomTabScreenProps<AppTabsParamList, 'Início'>) {
  const { company, user } = useAuth();
  const load = useCallback(() => homeService.summary(), [company?.id]);
  const { data, loading, failed, refresh } = useFocusedResource(load);
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#6D28D9" />}>
        <Text style={styles.title}>Olá{user?.name ? `, ${user.name}` : ''}</Text>
        <Text style={styles.muted}>{company?.trade_name}</Text>
        <Text style={styles.heading}>Seu dia</Text>
        <Text style={styles.muted}>{new Date().toLocaleDateString('pt-BR')}</Text>
        {loading && <ActivityIndicator color="#6D28D9" accessibilityLabel="Carregando resumo do dia" />}
        {failed && <View accessibilityRole="alert"><Text style={styles.muted}>Não foi possível carregar o resumo. Verifique sua conexão.</Text><TouchableOpacity accessibilityRole="button" style={styles.action} onPress={refresh}><Text style={styles.actionText}>Tentar novamente</Text></TouchableOpacity></View>}
        {data && <>
          <View style={styles.grid}>
            {[
              ['Compromissos hoje', data.kpis.agenda_today],
              ['Orçamentos pendentes', data.kpis.quotes_pending],
              ['OS abertas / em execução', data.kpis.os_pending],
              ['Recebimentos pendentes', data.kpis.receivables_pending_count],
            ].map(([label, value]) => <View key={label} style={[styles.card, styles.kpi]}><Text style={styles.value}>{value}</Text><Text style={styles.muted}>{label}</Text></View>)}
          </View>
          <Text style={styles.heading}>Agenda de hoje</Text>
          {data.upcoming.length === 0 ? <Text style={styles.muted}>Nenhum compromisso para hoje. Comece criando seu primeiro cliente ou orçamento.</Text> : data.upcoming.map(item => (
            <View key={item.id} style={styles.card}>
              <Text style={styles.time}>{new Date(item.starts_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</Text>
              <Text style={styles.itemTitle}>{item.title}</Text>
              {item.customer && <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Ver cliente ${item.customer.name}`} onPress={() => navigation.navigate('Clientes', { screen: 'ClienteDetail', params: { id: item.customer!.id } })}><Text style={styles.link}>{item.customer.name}</Text></TouchableOpacity>}
            </View>
          ))}
          {data.kpis.agenda_today > data.upcoming.length && <Text style={styles.muted}>Exibindo os primeiros {data.upcoming.length} de {data.kpis.agenda_today} compromissos de hoje.</Text>}
        </>}
        <Text style={styles.heading}>Ações rápidas</Text>
        <TouchableOpacity accessibilityRole="button" style={styles.action} onPress={() => navigation.navigate('Orçamentos', { screen: 'QuoteCreate' })}><Text style={styles.actionText}>Novo orçamento</Text></TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" style={styles.action} onPress={() => navigation.navigate('Clientes', { screen: 'ClienteCreate' })}><Text style={styles.actionText}>Novo cliente</Text></TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
