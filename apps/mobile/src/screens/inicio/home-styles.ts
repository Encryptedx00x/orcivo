import { StyleSheet } from 'react-native';
import { theme } from '../../theme';

const { colors, radius, space, type, touchTarget } = theme;

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  content: { padding: space.lg, gap: space.md },
  title: { fontSize: type.h2, fontWeight: type.bold, color: colors.ink },
  heading: { fontSize: type.h3, fontWeight: type.semibold, color: colors.ink, marginTop: space.md },
  muted: { fontSize: type.small, color: colors.slate500 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  card: {
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: radius.md,
    gap: space.sm,
  },
  kpi: { flexGrow: 1, flexBasis: '45%' },
  value: { fontSize: type.h2, fontWeight: type.bold, color: colors.ink },
  time: { color: colors.purple600, fontWeight: type.semibold },
  itemTitle: { fontSize: type.body, color: colors.ink, fontWeight: type.medium },
  link: { color: colors.purple600, paddingVertical: space.md },
  action: {
    backgroundColor: colors.purple600,
    borderRadius: radius.sm,
    padding: space.lg,
    minHeight: touchTarget + 4,
  },
  actionText: {
    color: colors.white,
    fontSize: type.body,
    fontWeight: type.semibold,
    textAlign: 'center',
  },
});
