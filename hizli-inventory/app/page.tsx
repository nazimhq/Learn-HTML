'use client';

import Link from 'next/link';
import {useStore} from '@/lib/useStore';
import {available, money} from '@/lib/store';
import Counter from '@/components/Counter';

export default function Dashboard() {
  const {state, ready} = useStore();
  const {products, orders, settings} = state;

  const units = products.reduce((s, p) => s + p.physical, 0);
  const reserved = products.reduce((s, p) => s + p.reserved, 0);
  const value = products.reduce((s, p) => s + p.physical * p.cost, 0);
  const open = orders.filter(o => o.status === 'Picking' || o.status === 'Paid').length;
  const low = products.filter(p => available(p) <= 2);
  const recent = [...products].slice(0, 6);
  const symbol = money(0, state).replace(/[\d.]/g, '');

  return <div className="page">
    <div className="top">
      <div><div className="title">Dashboard</div><div className="muted">{settings.company} stock overview</div></div>
      <Link className="btn" href="/inventory">+ Add / View Product</Link>
    </div>

    <div className="grid stagger">
      <div className="card"><div className="muted">Unique products</div><div className="metric"><Counter value={products.length} key={`a${ready}`}/></div></div>
      <div className="card"><div className="muted">Physical units</div><div className="metric"><Counter value={units} key={`b${ready}`}/></div></div>
      <div className="card"><div className="muted">Reserved</div><div className="metric"><Counter value={reserved} key={`c${ready}`}/></div></div>
      <div className="card"><div className="muted">Inventory cost</div><div className="metric"><Counter value={value} prefix={symbol} decimals={2} key={`d${ready}`}/></div></div>
    </div>

    {low.length > 0 && <div className="notice reveal" style={{marginTop: 18}}>
      <b>{low.length} product{low.length > 1 ? 's' : ''} low on stock:</b>{' '}
      {low.map(p => p.sku).join(', ')}
    </div>}

    <div className="row" style={{marginTop: 24, marginBottom: 4}}>
      <h2 style={{margin: 0}}>Recently added</h2>
      <span className="muted">{open} open order{open === 1 ? '' : 's'}</span>
    </div>

    {recent.length === 0
      ? <div className="card muted">No products yet. Add one from the Inventory page.</div>
      : <div className="inventory stagger">{recent.map(p =>
          <Link className="card product-card" href={`/product/?id=${p.id}`} key={p.id}>
            <img src={p.image} alt={p.title}/>
            <div className="product-body">
              <div className="row"><strong>{p.title}</strong><span className={available(p) <= 2 ? 'badge warn' : 'badge good'}>{available(p)} available</span></div>
              <div className="muted" style={{marginTop: 8}}>{p.sku} • {p.location}</div>
            </div>
          </Link>)}
        </div>}
  </div>;
}
