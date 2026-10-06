import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';
import * as Sharing from 'expo-sharing';
import { API_URL } from '../config';

/**
 * Downloads an authenticated PDF (quote or receipt) to the cache and opens the
 * system share sheet (WhatsApp, e-mail, salvar…). Throws on failure.
 */
export async function sharePdf(path: string, fileName: string, title: string): Promise<void> {
  const token = await SecureStore.getItemAsync('access_token');
  const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
  const result = await FileSystem.downloadAsync(`${API_URL}${path}`, fileUri, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (result.status !== 200) {
    throw Object.assign(new Error(`GET ${path} ${result.status}`), { status: result.status });
  }
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Compartilhamento indisponível neste aparelho.');
  }
  await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf', dialogTitle: title });
}

export const shareReceiptPdf = (id: string, number: string) =>
  sharePdf(
    `/payments/${encodeURIComponent(id)}/receipt`,
    `recibo-${number}.pdf`,
    `Recibo nº ${number}`,
  );

export const shareQuotePdf = (id: string, number: number) =>
  sharePdf(
    `/quotes/${encodeURIComponent(id)}/pdf`,
    `orcamento-${number}.pdf`,
    `Orçamento #${number}`,
  );
