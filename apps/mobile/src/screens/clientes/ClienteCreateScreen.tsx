import React, { useRef, useState } from 'react';
import { Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { CustomerCreateSchema } from '@orcivo/shared-types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../../services/api';
import { newIdempotencyKey } from '../../services/api';
import type { ClientesStackParamList } from '../../navigation/AppTabs';
import * as Contacts from 'expo-contacts';

type Props = NativeStackScreenProps<ClientesStackParamList, 'ClienteCreate'>;

const ORIGINS = [
  ['INDICATION', 'Indicação'],
  ['INSTAGRAM', 'Instagram'],
  ['GOOGLE', 'Google'],
  ['FACEBOOK', 'Facebook'],
  ['OTHER', 'Outro'],
] as const;

export function ClienteCreateScreen({ navigation }: Props) {
  const submitKey = useRef(newIdempotencyKey());
  const [form, setForm] = useState({
    name: '',
    phone: '',
    phone2: '',
    origin: '',
    birthday: '',
    email: '',
    city: '',
    state: '',
    internal_notes: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    const payload = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''));
    const parsed = CustomerCreateSchema.safeParse(payload);
    if (!parsed.success) {
      Alert.alert('Dados inválidos', parsed.error.issues.map((i) => i.message).join('\n'));
      return;
    }
    setLoading(true);
    try {
      await api.post('/customers', parsed.data, { idempotencyKey: submitKey.current });
      let preference: 'ALWAYS' | 'NEVER' | 'ASK' = 'NEVER';
      try {
        const company = await api.get<{ contact_save_preference: 'ALWAYS' | 'NEVER' | 'ASK' }>(
          '/company/me',
        );
        preference = company.contact_save_preference;
      } catch {
        // O cliente já foi salvo; uma falha ao buscar a preferência não deve repetir o cadastro.
      }
      const saveContact = async () => {
        const permission = await Contacts.requestPermissionsAsync();
        if (permission.status !== 'granted') {
          Alert.alert(
            'Permissão necessária',
            'Autorize o acesso aos contatos nas configurações do celular.',
          );
          return;
        }
        await Contacts.addContactAsync({
          contactType: Contacts.ContactTypes.Person,
          name: form.name,
          phoneNumbers: [form.phone, form.phone2]
            .filter(Boolean)
            .map((number) => ({ number, label: 'mobile' })),
          emails: form.email ? [{ email: form.email, label: 'work' }] : undefined,
        });
      };
      if (preference === 'ALWAYS') {
        try {
          await saveContact();
        } catch {
          Alert.alert(
            'Cliente salvo',
            'O cadastro foi concluído, mas não foi possível adicioná-lo aos contatos.',
          );
        }
      }
      if (preference === 'ASK') {
        Alert.alert(
          'Salvar nos contatos?',
          'Deseja adicionar este cliente aos contatos do celular?',
          [
            { text: 'Agora não', style: 'cancel', onPress: () => navigation.goBack() },
            {
              text: 'Salvar',
              onPress: () => void saveContact().finally(() => navigation.goBack()),
            },
          ],
        );
        return;
      }
      navigation.goBack();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o cliente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Novo cliente</Text>
      <TextInput
        style={styles.input}
        placeholder="Nome *"
        value={form.name}
        onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
      />
      <TextInput
        style={styles.input}
        placeholder="Segundo telefone"
        value={form.phone2}
        onChangeText={(v) => setForm((f) => ({ ...f, phone2: v }))}
        keyboardType="phone-pad"
      />
      <Text style={styles.label}>Como conheceu a empresa?</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.originList}>
        {ORIGINS.map(([value, label]) => (
          <TouchableOpacity
            key={value}
            style={[styles.originOption, form.origin === value && styles.originOptionActive]}
            onPress={() => setForm((f) => ({ ...f, origin: f.origin === value ? '' : value }))}
          >
            <Text style={[styles.originText, form.origin === value && styles.originTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <TextInput
        style={styles.input}
        placeholder="Aniversário (AAAA-MM-DD)"
        value={form.birthday}
        onChangeText={(v) => setForm((f) => ({ ...f, birthday: v }))}
      />
      <TextInput
        style={styles.input}
        placeholder="Telefone"
        value={form.phone}
        onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))}
        keyboardType="phone-pad"
      />
      <TextInput
        style={styles.input}
        placeholder="E-mail"
        value={form.email}
        onChangeText={(v) => setForm((f) => ({ ...f, email: v }))}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Cidade"
        value={form.city}
        onChangeText={(v) => setForm((f) => ({ ...f, city: v }))}
      />
      <TextInput
        style={styles.input}
        placeholder="UF"
        value={form.state}
        onChangeText={(v) => setForm((f) => ({ ...f, state: v.toUpperCase() }))}
        maxLength={2}
      />
      <TextInput
        style={[styles.input, { height: 80 }]}
        placeholder="Observações"
        value={form.internal_notes}
        onChangeText={(v) => setForm((f) => ({ ...f, internal_notes: v }))}
        multiline
      />
      <TouchableOpacity style={styles.btn} onPress={handleSave} disabled={loading}>
        <Text style={styles.btnText}>{loading ? 'Salvando...' : 'Salvar cliente'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: '#FFFFFF', flexGrow: 1 },
  title: { fontSize: 22, fontWeight: '700', color: '#0A0A0F', marginBottom: 24 },
  label: { color: '#374151', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  originList: { marginBottom: 12, flexGrow: 0 },
  originOption: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  originOptionActive: { backgroundColor: '#6D28D9', borderColor: '#6D28D9' },
  originText: { color: '#374151', fontSize: 13 },
  originTextActive: { color: '#FFFFFF', fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  btn: {
    backgroundColor: '#6D28D9',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
});
