'use client';

import { useState } from 'react';
import { ImagePlus } from 'lucide-react';

interface CatalogPhotoFieldProps {
  photoUrl?: string | null;
  itemName?: string;
}

/** Optional image input shared by the create and edit catalog item forms. */
export function CatalogPhotoField({
  photoUrl,
  itemName,
}: CatalogPhotoFieldProps): React.JSX.Element {
  const [fileName, setFileName] = useState('');
  return (
    <fieldset style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
      <legend style={{ fontSize: 14, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
        Foto (opcional)
      </legend>
      {photoUrl ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <img
            src={photoUrl}
            alt={itemName ? `Foto de ${itemName}` : 'Foto atual do item'}
            width={80}
            height={80}
            style={{
              width: 80,
              height: 80,
              objectFit: 'cover',
              borderRadius: 12,
              border: '1px solid #E2E8F0',
            }}
          />
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: '#475569',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              name="remove_photo"
              value="true"
              style={{ accentColor: '#6D28D9' }}
            />
            Remover foto atual
          </label>
        </div>
      ) : null}
      {/* Native file input is hidden: its button text follows the browser language. */}
      <label
        className="ov-btn ov-btn-secondary"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
      >
        <ImagePlus size={16} />
        {fileName || (photoUrl ? 'Trocar foto' : 'Escolher foto')}
        <input
          id="photo"
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}
          style={{ display: 'none' }}
        />
      </label>
      <p style={{ fontSize: 12, color: '#64748B', margin: '8px 0 0' }}>
        JPEG, PNG ou WebP, com no máximo 10 MB. Enviar outra foto substitui a atual.
      </p>
    </fieldset>
  );
}
