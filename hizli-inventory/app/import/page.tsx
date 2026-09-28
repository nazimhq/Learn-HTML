'use client';

import {useState} from 'react';
import Link from 'next/link';
import {useSession} from '@/lib/useSession';
import {can} from '@/lib/auth';
import {previewImport, commitImport, IMPORT_COLUMNS, type ImportPreview} from '@/lib/store';
import {downloadCsv} from '@/lib/csv';
import Toast from '@/components/Toast';

export default function ImportPage() {
  const {session} = useSession();
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [skip, setSkip] = useState<number[]>([]);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [over, setOver] = useState(false);

  if (!can(session, 'purchase.view') || !can(session, 'product.create')) {
    return <div className="page">
      <div className="top"><div><div className="title">Import</div></div></div>
      <div className="notice">Bulk import is a manager job — your role cannot import products.</div>
    </div>;
  }

  function read(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const p = previewImport(String(reader.result));
        setPreview(p);
        setSkip(p.rows.filter(r => r.duplicate).map(r => r.line));
        setError('');
      } catch (e) {
        setPreview(null);
        setError((e as Error).message);
      }
    };
    reader.onerror = () => setError('Could not read that file');
    reader.readAsText(file);
  }

  function commit() {
    if (!preview || !session) return;
    try {
      const added = commitImport(preview, skip, session.username);
      setPreview(null);
      setToast(`${added} product${added === 1 ? '' : 's'} imported`);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const willImport = preview ? preview.rows.filter(r => r.errors.length === 0 && !skip.includes(r.line)).length : 0;

  return <div className="page">
    <div className="top">
      <div>
        <div className="eyebrow">Bulk data</div>
        <div className="title">Import products</div>
        <div className="muted">Check every row before anything is written — nothing is overwritten silently</div>
      </div>
      <button className="btn secondary" type="button" onClick={() => downloadCsv('hizli-import-template.csv', [
        Object.fromEntries(IMPORT_COLUMNS.map(c => [c, ''])) as Record<string, string>
      ])}>Download template</button>
    </div>

    {!preview && <div
      className={'dropzone' + (over ? ' over' : '')}
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); read(e.dataTransfer.files?.[0]); }}
    >
      <p style={{marginTop: 0}}><b>Drop a CSV here</b>, or choose a file.</p>
      <input className="input" type="file" accept=".csv,text/csv" style={{maxWidth: 320, margin: '0 auto'}}
        aria-label="CSV file" onChange={e => read(e.target.files?.[0])}/>
      <p className="muted" style={{fontSize: 12, marginBottom: 0}}>
        Required columns: title, category, condition, rack, bay, level, physical.
        Optional: subcategory, cost, targetPrice, brand, model, colour, ebayListingId.
      </p>
    </div>}

    {error && <div className="notice reveal" role="alert" style={{marginTop: 16}}>{error}</div>}

    {preview && <>
      <div className="tiles stagger" style={{marginTop: 16, marginBottom: 18}}>
        <div className="tile"><div className="tile-icon tone-green">✓</div><div>
          <div className="tile-label">Ready to import</div><div className="metric">{willImport}</div></div></div>
        <div className="tile"><div className="tile-icon tone-amber">≡</div><div>
          <div className="tile-label">Skipped</div><div className="metric">{skip.length}</div>
          <div className="tile-sub">possible duplicates, unticked</div></div></div>
        <div className="tile"><div className="tile-icon tone-red">✕</div><div>
          <div className="tile-label">Rows with errors</div><div className="metric">{preview.invalid}</div>
          <div className="tile-sub">these are never imported</div></div></div>
      </div>

      <div className="table-wrap"><table className="table">
        <thead><tr><th>Import</th><th>Line</th><th>Title</th><th>Category</th><th>Condition</th><th>Location</th><th className="num">Qty</th><th>Check</th></tr></thead>
        <tbody>{preview.rows.map(r => <tr key={r.line}>
          <td>{r.errors.length === 0
            ? <input type="checkbox" checked={!skip.includes(r.line)} aria-label={`Import line ${r.line}`}
                onChange={e => setSkip(s => e.target.checked ? s.filter(l => l !== r.line) : [...s, r.line])}/>
            : <span className="muted">—</span>}</td>
          <td className="muted">{r.line}</td>
          <td>{r.row.title || <span className="muted">(blank)</span>}</td>
          <td>{r.row.category}</td>
          <td>{r.row.condition}</td>
          <td>{[r.row.rack, r.row.bay, r.row.level].filter(Boolean).join('-') || '—'}</td>
          <td className="num">{Number.isFinite(r.row.physical) ? r.row.physical : '—'}</td>
          <td>
            {r.errors.length > 0
              ? <span className="badge low">{r.errors.join(', ')}</span>
              : r.duplicate
                ? <span className="badge warn">looks like {r.duplicate.product.sku} ({r.duplicate.why})</span>
                : <span className="badge good">ok</span>}
          </td>
        </tr>)}</tbody>
      </table></div>

      <div className="bulkbar">
        <b>{willImport} row{willImport === 1 ? '' : 's'} will be imported.</b>
        <span className="muted">Duplicates are unticked by default — tick one to import it anyway.</span>
        <div style={{marginLeft: 'auto', display: 'flex', gap: 10}}>
          <button className="btn secondary" type="button" onClick={() => { setPreview(null); setSkip([]); }}>Start over</button>
          <button className="btn" type="button" onClick={commit} disabled={willImport === 0}>Import {willImport}</button>
        </div>
      </div>
    </>}

    <div className="muted" style={{fontSize: 12, marginTop: 20}}>
      Imported products start with no photo and a generated SKU. Add photos from{' '}
      <Link className="link-btn" href="/inventory">Inventory</Link> afterwards.
    </div>

    {toast && <Toast message={toast} onDone={() => setToast('')}/>}
  </div>;
}
