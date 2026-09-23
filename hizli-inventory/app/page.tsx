import Link from 'next/link';
import {products,available} from '@/lib/demo';
import Counter from '@/components/Counter';

export default function Dashboard(){
  const units=products.reduce((s,p)=>s+p.physical,0);
  const reserved=products.reduce((s,p)=>s+p.reserved,0);
  const value=products.reduce((s,p)=>s+p.physical*p.cost,0);
  return <div className="page">
    <div className="top">
      <div><div className="title">Dashboard</div><div className="muted">Hizli stock overview</div></div>
      <Link className="btn" href="/inventory">+ Add / View Product</Link>
    </div>
    <div className="grid stagger">
      <div className="card"><div className="muted">Unique products</div><div className="metric"><Counter value={products.length}/></div></div>
      <div className="card"><div className="muted">Physical units</div><div className="metric"><Counter value={units}/></div></div>
      <div className="card"><div className="muted">Reserved</div><div className="metric"><Counter value={reserved}/></div></div>
      <div className="card"><div className="muted">Inventory cost</div><div className="metric"><Counter value={value} prefix="£" decimals={2}/></div></div>
    </div>
    <h2>Recently added</h2>
    <div className="inventory stagger">{products.map(p=>
      <Link className="card product-card" href={`/inventory/${p.id}`} key={p.id}>
        <img src={p.image} alt={p.title}/>
        <div className="product-body">
          <div className="row"><strong>{p.title}</strong><span className="badge good">{available(p)} available</span></div>
          <div className="muted" style={{marginTop:8}}>{p.sku} • {p.location}</div>
        </div>
      </Link>)}
    </div>
  </div>;
}
