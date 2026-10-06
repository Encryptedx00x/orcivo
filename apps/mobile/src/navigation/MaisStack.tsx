import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { EmBreveScreen } from '../screens/placeholders/EmBreveScreen';
import { ConfiguracoesScreen } from '../screens/configuracoes/ConfiguracoesScreen';
import { ContaScreen } from '../screens/conta/ContaScreen';
import { EquipeScreen } from '../screens/equipe/EquipeScreen';
import { FinanceiroScreen } from '../screens/financeiro/FinanceiroScreen';
import { DocumentosScreen } from '../screens/documentos/DocumentosScreen';
import { PlanoScreen } from '../screens/plano/PlanoScreen';
import { CatalogScreen } from '../screens/CatalogScreen';
import { CatalogItemFormScreen } from '../screens/CatalogItemFormScreen';
import { WorkOrderListScreen } from '../screens/WorkOrderListScreen';
import { WorkOrderDetailScreen } from '../screens/WorkOrderDetailScreen';
import { WorkOrderPhotoScreen } from '../screens/WorkOrderPhotoScreen';
import type { CatalogItem } from '../services/catalog.service';
import { ReceiptsScreen, ReceiptScreen, ReceiptNewScreen } from '../easy/screens/Receipts';
import { NoticesScreen } from '../easy/screens/Notices';
import { ApprovalsScreen, EditScreen } from '../easy/screens/Settings';
import { QuoteSignScreen } from '../easy/screens/QuoteFlow';
import { ClientNewScreen } from '../easy/screens/Clients';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEasyMode } from '../easy/EasyModeContext';

export type WorkOrderPhotoStage = 'BEFORE' | 'DURING' | 'AFTER';

export type MaisStackParamList = {
  MaisMenu: undefined;
  Configuracoes: undefined;
  Conta: undefined;
  Equipe: undefined;
  Financeiro: undefined;
  Documentos: undefined;
  Plano: undefined;
  EmBreve: { title: string };
  Notices: undefined;
  Receipts: undefined;
  Receipt: { id: string };
  /** due: "Cobrança para receber depois" (due date instead of how/when it was paid). */
  ReceiptNew: { link?: boolean; clientId?: string; due?: boolean } | undefined;
  QuoteSign: { standalone?: boolean } | undefined;
  Approvals: undefined;
  Edit: { kind: string; id?: string; name?: string; price?: string; amount?: string; due?: string };
  ClientNew: { forReceipt?: boolean } | undefined;
  Catalog: undefined;
  CatalogItemForm: { item?: CatalogItem } | undefined;
  WorkOrderList: undefined;
  WorkOrderDetail: { id: string };
  WorkOrderPhoto: {
    workOrderId: string;
    stage?: WorkOrderPhotoStage;
    onPhotoUploaded: () => void;
  };
};

const Stack = createNativeStackNavigator<MaisStackParamList>();

type MaisMenuItem =
  | {
      label: string;
      screen:
        | 'WorkOrderList'
        | 'Catalog'
        | 'Configuracoes'
        | 'Conta'
        | 'Equipe'
        | 'Financeiro'
        | 'Receipts'
        | 'Notices'
        | 'Documentos'
        | 'Plano';
    }
  | { label: string; screen: 'EmBreve' };

const MAIS_ITEMS: MaisMenuItem[] = [
  { label: 'Ordens de Serviço', screen: 'WorkOrderList' },
  { label: 'Catálogo', screen: 'Catalog' },
  { label: 'Financeiro', screen: 'Financeiro' },
  { label: 'Recibos', screen: 'Receipts' },
  { label: 'Avisos', screen: 'Notices' },
  { label: 'Documentos', screen: 'Documentos' },
  { label: 'Conta', screen: 'Conta' },
  { label: 'Configurações', screen: 'Configuracoes' },
  { label: 'Usuários e permissões', screen: 'Equipe' },
  { label: 'Plano e assinatura', screen: 'Plano' },
  { label: 'Ajuda', screen: 'EmBreve' },
];

type MaisMenuProps = NativeStackScreenProps<MaisStackParamList, 'MaisMenu'>;

