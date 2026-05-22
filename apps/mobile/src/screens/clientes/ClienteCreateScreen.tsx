import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { CustomerCreateSchema } from '@orcivo/shared-types';
import { api } from '../../services/api';

export function ClienteCreateScreen({ navigation }: { navigation: any }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', city: '', state: '', notes: '' });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    const payload = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''));
    const parsed = CustomerCreateSchema.safeParse(payload);
    if (!parsed.success) {
      Alert.alert('Dados inválidos', parsed.error.issues.map(i => i.message).join('\n'));
      return;
    }
    setLoading(true);
    try {
      await api.post('/customers', parsed.data);
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
      <TextInput style={styles.input} placeholder="Nome *" value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} />
      <TextInput style={styles.input} placeholder="Telefone" value={form.phone} onChangeText={v => setForm(f => ({ ...f, phone: v }))} keyboardType="phone-pad" />
      <TextInput style={styles.input} placeholder="E-mail" value={form.email} onChangeText={v => setForm(f => ({ ...f, email: v }))} keyboardType="email-address" autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Cidade" value={form.city} onChangeText={v => setForm(f => ({ ...f, city: v }))} />
      <TextInput style={styles.input} placeholder="UF" value={form.state} onChangeText={v => setForm(f => ({ ...f, state: v.toUpperCase() }))} maxLength={2} />
      <TextInput style={[styles.input, { height: 80 }]} placeholder="Observações" value={form.notes} onChangeText={v => setForm(f => ({ ...f, notes: v }))} multiline />
      <TouchableOpacity style={styles.btn} onPress={handleSave} disabled={loading}>
        <Text style={styles.btnText}>{loading ? 'Salvando...' : 'Salvar cliente'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: '#FFFFFF', flexGrow: 1 },
  title: { fontSize: 22, fontWeight: '700', color: '#0A0A0F', marginBottom: 24 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 16 },
  btn: { backgroundColor: '#6D28D9', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
});
