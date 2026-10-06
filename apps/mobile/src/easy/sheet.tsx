import React, { createContext, useCallback, useContext, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LucideIcon } from 'lucide-react-native';
import { C } from './ui';

export interface SheetAction {
  label: string;
  icon: LucideIcon;
  sub?: string;
  danger?: boolean;
  run: () => void;
}
export interface SheetSpec {
  title: string;
  sub?: string;
  actions: SheetAction[];
}

const Ctx = createContext<(s: SheetSpec) => void>(() => {});
/** Bottom sheet "Mais ações" (same as the web Modo fácil). Picking an action closes it first. */
export const useSheet = () => useContext(Ctx);

/** Reason picker for actions the backend audits with a motive. */
export function reasonSheet(
  open: (s: SheetSpec) => void,
  title: string,
  reasons: string[],
  onPick: (reason: string) => void,
  icon: LucideIcon,
): void {
  open({
    title,
    sub: 'O motivo fica guardado no histórico.',
    actions: reasons.map((r) => ({ label: r, icon, run: () => onPick(r) })),
  });
}

export function SheetProvider({ children }: { children: React.ReactNode }) {
  const [sheet, setSheet] = useState<SheetSpec | null>(null);
  const insets = useSafeAreaInsets();
  const close = useCallback(() => setSheet(null), []);
  return (
    <Ctx.Provider value={setSheet}>
      {children}
      <Modal visible={!!sheet} transparent animationType="slide" onRequestClose={close}>
        <Pressable
          accessibilityLabel="Fechar"
          onPress={close}
          style={{ flex: 1, backgroundColor: 'rgba(10,10,15,0.5)' }}
        />
        {sheet && (
          <View
            accessibilityViewIsModal
            style={{
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingHorizontal: 16,
              paddingTop: 10,
              paddingBottom: Math.max(16, insets.bottom + 8),
              maxHeight: '80%',
            }}
          >
            <View
              style={{
                width: 44,
                height: 5,
                borderRadius: 3,
                backgroundColor: C.borderStrong,
                alignSelf: 'center',
                marginBottom: 10,
              }}
            />
            <View style={{ paddingHorizontal: 4, paddingBottom: 8 }}>
              <Text
                accessibilityRole="header"
                style={{ fontSize: 21, fontWeight: '700', color: C.ink }}
              >
                {sheet.title}
              </Text>
              {sheet.sub ? <Text style={{ fontSize: 16, color: C.fg3 }}>{sheet.sub}</Text> : null}
            </View>
            <ScrollView>
              {sheet.actions.map((a) => {
                const Icon = a.icon;
                return (
                  <Pressable
                    key={a.label}
                    accessibilityRole="button"
                    onPress={() => {
                      setSheet(null);
                      a.run();
                    }}
                    style={({ pressed }) => ({
                      minHeight: 64,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 14,
                      paddingVertical: 8,
                      paddingHorizontal: 4,
                      borderTopWidth: 1,
                      borderColor: C.line,
                      backgroundColor: pressed ? C.line : '#FFFFFF',
                    })}
                  >
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        backgroundColor: a.danger ? '#FEF2F2' : C.purple50,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={22} color={a.danger ? '#B91C1C' : C.purple} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 18,
                          fontWeight: '600',
                          color: a.danger ? '#B91C1C' : C.ink,
                        }}
                      >
                        {a.label}
                      </Text>
                      {a.sub ? <Text style={{ fontSize: 15, color: C.fg3 }}>{a.sub}</Text> : null}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable
              accessibilityRole="button"
              onPress={close}
              style={{
                height: 56,
                marginTop: 6,
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: C.borderStrong,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: '600', color: C.ink }}>Fechar</Text>
            </Pressable>
          </View>
        )}
      </Modal>
    </Ctx.Provider>
  );
}
