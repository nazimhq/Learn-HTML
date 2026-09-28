'use client';

import {useMemo, useState} from 'react';
import Link from 'next/link';
import {useStore} from '@/lib/useStore';
import {useSession} from '@/lib/useSession';
import {available, archiveProduct, money, locationOf, bulkMove, bulkThreshold, bulkArchive} from '@/lib/store';
import {CONDITIONS} from '@/lib/types';
import {can} from '@/lib/auth';
import {lowStock} from '@/lib/sales';
import Link2 from 'next/link';
import AddProductDialog from './AddProductDialog';
import EditProductDialog from './EditProductDialog';
import Modal from './Modal';
import Tabs from './Tabs';
import Toast from './Toast';

type View = 'card' | 'table';

export default function InventoryClient() {
  const {state} = useStore();
  const {session} = useSession();
  const [q, setQ] = useState('');
  const [view, setView] = useState<View>('card');
  const [condition, setCondition] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulk, setBulk] = useState<'move' | 'threshold' | null>(null);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  const showCost = can(session, 'cost.view');
  const low = useMemo(() => new Set(lowStock(state).map(p => p.id)), [state]);

  const list = useMemo(() => state.products.filter(p => {
    if (p.archived !== showArchived) return false;
    if (condition && p.condition !== condition) return false;
    if (stockFilter === 'low' && !low.has(p.id)) return false;
    if (stockFilter === 'out' && p.physical > 0) return false;
    if (stockFilter === 'listed' && p.ebayStatus !== 'Listed' && p.vintedStatus !== 'Listed') return false;
    const haystack = [
      p.title, p.internalTitle, p.sku, p.barcode, p.category, p.subcategory,
      p.brand, p.model, p.colour, locationOf(p), p.condition,
      p.ebayListingId, p.vintedRef, p.notes
    ].join(' ').toLowerCase();
    return haystack.includes(q.toLowerCase());
  }), [state.products, q, condition, stockFilter, showArchived, low]);

  function archive(id: string, sku: string) {
    if (!session) return;
    try {
      archiveProduct(id, session.username, !showArchived);
      setToast(showArchived ? `${sku} restored` : `${sku} archived`);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return <div className="page">
    <div className="top">
      <div>
        <div className="eyebrow">Photo-first catalogue</div>
        <div className="title">Inventory</div>
        <div className="muted">{list.length} of {state.products.filter(p => !p.archived).length} products · photo-first search</div>
      </div>
      <div className="row" style={{gap: 10, flexWrap: 'wrap'}}>
        {can(session, 'product.create') && <Link2 className="btn secondary" href="/import">Import CSV</Link2>}
        {can(session, 'product.create') && <button className="btn" type="button" onClick={() => setAdding(true)}>+ Add Product</button>}
      </div>
    </div>

    <Tabs<View> active={view} onChange={setView} tabs={[{key: 'card', label: 'Card view'}, {key: 'table', label: 'Table view'}]}/>

    <div className="toolbar">
      <input className="input" style={{flex: '2 1 260px'}} placeholder="Search title, SKU, barcode, brand, model, location, listing ID…" aria-label="Search inventory" value={q} onChange={e => setQ(e.target.value)}/>
      <select className="input" style={{flex: '1 1 150px'}} aria-label="Condition" value={condition} onChange={e => setCondition(e.target.value)}>
        <option value="">All conditions</option>
        {CONDITIONS.map(c => <option key={c}>{c}</option>)}
      </select>
      <select className="input" style={{flex: '1 1 150px'}} aria-label="Stock status" value={stockFilter} onChange={e => setStockFilter(e.target.value)}>
        <option value="">All stock</option>
        <option value="low">Low stock</option>
        <option value="out">Out of stock</option>
        <option value="listed">Listed on a marketplace</option>
      </select>
      <label className="check" style={{flex: '0 0 auto'}}>
        <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)}/> Archived
      </label>
    </div>

    {error && <div className="notice reveal" role="alert" style={{marginBottom: 16}}>{error}</div>}

    {list.length === 0
      ? <div className="card reveal muted">
          {state.products.length === 0 ? 'No products yet — add your first one.' : 'Nothing matches those filters.'}
        </div>
      : view === 'card'
        ? <div className="inventory stagger">{list.map(p =>
            <div className="card product-card" key={p.id}>
              <Link href={`/product/?id=${p.id}`} className="card-link">
                <img src={p.image} alt={p.title}/>
                <div className="product-body">
                  <div className="row"><strong>{p.title}</strong>
                    <span className={available(p) <= p.lowStockThreshold ? 'badge warn' : 'badge good'}>{available(p)} available</span></div>
                  <div className="muted" style={{marginTop: 8}}>{p.sku}</div>
                  <div className="row" style={{marginTop: 12}}>
                    <span>📍 {locationOf(p) || '—'}</span>
                    <span className="badge">{p.condition}</span>
                  </div>
                  <div className="row" style={{marginTop: 10}}>
                    <span className="badge">eBay {p.ebayStatus === 'Listed' ? '✓' : '—'}</span>
                    <span className="badge">Vinted {p.vintedStatus === 'Listed' ? '✓' : '—'}</span>
                    {p.reserved > 0 && <span className="badge">{p.reserved} reserved</span>}
                  </div>
                </div>
              </Link>
              <div className="row" style={{padding: '0 14px 13px', justifyContent: 'flex-start', gap: 14}}>
                {can(session, 'product.edit') && <button className="link-btn" type="button" onClick={() => setEditing(p.id)}>Edit</button>}
                {can(session, 'product.archive') && <button className="link-danger" type="button" onClick={() => archive(p.id, p.sku)}>
                  {showArchived ? 'Restore' : 'Archive'}
                </button>}
              </div>
            </div>)}
          </div>
        : <div style={{overflowX: 'auto'}}>
            <table className="table">
              <thead>
                <tr>
                  <th><input type="checkbox" aria-label="Select all"
                    checked={list.length > 0 && selected.length === list.length}
                    onChange={e => setSelected(e.target.checked ? list.map(p => p.id) : [])}/></th>
                  <th>Photo</th><th>SKU</th><th>Product</th><th>Category</th><th>Condition</th><th>Location</th>
                  <th className="num">Phys</th><th className="num">Resv</th><th className="num">Avail</th>
                  {showCost && <><th className="num">Cost</th><th className="num">Price</th></>}
                  <th>eBay</th><th>Vinted</th><th>Updated</th><th/>
                </tr>
              </thead>
              <tbody>{list.map(p => <tr key={p.id}>
                <td><input type="checkbox" aria-label={`Select ${p.sku}`} checked={selected.includes(p.id)}
                  onChange={e => setSelected(s2 => e.target.checked ? [...s2, p.id] : s2.filter(id => id !== p.id))}/></td>
                <td><img className="thumb" src={p.image} alt=""/></td>
                <td><Link className="link-btn" href={`/product/?id=${p.id}`}>{p.sku}</Link></td>
                <td>{p.title}</td>
                <td>{p.category}</td>
                <td><span className="badge">{p.condition}</span></td>
                <td><b>{locationOf(p) || '—'}</b></td>
                <td className="num">{p.physical}</td>
                <td className="num">{p.reserved}</td>
                <td className="num">{available(p)}</td>
                {showCost && <><td className="num">{money(p.cost, state)}</td><td className="num">{money(p.targetPrice, state)}</td></>}
                <td>{p.ebayStatus === 'Listed' ? '✓' : '—'}</td>
                <td>{p.vintedStatus === 'Listed' ? '✓' : '—'}</td>
                <td className="muted">{new Date(p.updatedAt).toLocaleDateString('en-GB')}</td>
                <td className="row-actions">
                  {can(session, 'product.edit') && <button className="link-btn" type="button" onClick={() => setEditing(p.id)}>Edit</button>}
                </td>
              </tr>)}</tbody>
            </table>
          </div>}

    {selected.length > 0 && can(session, 'product.edit') && <div className="bulkbar reveal">
      <b>{selected.length} selected</b>
      <button className="btn secondary" type="button" onClick={() => setBulk('move')}>Move</button>
      <button className="btn secondary" type="button" onClick={() => setBulk('threshold')}>Low-stock level</button>
      {can(session, 'product.archive') && <button className="btn secondary" type="button" onClick={() => {
        try { bulkArchive(selected, !showArchived, session!.username); setToast(`${selected.length} product(s) ${showArchived ? 'restored' : 'archived'}`); setSelected([]); setError(''); }
        catch (e) { setError((e as Error).message); }
      }}>{showArchived ? 'Restore' : 'Archive'}</button>}
      <button className="link-btn" type="button" style={{marginLeft: 'auto'}} onClick={() => setSelected([])}>Clear</button>
    </div>}

    {bulk && session && <Modal title={bulk === 'move' ? `Move ${selected.length} product(s)` : `Low-stock level for ${selected.length} product(s)`} onClose={() => setBulk(null)}>
      <form className="stack" onSubmit={e => {
        e.preventDefault();
        const f = new FormData(e.currentTarget as HTMLFormElement);
        try {
          if (bulk === 'move') {
            bulkMove(selected, {
              rack: String(f.get('rack') ?? ''), bay: String(f.get('bay') ?? ''),
              level: String(f.get('level') ?? ''), bin: String(f.get('bin') ?? '')
            }, session.username);
            setToast(`${selected.length} product(s) moved`);
          } else {
            bulkThreshold(selected, Number(f.get('threshold')), session.username);
            setToast(`${selected.length} product(s) updated`);
          }
          setBulk(null); setSelected([]); setError('');
        } catch (err) { setError((err as Error).message); }
      }}>
        {bulk === 'move'
          ? <><div className="form-grid">
              <label className="field" htmlFor="bk-rack">Rack<input id="bk-rack" name="rack" className="input" required/></label>
              <label className="field" htmlFor="bk-bay">Bay<input id="bk-bay" name="bay" className="input" required/></label>
            </div>
            <div className="form-grid">
              <label className="field" htmlFor="bk-level">Level<input id="bk-level" name="level" className="input" required/></label>
              <label className="field" htmlFor="bk-bin">Bin <span className="muted">(optional)</span><input id="bk-bin" name="bin" className="input"/></label>
            </div></>
          : <label className="field" htmlFor="bk-threshold">Low-stock level
              <input id="bk-threshold" name="threshold" className="input" type="number" min="0" step="1" defaultValue={2}/>
            </label>}
        <div className="muted" style={{fontSize: 12}}>Each product gets its own movement and audit entry.</div>
        <div className="row" style={{justifyContent: 'flex-end', gap: 10}}>
          <button className="btn secondary" type="button" onClick={() => setBulk(null)}>Cancel</button>
          <button className="btn" type="submit">Apply</button>
        </div>
      </form>
    </Modal>}

    {editing && session && <EditProductDialog
      product={state.products.find(p => p.id === editing)!}
      session={session}
      onClose={() => setEditing(null)}
      onSaved={m => { setEditing(null); setToast(m); }}
    />}

    {adding && session && <AddProductDialog
      session={session}
      onClose={() => setAdding(false)}
      onSaved={sku => { setAdding(false); setToast(`${sku} added`); }}
    />}

    {toast && <Toast message={toast} onDone={() => setToast('')}/>}
  </div>;
}
