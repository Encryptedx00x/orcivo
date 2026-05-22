import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Clock } from 'lucide-react-native';

export function EmBreveScreen() {
  return (
    <View style={styles.container}>
      <Clock size={48} color="#6D28D9" />
      <Text style={styles.title}>Em breve</Text>
      <Text style={styles.sub}>Esta seção está em desenvolvimento.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', padding: 24 },
  title: { fontSize: 20, fontWeight: '600', color: '#0A0A0F', marginTop: 16 },
  sub: { fontSize: 14, color: '#6B7280', marginTop: 8, textAlign: 'center' },
});
