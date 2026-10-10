import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { catalogService } from '../services/catalog.service';
import { newIdempotencyKey } from '../services/api';
import type { MaisStackParamList } from '../navigation/MaisStack';
import { calculateSalePrice } from '@orcivo/shared-types';

type Props = NativeStackScreenProps<MaisStackParamList, 'CatalogItemForm'>;

type ItemType = 'SERVICE' | 'PRODUCT';

export function CatalogItemFormScreen({ navigation, route }: Props) {
  const submitKey = useRef(newIdempotencyKey());
  const existing = route.params?.item;

  const [name, setName] = useState(existing?.name ?? '');
  const [type, setType] = useState<ItemType>(existing?.type ?? 'SERVICE');
  const [unitPrice, setUnitPrice] = useState(existing?.unit_price ?? '');
  const [unit, setUnit] = useState(existing?.unit ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [costPrice, setCostPrice] = useState(existing?.cost_price ?? '0.00');
  const [marginPercent, setMarginPercent] = useState(existing?.margin_percent ?? '');
  const [markupPercent, setMarkupPercent] = useState(existing?.markup_percent ?? '');
  const [quantity, setQuantity] = useState(String(existing?.quantity ?? 0));
  const [lowStockThreshold, setLowStockThreshold] = useState(
    String(existing?.low_stock_threshold ?? 5),
  );
  const [internalCode, setInternalCode] = useState(existing?.internal_code ?? '');
  const [brand, setBrand] = useState(existing?.brand ?? '');

  const [nameError, setNameError] = useState('');
  const [priceError, setPriceError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const validate = (): boolean => {
    let valid = true;
    if (!name.trim()) {
      setNameError('Nome é obrigatório');
      valid = false;
    } else {
      setNameError('');
    }
    const money = /^\d+([.,]\d{1,2})?$/;
    const percent = /^\d+([.,]\d{1,3})?$/;
    if (!(marginPercent || markupPercent) && (!unitPrice.trim() || !money.test(unitPrice.trim()))) {
      setPriceError('Informe um preço válido (ex: 150.00)');
      valid = false;
    } else if (
      !money.test(costPrice.trim()) ||
      (marginPercent !== '' && !percent.test(marginPercent.trim())) ||
      (markupPercent !== '' && !percent.test(markupPercent.trim())) ||
      (marginPercent !== '' && Number(marginPercent.replace(',', '.')) >= 100) ||
      (marginPercent !== '' && markupPercent !== '') ||
      !/^\d+$/.test(quantity) ||
      !/^\d+$/.test(lowStockThreshold)
    ) {
      setPriceError('Revise custo, margem/markup e quantidades. Use apenas valores positivos.');
      valid = false;
    } else {
      setPriceError('');
    }
    return valid;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const normalizedCost = costPrice.replace(',', '.');
      const normalizedMargin = marginPercent.replace(',', '.');
      const normalizedMarkup = markupPercent.replace(',', '.');
      const calculatedPrice =
        marginPercent || markupPercent
          ? calculateSalePrice(normalizedCost, {
              margin_percent: normalizedMargin || undefined,
              markup_percent: normalizedMarkup || undefined,
            })
          : unitPrice.trim().replace(',', '.');
      const dto = {
        name: name.trim(),
        type,
        unit_price: calculatedPrice,
        sale_price: calculatedPrice,
        cost_price: normalizedCost,
        margin_percent: normalizedMargin || (existing ? null : undefined),
        markup_percent: normalizedMarkup || (existing ? null : undefined),
        quantity: Number.parseInt(quantity, 10),
        low_stock_threshold: Number.parseInt(lowStockThreshold, 10),
        internal_code: internalCode.trim() || (existing ? null : undefined),
        brand: brand.trim() || (existing ? null : undefined),
        unit: unit.trim() || undefined,
        description: description.trim() || undefined,
      };
      if (existing) {
        await catalogService.updateItem(existing.id, dto, { idempotencyKey: submitKey.current });
      } else {
        await catalogService.createItem(
          { ...dto, is_active: true },
          { idempotencyKey: submitKey.current },
        );
      }
      navigation.goBack();
    } catch (err: unknown) {
      const error = (err ?? {}) as { data?: { message?: string } };
      Alert.alert(
        'Erro',
        error.data?.message ?? 'Não foi possível salvar o item. Tente novamente.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.label}>Nome *</Text>
        <TextInput
          style={[styles.input, nameError ? styles.inputError : null]}
          value={name}
          onChangeText={setName}
          placeholder="Ex: Instalação de câmera"
          placeholderTextColor="#9CA3AF"
        />
        {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}

        <Text style={styles.label}>Tipo *</Text>
        <View style={styles.segmented}>
          <TouchableOpacity
            style={[styles.segBtn, type === 'SERVICE' && styles.segBtnActive]}
            onPress={() => setType('SERVICE')}
          >
            <Text style={[styles.segText, type === 'SERVICE' && styles.segTextActive]}>
              Serviço
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segBtn, type === 'PRODUCT' && styles.segBtnActive]}
            onPress={() => setType('PRODUCT')}
          >
            <Text style={[styles.segText, type === 'PRODUCT' && styles.segTextActive]}>
              Produto
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Preço unitário (R$) *</Text>
        <TextInput
          style={[styles.input, priceError ? styles.inputError : null]}
          value={unitPrice}
          onChangeText={setUnitPrice}
          placeholder="Ex: 150.00"
          placeholderTextColor="#9CA3AF"
          keyboardType="decimal-pad"
        />
        {priceError ? <Text style={styles.errorText}>{priceError}</Text> : null}

        <Text style={styles.label}>Preço de custo (R$)</Text>
        <TextInput
          style={styles.input}
          value={costPrice}
          onChangeText={setCostPrice}
          keyboardType="decimal-pad"
        />
        <Text style={styles.label}>Margem (%)</Text>
        <TextInput
          style={styles.input}
          value={marginPercent}
          onChangeText={setMarginPercent}
          keyboardType="decimal-pad"
        />
        <Text style={styles.label}>Markup (%)</Text>
        <TextInput
          style={styles.input}
          value={markupPercent}
          onChangeText={setMarkupPercent}
          keyboardType="decimal-pad"
        />

        {type === 'PRODUCT' ? (
          <>
            <Text style={styles.label}>Quantidade em estoque</Text>
            <TextInput
              style={styles.input}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="number-pad"
            />
            <Text style={styles.label}>Avisar quando chegar a</Text>
            <TextInput
              style={styles.input}
              value={lowStockThreshold}
              onChangeText={setLowStockThreshold}
              keyboardType="number-pad"
            />
          </>
        ) : null}

        <Text style={styles.label}>Código interno</Text>
        <TextInput style={styles.input} value={internalCode} onChangeText={setInternalCode} />
        <Text style={styles.label}>Marca</Text>
        <TextInput style={styles.input} value={brand} onChangeText={setBrand} />

        <Text style={styles.label}>Unidade (opcional)</Text>
        <TextInput
          style={styles.input}
          value={unit}
          onChangeText={setUnit}
          placeholder="Ex: hr, un, m²"
          placeholderTextColor="#9CA3AF"
        />

        <Text style={styles.label}>Descrição (opcional)</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={description}
          onChangeText={setDescription}
          placeholder="Detalhes do item..."
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={4}
        />

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitText}>{existing ? 'Salvar alterações' : 'Criar item'}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#0A0A0F',
    backgroundColor: '#FFFFFF',
  },
  inputError: { borderColor: '#DC2626' },
  multiline: { height: 100, textAlignVertical: 'top' },
  errorText: { color: '#DC2626', fontSize: 12, marginTop: 4 },
  segmented: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  segBtn: { flex: 1, padding: 12, alignItems: 'center', backgroundColor: '#F9FAFB' },
  segBtnActive: { backgroundColor: '#6D28D9' },
  segText: { fontSize: 15, color: '#374151', fontWeight: '500' },
  segTextActive: { color: '#FFFFFF' },
  submitBtn: {
    marginTop: 32,
    backgroundColor: '#6D28D9',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
