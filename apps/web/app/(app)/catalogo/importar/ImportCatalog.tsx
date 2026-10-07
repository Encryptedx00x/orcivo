'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { FileUp, Upload } from 'lucide-react';
import { formatMoney } from '@orcivo/shared-types';
import {
  canImport,
  MAX_IMPORT_BYTES,
  previewImport,
  type ImportFormat,
  type ImportPreview,
} from '../import-preview';
import { importCatalogAction, type ImportResult } from './actions';

const CSV_TEMPLATE =
  'name,type,quantity,cost_price,sale_price,low_stock_threshold,unit,description,is_active\nSensor,PRODUCT,3,10.00,19.90,5,un,Sensor de presença,true\n';
const JSON_TEMPLATE = JSON.stringify(
  {
    items: [
      {
        name: 'Sensor',
        type: 'PRODUCT',
        quantity: 3,
        cost_price: '10.00',
        sale_price: '19.90',
        low_stock_threshold: 5,
        unit: 'un',
        description: 'Sensor de presença',
        is_active: true,
      },
    ],
  },
  null,
  2,
);

export function ImportCatalog(): React.JSX.Element {
  const [selection, setSelection] = useState<{
    content: string;
    format: ImportFormat;
    preview: ImportPreview;
  } | null>(null);
  const [reading, setReading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const version = useRef(0);
  const submitting = useRef(false);

  async function selectFile(file?: File) {
    const currentVersion = ++version.current;
    setSelection(null);
    setError('');
    setResult(null);
    setReading(false);
    if (!file) return;
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'csv' && extension !== 'json') {
      setError('Selecione um arquivo .csv ou .json.');
      return;
    }
    if (file.size > MAX_IMPORT_BYTES) {
      setError('O arquivo deve ter no máximo 128 KB.');
      return;
    }
    setReading(true);
    try {
      const content = await file.text();
      if (version.current !== currentVersion) return;
      setSelection({ content, format: extension, preview: previewImport(content, extension) });
    } catch {
      if (version.current === currentVersion)
        setError('Não foi possível ler o arquivo. Selecione-o novamente.');
    } finally {
      if (version.current === currentVersion) setReading(false);
    }
  }

  async function confirmImport() {
    if (!selection || !canImport(selection.preview) || submitting.current) return;
    submitting.current = true;
    setPending(true);
    setError('');
    try {
      const response = await importCatalogAction(selection.content, selection.format);
      if ('error' in response) setError(response.error);
      else setResult(response);
    } catch {
      setError('Não foi possível concluir a importação. Confira sua conexão e tente novamente.');
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  const preview = selection?.preview;
  const invalidCount = preview?.rows.filter((row) => row.errors.length).length ?? 0;
  const successful = result && !('error' in result) ? result : null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 16 }}>
      <section className="ov-card" style={{ padding: 24 }} aria-labelledby="file-heading">
        <h2 id="file-heading" style={{ fontSize: 18, margin: '0 0 12px' }}>
          1. Selecione o arquivo
        </h2>
        <p style={helpStyle}>
          Até 1000 itens e 128 KB por arquivo. CSV separado por vírgula ou ponto e vírgula, com
          cabeçalho. JSON em lista ou no formato {`{ "items": [...] }`}.
        </p>
        <p style={helpStyle}>
          Use PRODUCT para produtos e SERVICE para serviços. Preços usam ponto decimal (19.90); em
          JSON, escreva preços entre aspas. Quantidades devem ser inteiras e não negativas.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, margin: '16px 0' }}>
          <a
            className="ov-btn ov-btn-secondary"
            href={`data:text/csv;charset=utf-8,${encodeURIComponent(CSV_TEMPLATE)}`}
            download="modelo-catalogo.csv"
          >
            Baixar modelo CSV
          </a>
          <a
            className="ov-btn ov-btn-secondary"
            href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON_TEMPLATE)}`}
            download="modelo-catalogo.json"
          >
            Baixar modelo JSON
          </a>
        </div>
        <label
          htmlFor="catalog-file"
          style={{ display: 'block', fontWeight: 600, fontSize: 14, marginBottom: 8 }}
        >
          Arquivo CSV ou JSON
        </label>
        <label
          className="ov-btn ov-btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
        >
          <FileUp size={16} />
          {selection ? 'Trocar arquivo' : 'Escolher arquivo'}
          <input
            id="catalog-file"
            type="file"
            accept=".csv,.json,text/csv,application/json"
            disabled={pending}
            onChange={(event) => void selectFile(event.target.files?.[0])}
            style={{ display: 'none' }}
          />
        </label>
        {reading && <p role="status">Lendo e validando arquivo…</p>}
      </section>

      {error && (
        <p role="alert" style={errorStyle}>
          {error}
        </p>
      )}
      {successful && (
        <div role="status" className="ov-card" style={{ padding: 24 }}>
          <p style={{ color: '#166534', fontWeight: 600 }}>
            Importação concluída: {successful.total} itens — {successful.created} criados e{' '}
            {successful.updated} atualizados.
          </p>
          <Link href="/catalogo" className="ov-btn ov-btn-primary">
            Ver catálogo
          </Link>
        </div>
      )}

      {preview && !successful && (
        <section
          className="ov-card"
          style={{ padding: 24, minWidth: 0 }}
          aria-labelledby="preview-heading"
        >
          <h2 id="preview-heading" style={{ fontSize: 18, margin: '0 0 12px' }}>
            2. Confira a prévia
          </h2>
          <div role="status" aria-live="polite">
            <p>
              {preview.rows.length} itens · {preview.rows.length - invalidCount} válidos ·{' '}
              {invalidCount} com erros
            </p>
            {preview.errors.map((message) => (
              <p key={message} style={errorStyle}>
                {message}
              </p>
            ))}
          </div>
          <p style={helpStyle}>
            Itens com o mesmo nome e tipo serão atualizados. Os demais serão criados. Campos
            opcionais ausentes usam os valores exibidos: quantidade e custo zero, limite 5 e ativo;
            descrição e unidade ficam vazias.
          </p>
          <p style={helpStyle}>
            A importação substitui os valores dos itens existentes, inclusive os campos opcionais.
            Revise o arquivo antes de confirmar.
          </p>
          {preview.rows.length > 0 && (
            <div style={{ overflowX: 'auto', margin: '16px 0' }}>
              <table className="ov-table">
                <caption
                  style={{ textAlign: 'left', color: '#64748B', fontSize: 12, paddingBottom: 8 }}
                >
                  Prévia dos registros do arquivo. Nenhum item foi salvo ainda.
                </caption>
                <thead>
                  <tr>
                    <th>Registro</th>
                    <th>Nome</th>
                    <th>Tipo</th>
                    <th>Quantidade</th>
                    <th>Custo</th>
                    <th>Venda</th>
                    <th>Limite</th>
                    <th>Unidade</th>
                    <th>Descrição</th>
                    <th>Ativo</th>
                    <th>Validação</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row) => (
                    <tr key={row.line}>
                      <td>{row.line}</td>
                      <td>{row.name}</td>
                      <td>
                        {row.item ? (row.item.type === 'PRODUCT' ? 'Produto' : 'Serviço') : '—'}
                      </td>
                      <td>{row.item?.quantity ?? '—'}</td>
                      <td>{row.item ? formatMoney(row.item.cost_price) : '—'}</td>
                      <td>
                        {row.item ? formatMoney(row.item.sale_price ?? row.item.unit_price!) : '—'}
                      </td>
                      <td>{row.item?.low_stock_threshold ?? '—'}</td>
                      <td>{row.item?.unit || '—'}</td>
                      <td>{row.item?.description || '—'}</td>
                      <td>{row.item ? (row.item.is_active ? 'Sim' : 'Não') : '—'}</td>
                      <td
                        style={{ color: row.errors.length ? '#B91C1C' : '#166534', minWidth: 180 }}
                      >
                        {row.errors.length
                          ? row.errors.map((message) => <div key={message}>{message}</div>)
                          : 'Válido'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {(invalidCount > 0 || preview.errors.length > 0) && (
            <p style={errorStyle}>
              Corrija o arquivo e selecione-o novamente. Nenhum item será importado enquanto houver
              erros.
            </p>
          )}
          <button
            type="button"
            className="ov-btn ov-btn-primary"
            disabled={pending || !canImport(preview)}
            onClick={() => void confirmImport()}
          >
            <Upload size={16} />
            {pending ? 'Importando…' : `Confirmar importação de ${preview.rows.length} itens`}
          </button>
        </section>
      )}
    </div>
  );
}

const helpStyle: React.CSSProperties = { color: '#64748B', fontSize: 14, lineHeight: 1.6 };
const errorStyle: React.CSSProperties = { color: '#B91C1C', fontSize: 14 };
