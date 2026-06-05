import React from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { useSubscription } from '../contexts/SubscriptionContext';

export function SubscriptionBanner() {
  const { is_blocked, is_past_due, message } = useSubscription();

  if (!is_blocked && !is_past_due) return null;

  const bgColor = is_blocked ? '#DC2626' : '#D97706';

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <AlertTriangle size={16} color="#FFFFFF" />
      <Text style={styles.text}>{message}</Text>
      <TouchableOpacity onPress={() => Linking.openURL('https://orcivo.com.br/planos')}>
        <Text style={styles.link}>Ver planos</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, paddingHorizontal: 16 },
  text: { color: '#FFFFFF', fontSize: 13, flex: 1 },
  link: { color: '#FFFFFF', fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },
});
