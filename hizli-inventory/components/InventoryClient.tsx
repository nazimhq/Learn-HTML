'use client';

import {useMemo, useState} from 'react';
import Link from 'next/link';
import {useStore} from '@/lib/useStore';
import {useSession} from '@/lib/useSession';
import {available, archiveProduct, money, locationOf} from '@/lib/store';
import {CONDITIONS} from '@/lib/types';
import {can} from '@/lib/auth';
import {lowStock} from '@/lib/sales';
import AddProductDialog from './AddProductDialog';
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
        <div className="title">Inventory</div>
        <div className="muted">{list.length} of {state.products.filter(p => !p.archived).length} products · photo-first search</div>
      </div>
      {can(session, 'product.create') && <button className="btn" type="button" onClick={() => setAdding(true)}>+ Add Product</button>}
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
              {can(session, 'product.archive') && <button className="link-danger" type="button" onClick={() => archive(p.id, p.sku)}>
                {showArchived ? 'Restore' : 'Archive'}
              </button>}
            </div>)}
          </div>
        : <div style={{overflowX: 'auto'}}>
            <table className="table">
              <thead>
                <tr>
                  <th>Photo</th><th>SKU</th><th>Product</th><th>Category</th><th>Condition</th><th>Location</th>
                  <th className="num">Phys</th><th className="num">Resv</th><th className="num">Avail</th>
                  {showCost && <><th className="num">Cost</th><th className="num">Price</th></>}
                  <th>eBay</th><th>Vinted</th><th>Updated</th>
                </tr>
              </thead>
              <tbody>{list.map(p => <tr key={p.id}>
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
              </tr>)}</tbody>
            </table>
          </div>}

    {adding && session && <AddProductDialog
      session={session}
      onClose={() => setAdding(false)}
      onSaved={sku => { setAdding(false); setToast(`${sku} added`); }}
    />}

    {toast && <Toast message={toast} onDone={() => setToast('')}/>}
  </div>;
}
