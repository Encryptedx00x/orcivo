import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Image as ImageIcon, Upload } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { workOrderService } from '../services/work-order.service';
import type { MaisStackParamList } from '../navigation/MaisStack';

type PhotoStage = 'BEFORE' | 'DURING' | 'AFTER';

type Props = NativeStackScreenProps<MaisStackParamList, 'WorkOrderPhoto'>;

const STAGE_OPTIONS: { value: PhotoStage; label: string }[] = [
  { value: 'BEFORE', label: 'Antes' },
  { value: 'DURING', label: 'Durante' },
  { value: 'AFTER', label: 'Depois' },
];

export function WorkOrderPhotoScreen({ navigation, route }: Props) {
  const { workOrderId, stage: initialStage, onPhotoUploaded } = route.params;

  const [stage, setStage] = useState<PhotoStage>(initialStage ?? 'BEFORE');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permissão negada',
        'Para tirar fotos, permita o acesso à câmera nas configurações do dispositivo.',
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permissão negada',
        'Para selecionar fotos, permita o acesso à galeria nas configurações do dispositivo.',
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleUpload = async () => {
    if (!imageUri) {
      Alert.alert('Atenção', 'Selecione ou tire uma foto antes de enviar.');
      return;
    }
    try {
      setUploading(true);
      await workOrderService.uploadPhoto(workOrderId, imageUri, stage, caption.trim() || undefined);
      if (onPhotoUploaded) onPhotoUploaded();
      navigation.goBack();
    } catch {
      Alert.alert('Erro', 'Não foi possível enviar a foto. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Seletor de etapa */}
      <Text style={styles.label}>Etapa da OS *</Text>
      <View style={styles.stagePicker}>
        {STAGE_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.stageBtn, stage === opt.value && styles.stageBtnActive]}
            onPress={() => setStage(opt.value)}
          >
            <Text style={[styles.stageBtnText, stage === opt.value && styles.stageBtnTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Botões de câmera/galeria */}
      <Text style={styles.label}>Foto *</Text>
      <View style={styles.pickerRow}>
        <TouchableOpacity style={styles.pickerBtn} onPress={openCamera} disabled={uploading}>
          <Camera size={20} color="#6D28D9" />
          <Text style={styles.pickerBtnText}>Câmera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.pickerBtn} onPress={openGallery} disabled={uploading}>
          <ImageIcon size={20} color="#6D28D9" />
          <Text style={styles.pickerBtnText}>Galeria</Text>
        </TouchableOpacity>
      </View>

      {/* Preview */}
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.preview} accessibilityLabel="Preview da foto selecionada" />
      ) : (
        <View style={styles.previewPlaceholder}>
          <ImageIcon size={48} color="#D1D5DB" />
          <Text style={styles.previewPlaceholderText}>Nenhuma foto selecionada</Text>
        </View>
      )}

      {/* Legenda */}
      <Text style={styles.label}>Legenda (opcional)</Text>
      <TextInput
        style={styles.input}
        value={caption}
        onChangeText={setCaption}
        placeholder="Ex: Fiação antes da instalação"
        placeholderTextColor="#9CA3AF"
        multiline
        editable={!uploading}
      />

      {/* Botão enviar */}
      <TouchableOpacity
        style={[styles.uploadBtn, (!imageUri || uploading) && styles.uploadBtnDisabled]}
        onPress={handleUpload}
        disabled={!imageUri || uploading}
      >
        {uploading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Upload size={18} color="#FFFFFF" />
            <Text style={styles.uploadBtnText}>Enviar foto</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 16 },
  stagePicker: { flexDirection: 'row', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#D1D5DB' },
  stageBtn: { flex: 1, padding: 12, alignItems: 'center', backgroundColor: '#F9FAFB' },
  stageBtnActive: { backgroundColor: '#6D28D9' },
  stageBtnText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  stageBtnTextActive: { color: '#FFFFFF' },
  pickerRow: { flexDirection: 'row', gap: 12 },
  pickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#6D28D9',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  pickerBtnText: { fontSize: 14, color: '#6D28D9', fontWeight: '500' },
  preview: { width: '100%', height: 240, borderRadius: 8, marginTop: 16, resizeMode: 'cover' },
  previewPlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewPlaceholderText: { fontSize: 13, color: '#9CA3AF', marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#0A0A0F',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  uploadBtn: {
    marginTop: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6D28D9',
    paddingVertical: 14,
    borderRadius: 8,
  },
  uploadBtnDisabled: { opacity: 0.5 },
  uploadBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
