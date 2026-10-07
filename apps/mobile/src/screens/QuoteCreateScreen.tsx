import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  View,
} from 'react-native';
import { Pencil, Plus, ShoppingBag, Trash2, X } from 'lucide-react-native';
import { formatMoney, multiplyDecimal, sumDecimal } from '@orcivo/shared-types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { catalogService, CatalogItem } from '../services/catalog.service';
import { quoteService, QuoteCreateDto } from '../services/quote.service';
import { newIdempotencyKey } from '../services/api';
import { api } from '../services/api';
import type { QuotesStackParamList } from '../navigation/AppTabs';

type Props = NativeStackScreenProps<QuotesStackParamList, 'QuoteCreate'>;

interface Customer {
  id: string;
  name: string;
  phone?: string;
}

interface FormItem {
  key: string;
  catalog_item_id?: string;
  description: string;
  quantity: string;
  unit_price: string;
}

function safeDecimalPreview(quantity: string, unit_price: string): string {
  try {
    if (!quantity || !unit_price) return '0.00';
    const q = parseFloat(quantity);
    const u = parseFloat(unit_price);
    if (isNaN(q) || isNaN(u) || q <= 0 || u < 0) return '0.00';
    return multiplyDecimal(quantity, unit_price);
  } catch {
    return '0.00';
  }
}

