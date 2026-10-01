import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: '700', color: '#0A0A0F' },
  heading: { fontSize: 18, fontWeight: '600', color: '#0A0A0F', marginTop: 12 },
  muted: { fontSize: 14, color: '#6B7280' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { padding: 16, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, gap: 8 },
  kpi: { flexGrow: 1, flexBasis: '45%' },
  value: { fontSize: 24, fontWeight: '700', color: '#0A0A0F' },
  time: { color: '#6D28D9', fontWeight: '600' },
  itemTitle: { fontSize: 16, color: '#0A0A0F', fontWeight: '500' },
  link: { color: '#6D28D9', paddingVertical: 12 },
  action: { backgroundColor: '#6D28D9', borderRadius: 8, padding: 16, minHeight: 48 },
  actionText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', textAlign: 'center' },
});
