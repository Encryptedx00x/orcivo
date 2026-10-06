import React from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  Calendar,
  ChevronRight,
  ClipboardList,
  DollarSign,
  FileText,
  Plus,
  UserPlus,
  type LucideIcon,
} from 'lucide-react-native';
import { formatMoney } from '@orcivo/shared-types';
import { easy } from '../data';
import { emptyDraft, useDraft, useEasyNav } from '../draft';
import {
  C,
  Card,
  Chip,
  ErrorBox,
  Loading,
  Page,
  SectionLabel,
  firstName,
  hhmm,
  longDate,
  s,
  useLoad,
} from '../ui';

export function HomeScreen() {
  const nav = useEasyNav();
  const { setDraft } = useDraft();
  const { data, error, refresh } = useLoad(easy.summary, 'Não foi possível carregar o seu dia.');
  const now = new Date();
  const greet = now.getHours() < 12 ? 'Bom dia' : now.getHours() < 18 ? 'Boa tarde' : 'Boa noite';
  const today = (data?.upcoming ?? []).filter(
    (u) => new Date(u.starts_at).toDateString() === now.toDateString(),
  );
  const late = data?.kpis.receivables_overdue_count ?? 0;
  const tab = (screen: 'Agenda' | 'Orcamentos') => nav.navigate('EasyTabs', { screen });

  const startQuote = () => {
    setDraft(emptyDraft());
    nav.navigate('QuoteClient');
  };

  return (
    <Page top>
      <View style={{ gap: 2, paddingHorizontal: 4, paddingTop: 8 }}>
        <Text style={[s.muted, { fontSize: 16 }]}>{longDate(now)}</Text>
        <Text accessibilityRole="header" style={[s.h1, { fontSize: 30, lineHeight: 36 }]}>
          {greet}
          {data ? `, ${firstName(data.user.name)}` : ''}
        </Text>
      </View>

      {!data && !error ? <Loading /> : null}
      {error ? <ErrorBox message={error} onRetry={refresh} /> : null}
      {data ? (
        <>
          <Pressable
            accessibilityRole="button"
            onPress={startQuote}
            style={({ pressed }) => [
              {
                minHeight: 128,
                borderRadius: 24,
                backgroundColor: C.purple,
                padding: 20,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 16,
              },
              pressed && { opacity: 0.9 },
            ]}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                backgroundColor: 'rgba(255,255,255,0.16)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Plus size={34} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontSize: 22, fontWeight: '700', color: '#FFFFFF' }}>
                Novo orçamento
              </Text>
              <Text style={{ fontSize: 16, fontWeight: '500', color: C.purple100 }}>
                Pronto em 3 passos
              </Text>
            </View>
            <ChevronRight size={28} color="#FFFFFF" />
          </Pressable>

          <Card onPress={() => tab('Agenda')} label="Abrir agenda" style={{ padding: 18, gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Calendar size={22} color={C.purple} />
              <Text style={[s.body, { fontWeight: '700', fontSize: 18, flex: 1 }]}>Hoje</Text>
              <ChevronRight size={22} color={C.fg4} />
            </View>
            {today.length ? (
              today.slice(0, 3).map((n) => (
                <View key={n.id} style={{ flexDirection: 'row', gap: 12 }}>
                  <Text style={[s.body, { fontWeight: '700', width: 56 }]}>
                    {hhmm(n.starts_at)}
                  </Text>
                  <Text style={[s.body, { flex: 1, color: C.fg2 }]} numberOfLines={1}>
                    {n.title}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={s.muted}>Nada marcado</Text>
            )}
          </Card>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Tile
              icon={ClipboardList}
              value={data.kpis.os_pending}
              title="Serviços"
              sub="para fazer"
              onPress={() => nav.navigate('Services')}
            />
            <Tile
              icon={FileText}
              value={data.kpis.quotes_pending}
              title="Orçamentos"
              sub="esperando resposta"
              onPress={() => tab('Orcamentos')}
            />
          </View>

          <Card
            onPress={() => nav.navigate('Money')}
            label="Abrir dinheiro"
            style={{ padding: 18, flexDirection: 'row', alignItems: 'center', gap: 16 }}
          >
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[s.body, { fontWeight: '700', fontSize: 18 }]}>A receber</Text>
              <Text style={{ fontSize: 30, fontWeight: '800', color: C.ink }}>
                {formatMoney(data.kpis.receivables_pending_total ?? '0')}
              </Text>
              {late > 0 ? (
                <Chip kind="late" label={`${late} ${late > 1 ? 'atrasados' : 'atrasado'}`} />
              ) : null}
            </View>
            <ChevronRight size={24} color={C.fg4} />
          </Card>

          <SectionLabel>Atalhos</SectionLabel>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(
              [
                ['Cliente', UserPlus, () => nav.navigate('ClientNew')],
                ['Serviço', ClipboardList, () => nav.navigate('Services')],
                ['Agenda', Calendar, () => tab('Agenda')],
                ['Recebido', DollarSign, () => nav.navigate('Money')],
              ] as const
            ).map(([label, Icon, onPress]) => (
              <Card
                key={label}
                onPress={onPress}
                label={label}
                style={{ flex: 1, alignItems: 'center', gap: 6, paddingVertical: 14 }}
              >
                <Icon size={24} color={C.purple} />
                <Text style={[s.muted, { fontWeight: '600', color: C.ink }]}>{label}</Text>
              </Card>
            ))}
          </View>
        </>
      ) : null}
    </Page>
  );
}

function Tile({
  icon: Icon,
  value,
  title,
  sub,
  onPress,
}: {
  icon: LucideIcon;
  value: number;
  title: string;
  sub: string;
  onPress: () => void;
}) {
  return (
    <Card
      onPress={onPress}
      label={`${title}: ${value} ${sub}`}
      style={{ flex: 1, minHeight: 132, padding: 16, gap: 4 }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: C.purple50,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={24} color={C.purple} />
      </View>
      <Text style={{ fontSize: 36, fontWeight: '700', color: C.ink, marginTop: 4 }}>{value}</Text>
      <Text style={[s.body, { fontWeight: '700', fontSize: 18 }]}>{title}</Text>
      <Text style={s.muted}>{sub}</Text>
    </Card>
  );
}
