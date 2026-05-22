import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.seudominio.com.br';

type HealthStatus = 'loading' | 'ok' | 'error';

export default function App() {
  const [status, setStatus] = useState<HealthStatus>('loading');
  const [timestamp, setTimestamp] = useState<string>('');

  const checkHealth = async () => {
    setStatus('loading');
    try {
      const res = await fetch(`${API_URL}/health`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { status: string; timestamp: string };
      if (data.status === 'ok') {
        setStatus('ok');
        setTimestamp(data.timestamp);
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <Text style={styles.logo}>Orcivo</Text>
      <Text style={styles.tagline}>Para técnicos que constroem negócios</Text>

      <View style={styles.card}>
        {status === 'loading' && (
          <>
            <ActivityIndicator size="large" color="#6D28D9" />
            <Text style={styles.statusText}>Verificando backend...</Text>
          </>
        )}
        {status === 'ok' && (
          <>
            <Text style={styles.statusOk}>Backend OK</Text>
            <Text style={styles.timestamp}>{timestamp}</Text>
          </>
        )}
        {status === 'error' && (
          <>
            <Text style={styles.statusError}>Backend indisponível</Text>
            <Text style={styles.apiUrl}>{API_URL}</Text>
          </>
        )}
      </View>

      <TouchableOpacity style={styles.button} onPress={checkHealth}>
        <Text style={styles.buttonText}>Verificar novamente</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logo: {
    fontSize: 36,
    fontWeight: '700',
    color: '#6D28D9',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 40,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusText: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 16,
  },
  statusOk: {
    fontSize: 24,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 8,
  },
  statusError: {
    fontSize: 24,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  apiUrl: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  button: {
    backgroundColor: '#6D28D9',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
