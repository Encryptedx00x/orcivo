import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

export function InicioScreen() {
  const { company } = useAuth();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bem-vindo</Text>
      {company && <Text style={styles.sub}>{company.trade_name}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  title: { fontSize: 22, fontWeight: '700', color: '#0A0A0F' },
  sub: { fontSize: 16, color: '#6B7280', marginTop: 8 },
});
