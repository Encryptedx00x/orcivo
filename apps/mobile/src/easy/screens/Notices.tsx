import React, { useCallback, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Bell, Check, CheckCheck } from 'lucide-react-native';
import { easy, type NoticePage } from '../data';
import { Btn, C, Card, EmptyBox, ErrorBox, H1, Loading, Page, Sub, s } from '../ui';

const when = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

/** Unread count for the bell, refreshed whenever the screen comes back into focus. */
export function useUnreadNotices(): number {
  const [count, setCount] = useState(0);
  useFocusEffect(
    useCallback(() => {
      easy
        .notices(undefined, 1)
        .then((p) => setCount(p.unread_count))
        .catch(() => undefined);
    }, []),
  );
  return count;
}

/** Bell with the unread badge; opens Avisos (same stack name in both modes). */
export function NoticesBell() {
  const nav = useNavigation<{ navigate: (name: 'Notices') => void }>();
  const unread = useUnreadNotices();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={unread ? `Avisos: ${unread} novo${unread === 1 ? '' : 's'}` : 'Avisos'}
      onPress={() => nav.navigate('Notices')}
      style={{
        width: 48,
        height: 48,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: C.border,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Bell size={24} color={C.ink} />
      {unread > 0 ? (
        <View
          style={{
            position: 'absolute',
            top: -6,
            right: -6,
            minWidth: 22,
            height: 22,
            paddingHorizontal: 6,
            borderRadius: 11,
            backgroundColor: C.purple,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
            {unread > 99 ? '99+' : unread}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/** Avisos: the activity feed of the web bell (approvals, refusals, payments…). */
export function NoticesScreen() {
  const [page, setPage] = useState<NoticePage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setPage(await easy.notices());
    } catch {
      setError('Não foi possível carregar os avisos.');
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const more = async () => {
    if (!page?.next_cursor) return;
    try {
      const p = await easy.notices(page.next_cursor);
      setPage({ ...p, data: [...page.data, ...p.data] });
    } catch {
      Alert.alert('Não deu certo', 'Não foi possível carregar mais avisos.');
    }
  };
  const markRead = async (id: string) => {
    try {
      const r = await easy.noticeRead(id);
      setPage(
        (p) =>
          p && {
            ...p,
            unread_count: Math.max(0, p.unread_count - 1),
            data: p.data.map((n) => (n.id === id ? { ...n, read_at: r.read_at } : n)),
          },
      );
    } catch {
      Alert.alert('Não deu certo', 'Não foi possível marcar como lido.');
    }
  };
  const markAll = async () => {
    try {
      await easy.noticesReadAll();
      const now = new Date().toISOString();
      setPage(
        (p) =>
          p && {
            ...p,
            unread_count: 0,
            data: p.data.map((n) => (n.read_at ? n : { ...n, read_at: now })),
          },
      );
    } catch {
      Alert.alert('Não deu certo', 'Não foi possível marcar os avisos como lidos.');
    }
  };

  const unread = page?.unread_count ?? 0;
  return (
    <Page>
      <View style={{ paddingHorizontal: 4 }}>
        <H1>Avisos</H1>
        <Sub>{unread ? `${unread} novo${unread === 1 ? '' : 's'}` : 'Tudo em dia'}</Sub>
      </View>
      {!page && !error ? <Loading /> : null}
      {error ? <ErrorBox message={error} onRetry={() => void load()} /> : null}
      {page && page.data.length === 0 ? (
        <EmptyBox>Nenhum aviso ainda. Quando um cliente aprovar ou recusar, aparece aqui.</EmptyBox>
      ) : null}
      {page && page.data.length > 0 ? (
        <>
          {unread > 0 ? (
            <Btn tone="outline" icon={CheckCheck} height={52} onPress={() => void markAll()}>
              Marcar todos como lidos
            </Btn>
          ) : null}
          <Card style={{ overflow: 'hidden' }}>
            {page.data.map((n, i) => (
              <View
                key={n.id}
                style={{
                  flexDirection: 'row',
                  gap: 12,
                  padding: 16,
                  borderTopWidth: i ? 1 : 0,
                  borderColor: C.line,
                  backgroundColor: n.read_at ? '#FFFFFF' : C.purple50,
                }}
              >
                <View
                  accessibilityLabel={n.read_at ? 'Lido' : 'Novo'}
                  style={{
                    width: 10,
                    height: 10,
                    marginTop: 8,
                    borderRadius: 5,
                    backgroundColor: n.read_at ? C.border : C.purple,
                  }}
                />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[s.body, { fontWeight: n.read_at ? '400' : '600' }]}>
                    {n.human_text}
                  </Text>
                  <Text style={s.muted}>{when(n.created_at)}</Text>
                  {!n.read_at ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => void markRead(n.id)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        minHeight: 40,
                        alignSelf: 'flex-start',
                      }}
                    >
                      <Check size={18} color={C.purple} />
                      <Text style={{ color: C.purple, fontSize: 16, fontWeight: '600' }}>
                        Marcar como lido
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))}
          </Card>
          {page.next_cursor ? (
            <Btn tone="link" onPress={() => void more()}>
              Ver mais avisos
            </Btn>
          ) : null}
        </>
      ) : null}
    </Page>
  );
}
