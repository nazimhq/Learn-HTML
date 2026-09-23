'use client';

import {useMemo, useState} from 'react';
import Link from 'next/link';
import {useStore} from '@/lib/useStore';
import {useSession} from '@/lib/useSession';
import {available, deleteProduct} from '@/lib/store';
import {can} from '@/lib/auth';
import AddProductDialog from './AddProductDialog';
import Toast from './Toast';

export default function InventoryClient() {
  const {state} = useStore();
  const {session} = useSession();
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  const list = useMemo(() => state.products.filter(p =>
    [p.title, p.sku, p.category, p.location, p.condition].join(' ').toLowerCase().includes(q.toLowerCase())
  ), [q, state.products]);

  function remove(id: string, sku: string) {
    if (!session) return;
    try {
      deleteProduct(id, session.username);
      setToast(`${sku} removed`);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return <div className="page">
    <div className="top">
      <div><div className="title">Inventory</div><div className="muted">{state.products.length} product{state.products.length === 1 ? '' : 's'} · photo-first search</div></div>
      {can.addProduct(session) && <button className="btn" type="button" onClick={() => setAdding(true)}>+ Add Product</button>}
    </div>

    <div className="toolbar">
      <input className="input" placeholder="Search title, SKU, category, location..." aria-label="Search inventory" value={q} onChange={e => setQ(e.target.value)}/>
    </div>

    {error && <div className="notice reveal" role="alert" style={{marginBottom: 16}}>{error}</div>}

    {list.length === 0
      ? <div className="card reveal muted">
          {state.products.length === 0 ? 'No products yet — add your first one.' : `No products match “${q}”.`}
        </div>
      : <div className="inventory stagger">{list.map(p =>
          <div className="card product-card" key={p.id}>
            <Link href={`/product/?id=${p.id}`} className="card-link">
              <img src={p.image} alt={p.title}/>
              <div className="product-body">
                <div className="row"><strong>{p.title}</strong><span className={available(p) <= 2 ? 'badge warn' : 'badge good'}>{available(p)} available</span></div>
                <div className="muted" style={{marginTop: 8}}>{p.sku}</div>
                <div className="row" style={{marginTop: 12}}><span>📍 {p.location}</span><span>{p.condition}</span></div>
                <div className="row" style={{marginTop: 10}}><span className="badge">eBay {p.ebay ? '✓' : '—'}</span><span className="badge">Vinted {p.vinted ? '✓' : '—'}</span></div>
              </div>
            </Link>
            {can.deleteProduct(session) && <button className="link-danger" type="button" onClick={() => remove(p.id, p.sku)}>Remove</button>}
          </div>)}
        </div>}

    {adding && session && <AddProductDialog
      session={session}
      onClose={() => setAdding(false)}
      onSaved={sku => { setAdding(false); setToast(`${sku} added`); }}
    />}

    {toast && <Toast message={toast} onDone={() => setToast('')}/>}
  </div>;
}
