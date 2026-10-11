import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { BriefcaseBusiness } from 'lucide-react-native';
import { theme } from '../theme';

export function AuthScaffold({
  title,
  subtitle,
  children,
  cardStyle,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  cardStyle?: ViewStyle;
}): React.JSX.Element {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>
        <View style={styles.shell}>
          <View style={styles.brand}>
            <View style={styles.brandMark}>
              <BriefcaseBusiness size={22} color={theme.colors.white} strokeWidth={2.2} />
            </View>
            <Text style={styles.brandText}>Orcivo</Text>
          </View>
          <View style={[styles.card, cardStyle]}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
            {children}
          </View>
          <Text style={styles.support}>
            Organize clientes, orçamentos e serviços em um só lugar.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.slate50 },
  page: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.xxl,
  },
  shell: { width: '100%', maxWidth: 440, gap: theme.space.xl },
  brand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  brandMark: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.purple600,
  },
  brandText: {
    color: theme.colors.ink,
    fontSize: theme.type.h2,
    fontWeight: theme.type.bold,
    letterSpacing: -0.5,
  },
  card: {
    width: '100%',
    padding: theme.space.xl,
    borderWidth: 1,
    borderColor: theme.colors.slate200,
    borderRadius: theme.radius.xxl,
    backgroundColor: theme.colors.white,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 3,
  },
  title: {
    color: theme.colors.ink,
    fontSize: theme.type.h1,
    fontWeight: theme.type.bold,
    letterSpacing: -0.6,
  },
  subtitle: {
    marginTop: theme.space.sm,
    marginBottom: theme.space.xl,
    color: theme.colors.slate500,
    fontSize: theme.type.small,
    lineHeight: 21,
  },
  support: {
    color: theme.colors.slate500,
    fontSize: theme.type.caption,
    lineHeight: 18,
    textAlign: 'center',
  },
});
