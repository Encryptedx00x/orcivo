'use server';

import { cookies } from 'next/headers';

const API_URL = process.env['API_URL'] ?? 'http://localhost:3000';

function authHeader(): Record<string, string> {
  const token = cookies().get('access_token')?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** PB1-P10/AC1-AC3: assinatura reutilizável do técnico, privada e tenant-scoped (P03 storage). */
export async function getTechnicianSignature(): Promise<{ signature_url: string | null }> {
  const auth = authHeader();
  if (!auth['Authorization']) return { signature_url: null };

  const res = await fetch(`${API_URL}/users/me/signature`, {
    headers: auth,
    cache: 'no-store',
  });
  if (!res.ok) return { signature_url: null };
  return (await res.json()) as { signature_url: string | null };
}

export async function saveTechnicianSignature(
  formData: FormData,
): Promise<{ ok: true; signature_url: string | null } | { ok: false; message: string }> {
  const auth = authHeader();
  if (!auth['Authorization']) return { ok: false, message: 'Sua sessão expirou. Entre novamente.' };

  const res = await fetch(`${API_URL}/users/me/signature`, {
    method: 'PUT',
    headers: auth,
    body: formData,
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { message?: string } | null;
    return { ok: false, message: err?.message ?? 'Erro ao salvar assinatura.' };
  }
  const data = (await res.json()) as { signature_url: string | null };
  return { ok: true, signature_url: data.signature_url };
}

/** PB1-P10/AC2: envio do orçamento com opção de aplicar a assinatura salva do técnico. */
export async function sendQuoteWithSignature(
  quoteId: string,
  applySignature: boolean,
  /** Signature image (data URL) used only on this quote — not saved for reuse. */
  oneOffSignature?: string,
): Promise<{ ok: true; quote: unknown } | { ok: false; message: string }> {
  const auth = authHeader();
  if (!auth['Authorization']) return { ok: false, message: 'Sua sessão expirou. Entre novamente.' };

  let res: Response;
  const oneOff = oneOffSignature
    ? /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(oneOffSignature)
    : null;
  if (oneOffSignature && !oneOff) return { ok: false, message: 'Assinatura inválida.' };
  if (oneOff) {
    const form = new FormData();
    const ext = oneOff[1] === 'image/jpeg' ? 'jpg' : oneOff[1] === 'image/webp' ? 'webp' : 'png';
    form.append(
      'file',
      new Blob([Buffer.from(oneOff[2], 'base64')], { type: oneOff[1] }),
      `assinatura.${ext}`,
    );
    res = await fetch(`${API_URL}/quotes/${quoteId}/send/signature-once`, {
      method: 'POST',
      headers: auth,
      body: form,
    });
  } else {
    res = await fetch(`${API_URL}/quotes/${quoteId}/send`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ apply_signature: applySignature }),
    });
  }
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { message?: string } | null;
    return { ok: false, message: err?.message ?? 'Erro ao enviar orçamento.' };
  }
  const quote = await res.json();
  return { ok: true, quote };
}
