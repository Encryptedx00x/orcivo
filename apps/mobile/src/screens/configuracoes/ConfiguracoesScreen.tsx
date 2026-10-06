import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { TextInputProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ApprovalMethodsPicker, LogoPicker } from '../../easy/screens/Settings';
import { useEasyMode } from '../../easy/EasyModeContext';
import { api, newIdempotencyKey } from '../../services/api';
import {
  inferPixKeyType,
  maskPixKey,
  PIX_TYPES,
  profileFromCompany,
  profilePayload,
  saveError,
} from './company-form';
import type { CompanyProfile, CompanyResponse, PixKeyType } from './company-form';

function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#64748B"
        style={styles.input}
        {...props}
      />
    </View>
  );
}

function SaveButton({
  label,
  busy,
  onPress,
}: {
  label: string;
  busy: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled: busy, busy }}
      disabled={busy}
      onPress={onPress}
      style={[styles.button, busy && styles.disabled]}
    >
      <Text style={styles.buttonText}>{busy ? 'Salvando…' : label}</Text>
    </TouchableOpacity>
  );
}

type ConfigNav = NativeStackNavigationProp<{
  Edit: { kind: string };
  QuoteSign: { standalone?: boolean } | undefined;
}>;

export function ConfiguracoesScreen() {
  const navigation = useNavigation<ConfigNav>();
  const { setEasy } = useEasyMode();
  const insets = useSafeAreaInsets();
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [profile, setProfile] = useState<CompanyProfile>(profileFromCompany({}));
  const [pix, setPix] = useState<{ pix_key_type: PixKeyType; pix_key: string }>({
    pix_key_type: 'CNPJ',
    pix_key: '',
  });
  const [profileBusy, setProfileBusy] = useState(false);
  const [pixBusy, setPixBusy] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [pixError, setPixError] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);
  const [pixSaved, setPixSaved] = useState(false);
  const profileRequest = useRef<{ body: string; key: string } | null>(null);
  const pixRequest = useRef<{ body: string; key: string } | null>(null);
  const profileLock = useRef(false);
  const pixLock = useRef(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError('');
    void api
      .get<CompanyResponse>('/company/me')
      .then((company) => {
        if (!active) return;
        setProfile(profileFromCompany(company));
        const key = company.pix_key ?? '';
        setPix({ pix_key_type: inferPixKeyType(key), pix_key: key });
      })
      .catch(() => {
        if (active)
          setLoadError('Não foi possível carregar os dados da empresa. Verifique sua conexão.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  function editProfile(field: keyof CompanyProfile, value: string) {
    setProfileSaved(false);
    setProfileError('');
    setProfile((current) => ({ ...current, [field]: value }));
  }

  async function saveProfile() {
    if (profileLock.current) return;
    const payload = profilePayload(profile);
    setProfileSaved(false);
    if (payload.trade_name.length < 2) {
      setProfileError('Informe o nome da empresa com pelo menos 2 caracteres.');
      return;
    }
    profileLock.current = true;
    setProfileBusy(true);
    setProfileError('');
    const body = JSON.stringify(payload);
    if (profileRequest.current?.body !== body)
      profileRequest.current = { body, key: newIdempotencyKey() };
    try {
      await api.patch('/company/me', payload, { idempotencyKey: profileRequest.current.key });
      profileRequest.current = null;
      setProfileSaved(true);
    } catch (error) {
      setProfileError(saveError(error));
    } finally {
      profileLock.current = false;
      setProfileBusy(false);
    }
  }

  async function savePix() {
    if (pixLock.current) return;
    setPixSaved(false);
    if (!pix.pix_key.trim()) {
      setPixError('Informe a chave Pix.');
      return;
    }
    pixLock.current = true;
    setPixBusy(true);
    setPixError('');
    const body = JSON.stringify(pix);
    if (pixRequest.current?.body !== body) pixRequest.current = { body, key: newIdempotencyKey() };
    try {
      await api.patch('/company/me', pix, { idempotencyKey: pixRequest.current.key });
      pixRequest.current = null;
      setPixSaved(true);
    } catch (error) {
      setPixError(saveError(error));
    } finally {
      pixLock.current = false;
      setPixBusy(false);
    }
  }

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator accessibilityLabel="Carregando configurações" color="#6D28D9" />
        <Text style={styles.description}>Carregando…</Text>
      </View>
    );
  if (loadError)
    return (
      <View style={styles.center}>
        <Text accessibilityRole="alert" style={styles.error}>
          {loadError}
        </Text>
        <SaveButton
          label="Tentar novamente"
          busy={false}
          onPress={() => setAttempt((value) => value + 1)}
        />
      </View>
    );

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={insets.top + (Platform.OS === 'ios' ? 44 : 56)}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(16, insets.bottom) }]}
      >
        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.title}>
            Dados da empresa
          </Text>
          <Text style={styles.description}>Aparecem no topo de orçamentos, OS e recibos.</Text>
          <Field
            label="Nome da empresa / nome fantasia"
            value={profile.trade_name}
            maxLength={150}
            editable={!profileBusy}
            onChangeText={(value) => editProfile('trade_name', value)}
          />
          <Field
            label="Documento (CPF/CNPJ)"
            value={profile.document}
            maxLength={20}
            keyboardType="numeric"
            editable={!profileBusy}
            onChangeText={(value) => editProfile('document', value)}
          />
          <Field
            label="Telefone"
            value={profile.phone}
            maxLength={20}
            keyboardType="phone-pad"
            editable={!profileBusy}
            onChangeText={(value) => editProfile('phone', value)}
          />
          <Field
            label="Cidade"
            value={profile.city}
            maxLength={100}
            editable={!profileBusy}
            onChangeText={(value) => editProfile('city', value)}
          />
          <Field
            label="UF"
            value={profile.state}
            maxLength={2}
            autoCapitalize="characters"
            editable={!profileBusy}
            onChangeText={(value) => editProfile('state', value.toUpperCase())}
          />
          {!!profileError && (
            <Text accessibilityRole="alert" style={styles.error}>
              {profileError}
            </Text>
          )}
          {profileSaved && (
            <Text accessibilityLiveRegion="polite" style={styles.success}>
              Dados da empresa salvos com sucesso.
            </Text>
          )}
          <SaveButton
            label="Salvar alterações"
            busy={profileBusy}
            onPress={() => void saveProfile()}
          />
        </View>
        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.title}>
            Chave Pix
          </Text>
          <Text style={styles.description}>
            Inserida automaticamente nos recibos enviados ao cliente.
          </Text>
          <Text style={styles.label}>Tipo de chave</Text>
          <View style={styles.types}>
            {PIX_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                accessibilityRole="radio"
                accessibilityLabel={type.label}
                accessibilityState={{ checked: pix.pix_key_type === type.value, disabled: pixBusy }}
                disabled={pixBusy}
                style={[styles.type, pix.pix_key_type === type.value && styles.selectedType]}
                onPress={() => {
                  setPixSaved(false);
                  setPixError('');
                  setPix((current) => ({
                    pix_key_type: type.value,
                    pix_key: maskPixKey(type.value, current.pix_key),
                  }));
                }}
              >
                <Text style={pix.pix_key_type === type.value ? styles.selectedLabel : styles.label}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Field
            label="Chave Pix"
            value={pix.pix_key}
            editable={!pixBusy}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={140}
            placeholder={PIX_TYPES.find((type) => type.value === pix.pix_key_type)?.placeholder}
            keyboardType={
              pix.pix_key_type === 'EMAIL'
                ? 'email-address'
                : pix.pix_key_type === 'RANDOM'
                  ? 'default'
                  : 'phone-pad'
            }
            onChangeText={(value) => {
              setPixSaved(false);
              setPixError('');
              setPix((current) => ({
                ...current,
                pix_key: maskPixKey(current.pix_key_type, value),
              }));
            }}
          />
          {!!pixError && (
            <Text accessibilityRole="alert" style={styles.error}>
              {pixError}
            </Text>
          )}
          {pixSaved && (
            <Text accessibilityLiveRegion="polite" style={styles.success}>
              Chave Pix salva com sucesso.
            </Text>
          )}
          <SaveButton label="Salvar chave Pix" busy={pixBusy} onPress={() => void savePix()} />
        </View>
        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.title}>
            Logo
          </Text>
          <Text style={styles.description}>
            Aparece no topo dos orçamentos, OS e recibos em PDF.
          </Text>
          <LogoPicker large={false} />
        </View>
        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.title}>
            Como o cliente aprova
          </Text>
          <Text style={styles.description}>
            O cliente escolhe no link entre as formas ligadas. Pelo menos uma fica ligada.
          </Text>
          <ApprovalMethodsPicker />
        </View>
        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.title}>
            Orçamentos e assinatura
          </Text>
          <Text style={styles.description}>
            Condições e validade padrão dos orçamentos novos e sua assinatura salva.
          </Text>
          <SaveButton
            label="Condições padrão"
            busy={false}
            onPress={() => navigation.navigate('Edit', { kind: 'terms' })}
          />
          <SaveButton
            label="Minha assinatura"
            busy={false}
            onPress={() => navigation.navigate('QuoteSign', { standalone: true })}
          />
        </View>
        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.title}>
            Modo fácil
          </Text>
          <Text style={styles.description}>
            Botões grandes e só o essencial, com tudo do modo completo a um toque. Vale para este
            aparelho.
          </Text>
          <SaveButton label="Ligar o Modo fácil" busy={false} onPress={() => setEasy(true)} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', padding: 24, gap: 16, backgroundColor: '#FFFFFF' },
  content: { padding: 16, gap: 16 },
  card: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  title: { color: '#0A0A0F', fontSize: 20, lineHeight: 28, fontWeight: '600' },
  description: { color: '#64748B', fontSize: 14, lineHeight: 20, marginTop: 4, marginBottom: 16 },
  field: { marginBottom: 12, gap: 8 },
  label: { color: '#0A0A0F', fontSize: 14, fontWeight: '500' },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    minHeight: 48,
    fontSize: 16,
    color: '#0A0A0F',
    backgroundColor: '#FFFFFF',
  },
  button: {
    backgroundColor: '#6D28D9',
    borderRadius: 12,
    minHeight: 48,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  disabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, marginBottom: 16 },
  type: {
    minHeight: 44,
    minWidth: 44,
    padding: 12,
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedType: { borderColor: '#6D28D9', backgroundColor: '#F5F3FF' },
  selectedLabel: { color: '#6D28D9', fontSize: 14, fontWeight: '600' },
  error: { color: '#DC2626', fontSize: 14, lineHeight: 20, marginBottom: 8 },
  success: { color: '#15803D', fontSize: 14, lineHeight: 20, marginBottom: 8 },
});