function generateKey(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function applyDateMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function QuoteCreateScreen({ navigation, route }: Props) {
  const editId = route.params?.id;
  const [customerId, setCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [title, setTitle] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [items, setItems] = useState<FormItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);

  const loadCatalog = useCallback(async () => {
    try {
      setCatalogLoading(true);
      const data = await catalogService.fetchCatalog(true);
      setCatalogItems(data);
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar o catálogo.');
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  // Editing a draft: start from what is saved.
  useEffect(() => {
    if (!editId) return;
    navigation.setOptions({ title: 'Editar orçamento' });
    quoteService
      .fetchQuote(editId)
      .then((q) => {
        const full = q as typeof q & { valid_until?: string | null };
        setCustomerId(q.customer.id);
        pickedName.current = q.customer.name;
        setCustomerSearch(q.customer.name);
        setTitle(q.title ?? '');
        if (full.valid_until) {
          const [y, m, d] = full.valid_until.slice(0, 10).split('-');
          setValidUntil(`${d}/${m}/${y}`);
        }
        setItems(
          q.items.map((i) => ({
            key: generateKey(),
            catalog_item_id: i.catalog_item_id ?? undefined,
            description: i.description,
            quantity: String(i.quantity).replace(/\.0+$/, ''),
            unit_price: String(i.unit_price),
          })),
        );
      })
      .catch(() => Alert.alert('Erro', 'Não foi possível abrir o orçamento.'));
  }, [editId, navigation]);

  // The name of the picked client fills the field: that text must not search again.
  const pickedName = useRef('');

  // Busca clientes ao digitar (mínimo 1 caractere)
  useEffect(() => {
    if (customerSearch === pickedName.current) return;
    if (!customerSearch.trim()) {
      setCustomers([]);
      setShowSuggestions(false);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const res = await api.get<{ data: Customer[] }>(
          `/customers?search=${encodeURIComponent(customerSearch)}&limit=10`,
        );
        setCustomers(res.data ?? []);
        setShowSuggestions(true);
      } catch {
        setCustomers([]);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [customerSearch]);

  const selectCustomer = (c: Customer) => {
    setCustomerId(c.id);
    pickedName.current = c.name;
    setCustomerSearch(c.name);
    setShowSuggestions(false);
    setErrors((e) => ({ ...e, customer: '' }));
  };

  const addCatalogItem = (catalogItem: CatalogItem) => {
    setItems((prev) => [
      ...prev,
      {
        key: generateKey(),
        catalog_item_id: catalogItem.id,
        description: catalogItem.name,
        quantity: '1',
        unit_price: catalogItem.unit_price,
      },
    ]);
    setShowCatalog(false);
  };

  const addManualItem = () => {
    setItems((prev) => [
      ...prev,
      { key: generateKey(), description: '', quantity: '1', unit_price: '0.00' },
    ]);
  };

  const removeItem = (key: string) => setItems((prev) => prev.filter((i) => i.key !== key));

  const updateItem = (key: string, field: keyof FormItem, value: string) => {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, [field]: value } : i)));
  };

  const subtotal = sumDecimal(items.map((i) => safeDecimalPreview(i.quantity, i.unit_price)));

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!customerId) newErrors['customer'] = 'Selecione um cliente da lista';
    if (items.length === 0) newErrors['items'] = 'Adicione pelo menos 1 item';
    items.forEach((item) => {
      if (!item.description.trim()) newErrors[`item_desc_${item.key}`] = 'Descrição obrigatória';
      if (isNaN(parseFloat(item.quantity)) || parseFloat(item.quantity) <= 0)
        newErrors[`item_qty_${item.key}`] = 'Quantidade inválida';
      if (isNaN(parseFloat(item.unit_price)) || parseFloat(item.unit_price) < 0)
        newErrors[`item_price_${item.key}`] = 'Preço inválido';
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // One idempotency key per create attempt; a re-tap after a lost response reuses it.
  const submitKey = useRef(newIdempotencyKey());

  const handleSubmit = async () => {
    if (!validate()) {
      Alert.alert('Dados inválidos', Object.values(errors).filter(Boolean).join('\n'));
      return;
    }
    try {
      setSubmitting(true);
      let parsedDate: string | undefined;
      if (validUntil.trim()) {
        const [dd, mm, yyyy] = validUntil.split('/');
        parsedDate = `${yyyy}-${mm}-${dd}`;
      }
      const dto: QuoteCreateDto = {
        customer_id: customerId,
        title: title.trim() || undefined,
        valid_until: parsedDate,
        items: items.map((i) => ({
          catalog_item_id: i.catalog_item_id,
          description: i.description,
          quantity: i.quantity,
          unit_price: i.unit_price,
        })),
      };
      if (editId) {
        await api.patch(`/quotes/${encodeURIComponent(editId)}`, dto, {
          idempotencyKey: submitKey.current,
        });
        submitKey.current = newIdempotencyKey();
        return navigation.goBack();
      }
      const created = await quoteService.createQuote(dto, { idempotencyKey: submitKey.current });
      navigation.replace('QuoteDetail', { id: created.id });
    } catch (err: unknown) {
      const error = (err ?? {}) as { data?: { message?: string | string[] } };
      const msg = error.data?.message ?? 'Não foi possível criar o orçamento.';
      Alert.alert('Erro', typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSubmitting(false);
    }
  };

  const renderItemForm = ({ item }: { item: FormItem }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemCardHeader}>
        <Text style={styles.itemCardLabel}>
          {item.catalog_item_id ? 'Item do catálogo' : 'Item manual'}
        </Text>
        <TouchableOpacity onPress={() => removeItem(item.key)}>
          <Trash2 size={18} color="#DC2626" />
        </TouchableOpacity>
      </View>
      <TextInput
        style={[styles.input, errors[`item_desc_${item.key}`] ? styles.inputError : undefined]}
        placeholder="Descrição do item"
        value={item.description}
        onChangeText={(v) => updateItem(item.key, 'description', v)}
        placeholderTextColor="#9CA3AF"
      />
      {errors[`item_desc_${item.key}`] && (
        <Text style={styles.fieldError}>{errors[`item_desc_${item.key}`]}</Text>
      )}
      <View style={styles.itemRow}>
        <View style={styles.flex1}>
          <Text style={styles.fieldLabel}>Quantidade</Text>
          <TextInput
            style={[styles.input, errors[`item_qty_${item.key}`] ? styles.inputError : undefined]}
            placeholder="1.00"
            value={item.quantity}
            onChangeText={(v) => updateItem(item.key, 'quantity', v)}
            keyboardType="decimal-pad"
            placeholderTextColor="#9CA3AF"
          />
        </View>
        <View style={styles.flex1}>
          <Text style={styles.fieldLabel}>Preço unitário</Text>
          <TextInput
            style={[styles.input, errors[`item_price_${item.key}`] ? styles.inputError : undefined]}
            placeholder="0.00"
            value={item.unit_price}
            onChangeText={(v) => updateItem(item.key, 'unit_price', v)}
            keyboardType="decimal-pad"
            placeholderTextColor="#9CA3AF"
          />
        </View>
      </View>
      <Text style={styles.itemPreviewTotal}>
        Total: {formatMoney(safeDecimalPreview(item.quantity, item.unit_price))}
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Cliente com autocomplete */}
          <Text style={styles.sectionLabel}>Cliente *</Text>
          <TextInput
            style={[styles.input, errors['customer'] ? styles.inputError : undefined]}
            placeholder="Digite o nome do cliente..."
            value={customerSearch}
            onChangeText={(v) => {
              setCustomerSearch(v);
              setCustomerId('');
            }}
            placeholderTextColor="#9CA3AF"
            autoCorrect={false}
          />
          {errors['customer'] && <Text style={styles.fieldError}>{errors['customer']}</Text>}
          {showSuggestions && customers.length > 0 && (
            <View style={styles.suggestions}>
              {customers.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.suggestionRow}
                  onPress={() => selectCustomer(c)}
                >
                  <Text style={styles.suggestionName}>{c.name}</Text>
                  {c.phone ? <Text style={styles.suggestionPhone}>{c.phone}</Text> : null}
                </TouchableOpacity>
              ))}
            </View>
          )}
          {customerId ? <Text style={styles.selectedBadge}>✓ Cliente selecionado</Text> : null}

          {/* Título */}
          <Text style={styles.sectionLabel}>Título (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex.: Instalação câmeras empresa XYZ"
            value={title}
            onChangeText={setTitle}
            placeholderTextColor="#9CA3AF"
          />

          {/* Validade com máscara */}
          <Text style={styles.sectionLabel}>Válido até (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="dd/mm/aaaa"
            value={validUntil}
            onChangeText={(v) => setValidUntil(applyDateMask(v))}
            keyboardType="numeric"
            placeholderTextColor="#9CA3AF"
            maxLength={10}
          />

          {/* Itens */}
          <Text style={styles.sectionLabel}>Itens do orçamento *</Text>
          {errors['items'] && <Text style={styles.fieldError}>{errors['items']}</Text>}
          <FlatList
            data={items}
            keyExtractor={(i) => i.key}
            renderItem={renderItemForm}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 4 }} />}
          />

          <View style={styles.addButtons}>
            <TouchableOpacity style={styles.addCatalogBtn} onPress={() => setShowCatalog(true)}>
              <ShoppingBag size={18} color="#6D28D9" />
              <Text style={styles.addCatalogBtnText}>Do catálogo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addManualBtn} onPress={addManualItem}>
              <Pencil size={18} color="#6B7280" />
              <Text style={styles.addManualBtnText}>Manual</Text>
            </TouchableOpacity>
          </View>

          {items.length > 0 && (
            <View style={styles.totalsBox}>
              <View style={styles.totalRow}>
                <Text style={styles.grandTotalLabel}>Total estimado</Text>
                <Text style={styles.grandTotalValue}>{formatMoney(subtotal)}</Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>
                {editId ? 'Salvar alterações' : 'Criar orçamento'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </TouchableWithoutFeedback>

      {/* Modal catálogo */}
      <Modal visible={showCatalog} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Selecionar do catálogo</Text>
            <TouchableOpacity onPress={() => setShowCatalog(false)}>
              <X size={24} color="#0A0A0F" />
            </TouchableOpacity>
          </View>
          {catalogLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#6D28D9" />
            </View>
          ) : (
            <FlatList
              data={catalogItems}
              keyExtractor={(i) => i.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.catalogRow} onPress={() => addCatalogItem(item)}>
                  <View style={styles.flex1}>
                    <Text style={styles.catalogItemName}>{item.name}</Text>
                    <Text style={styles.catalogItemType}>
                      {item.type === 'SERVICE' ? 'Serviço' : 'Produto'}
                    </Text>
                  </View>
                  <Text style={styles.catalogItemPrice}>{formatMoney(item.unit_price)}</Text>
                  <Plus size={18} color="#6D28D9" />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.center}>
                  <Text style={styles.emptyText}>Nenhum item no catálogo</Text>
                </View>
              }
            />
          )}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 16, paddingBottom: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0A0A0F',
    backgroundColor: '#F9FAFB',
  },
  inputError: { borderColor: '#DC2626' },
  fieldError: { fontSize: 12, color: '#DC2626', marginTop: 4 },
  fieldLabel: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  suggestions: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    marginTop: 2,
    maxHeight: 180,
    overflow: 'hidden',
  },
  suggestionRow: { padding: 12, borderBottomWidth: 1, borderColor: '#F3F4F6' },
  suggestionName: { fontSize: 15, color: '#0A0A0F', fontWeight: '500' },
  suggestionPhone: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  selectedBadge: { fontSize: 13, color: '#059669', marginTop: 6, fontWeight: '500' },
  itemCard: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  itemCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemCardLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' },
  itemRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  flex1: { flex: 1 },
  itemPreviewTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6D28D9',
    marginTop: 8,
    textAlign: 'right',
  },
  addButtons: { flexDirection: 'row', gap: 12, marginTop: 12 },
  addCatalogBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#6D28D9',
    borderRadius: 8,
  },
  addCatalogBtnText: { fontSize: 14, fontWeight: '600', color: '#6D28D9' },
  addManualBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
  },
  addManualBtnText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  totalsBox: { borderTopWidth: 1, borderColor: '#E5E7EB', marginTop: 16, paddingTop: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  grandTotalLabel: { fontSize: 15, fontWeight: '700', color: '#0A0A0F' },
  grandTotalValue: { fontSize: 15, fontWeight: '700', color: '#6D28D9' },
  submitBtn: {
    backgroundColor: '#6D28D9',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 24,
  },
  btnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  modalContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#0A0A0F' },
  catalogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
  },
  catalogItemName: { fontSize: 14, fontWeight: '600', color: '#0A0A0F', marginBottom: 2 },
  catalogItemType: { fontSize: 12, color: '#6B7280' },
  catalogItemPrice: { fontSize: 14, fontWeight: '600', color: '#0A0A0F', marginRight: 4 },
  emptyText: { fontSize: 15, color: '#6B7280', textAlign: 'center' },
});
