'use client';

import {useState} from 'react';
import Link from 'next/link';
import {useStore} from '@/lib/useStore';
import {useSession} from '@/lib/useSession';
import {can} from '@/lib/auth';
import {available, money, locationOf} from '@/lib/store';
import {inStock, outOfStock, lowStock} from '@/lib/sales';
import Tabs from '@/components/Tabs';
import StockInDialog from '@/components/StockInDialog';
import StockOutDialog from '@/components/StockOutDialog';
import Toast from '@/components/Toast';
import type {Product} from '@/lib/types';

type Tab = 'in' | 'out';

export default function StockPage() {
  const {state} = useStore();
  const {session} = useSession();
  const [tab, setTab] = useState<Tab>('in');
  const [q, setQ] = useState('');
  const [receiving, setReceiving] = useState(false);
  const [removing, setRemoving] = useState<Product | null>(null);
  const [toast, setToast] = useState('');

  const showCost = can(session, 'cost.view');
  const low = new Set(lowStock(state).map(p => p.id));

  const rows = (tab === 'in' ? inStock(state) : outOfStock(state))
    .filter(p => [p.title, p.sku, p.category, locationOf(p), p.condition].join(' ').toLowerCase().includes(q.toLowerCase()));

  return <div className="page">
    <div className="top">
      <div>
        <div className="title">Stock</div>
        <div className="muted">Stock In is what you have. Stock Out is what has run out.</div>
      </div>
      {can(session, 'stock.receive') && <button className="btn" type="button" onClick={() => setReceiving(true)}>+ Receive stock</button>}
    </div>

    <Tabs<Tab>
      active={tab}
      onChange={setTab}
      tabs={[
        {key: 'in', label: 'Stock In — available', count: inStock(state).length},
        {key: 'out', label: 'Stock Out — none left', count: outOfStock(state).length}
      ]}
    />

    <div className="toolbar">
      <input className="input" placeholder="Search title, SKU, category, location…" aria-label="Search stock" value={q} onChange={e => setQ(e.target.value)}/>
    </div>

    {rows.length === 0
      ? <div className="card muted reveal">
          {tab === 'in' ? 'Nothing in stock matches that.' : 'Nothing is out of stock — every product has units on the shelf.'}
        </div>
      : <div style={{overflowX: 'auto'}}>
          <table className="table">
            <thead>
              <tr>
                <th>Photo</th><th>SKU</th><th>Product</th><th>Location</th><th>Condition</th>
                <th className="num">Physical</th><th className="num">Reserved</th><th className="num">Available</th>
                {showCost && <th className="num">Stock value</th>}
                <th/>
              </tr>
            </thead>
            <tbody>{rows.map(p => <tr key={p.id}>
              <td><img className="thumb" src={p.image} alt=""/></td>
              <td><Link className="link-btn" href={`/product/?id=${p.id}`}>{p.sku}</Link></td>
              <td>{p.title}</td>
              <td><b>{locationOf(p) || '—'}</b></td>
              <td><span className="badge">{p.condition}</span></td>
              <td className="num">{p.physical}</td>
              <td className="num">{p.reserved}</td>
              <td className="num">
                {available(p)}
                {low.has(p.id) && <span className="badge warn" style={{marginLeft: 6}}>Low</span>}
              </td>
              {showCost && <td className="num">{money(p.physical * p.cost, state)}</td>}
              <td className="row-actions">
                {can(session, 'stock.remove') && p.physical > 0 &&
                  <button className="link-danger" type="button" onClick={() => setRemoving(p)}>Remove</button>}
              </td>
            </tr>)}</tbody>
          </table>
        </div>}

    {receiving && session && <StockInDialog
      session={session}
      onClose={() => setReceiving(false)}
      onSaved={msg => { setReceiving(false); setToast(msg); }}
    />}

    {removing && session && <StockOutDialog
      product={removing}
      session={session}
      onClose={() => setRemoving(null)}
      onSaved={msg => { setRemoving(null); setToast(msg); }}
    />}

    {toast && <Toast message={toast} onDone={() => setToast('')}/>}
  </div>;
}
