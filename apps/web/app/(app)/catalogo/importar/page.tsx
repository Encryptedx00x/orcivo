import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ImportCatalog } from './ImportCatalog';

export default function ImportarCatalogoPage(): JSX.Element {
  return (
    <div>
      <Link href="/catalogo" className="ov-btn ov-btn-secondary" style={{ marginBottom: 16 }}><ArrowLeft size={16} />Catálogo</Link>
      <div className="ov-page-header">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Importar catálogo</h1>
          <p style={{ color: '#64748B', fontSize: 14 }}>Selecione um CSV ou JSON, confira a prévia e confirme a importação.</p>
        </div>
      </div>
      <ImportCatalog />
    </div>
  );
}