function MaisMenuScreen({ navigation }: MaisMenuProps) {
  const { setEasy } = useEasyMode();
  return (
    <View style={styles.container}>
      <TouchableOpacity
        accessibilityRole="button"
        style={[styles.row, styles.easyRow]}
        onPress={() => setEasy(true)}
      >
        <View>
          <Text style={[styles.label, styles.easyLabel]}>Modo fácil</Text>
          <Text style={styles.easySub}>Botões grandes e só o essencial</Text>
        </View>
        <Text style={[styles.arrow, styles.easyLabel]}>›</Text>
      </TouchableOpacity>
      {MAIS_ITEMS.map((item) => (
        <TouchableOpacity
          key={item.label}
          style={styles.row}
          onPress={() => {
            if (item.screen === 'EmBreve') {
              navigation.navigate('EmBreve', { title: item.label });
              return;
            }
            navigation.navigate(item.screen);
          }}
        >
          <Text style={styles.label}>{item.label}</Text>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function MaisStack() {
  return (
    <Stack.Navigator screenOptions={{ headerTintColor: '#6D28D9' }}>
      <Stack.Screen name="MaisMenu" component={MaisMenuScreen} options={{ title: 'Mais' }} />
      <Stack.Screen
        name="Configuracoes"
        component={ConfiguracoesScreen}
        options={{ title: 'Configurações' }}
      />
      <Stack.Screen name="Conta" component={ContaScreen} options={{ title: 'Conta' }} />
      <Stack.Screen
        name="Equipe"
        component={EquipeScreen}
        options={{ title: 'Usuários e permissões' }}
      />
      <Stack.Screen
        name="Financeiro"
        component={FinanceiroScreen}
        options={{ title: 'Financeiro' }}
      />
      <Stack.Screen
        name="Documentos"
        component={DocumentosScreen}
        options={{ title: 'Documentos' }}
      />
      <Stack.Screen
        name="Plano"
        component={PlanoScreen}
        options={{ title: 'Plano e assinatura' }}
      />
      <Stack.Screen
        name="EmBreve"
        component={EmBreveScreen}
        options={({ route }) => ({ title: route.params.title ?? 'Em breve' })}
      />

      {/* Recibos, assinatura, aprovação e edições — same screens as the easy mode. */}
      <Stack.Screen name="Notices" component={NoticesScreen} options={{ title: 'Avisos' }} />
      <Stack.Screen name="Receipts" component={ReceiptsScreen} options={{ title: 'Recibos' }} />
      <Stack.Screen name="Receipt" component={ReceiptScreen} options={{ title: 'Recibo' }} />
      <Stack.Screen
        name="ReceiptNew"
        component={ReceiptNewScreen}
        options={{ title: 'Novo recibo' }}
      />
      <Stack.Screen
        name="QuoteSign"
        component={QuoteSignScreen as React.ComponentType<object>}
        options={{ title: 'Minha assinatura' }}
      />
      <Stack.Screen
        name="Approvals"
        component={ApprovalsScreen}
        options={{ title: 'Como o cliente aprova' }}
      />
      <Stack.Screen name="Edit" component={EditScreen} options={{ title: 'Editar' }} />
      <Stack.Screen
        name="ClientNew"
        component={ClientNewScreen as React.ComponentType<object>}
        options={{ title: 'Cliente novo' }}
      />

      {/* Catálogo */}
      <Stack.Screen name="Catalog" component={CatalogScreen} options={{ title: 'Catálogo' }} />
      <Stack.Screen
        name="CatalogItemForm"
        component={CatalogItemFormScreen}
        options={({ route }) => ({ title: route.params?.item ? 'Editar item' : 'Novo item' })}
      />

      {/* Ordens de Serviço */}
      <Stack.Screen
        name="WorkOrderList"
        component={WorkOrderListScreen}
        options={{ title: 'Ordens de Serviço' }}
      />
      <Stack.Screen
        name="WorkOrderDetail"
        component={WorkOrderDetailScreen}
        options={{ title: 'Detalhes da OS' }}
      />
      <Stack.Screen
        name="WorkOrderPhoto"
        component={WorkOrderPhotoScreen}
        options={{ title: 'Adicionar foto' }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  label: { fontSize: 16, color: '#0A0A0F' },
  arrow: { fontSize: 20, color: '#6B7280' },
  easyRow: { backgroundColor: '#F5F3FF' },
  easyLabel: { color: '#6D28D9', fontWeight: '700' },
  easySub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
});
