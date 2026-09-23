'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {products,available} from '@/lib/demo';

export default function InventoryClient(){
  const [q,setQ]=useState('');
  const [filtering,setFiltering]=useState(false);
  const [showAddNote,setShowAddNote]=useState(false);

  const list=useMemo(()=>products.filter(p=>
    [p.title,p.sku,p.category,p.location,p.condition].join(' ').toLowerCase().includes(q.toLowerCase())
  ),[q]);

  // brief dim while the list re-flows, so a filtered result reads as a change
  useEffect(()=>{
    if(!q)return;
    setFiltering(true);
    const t=setTimeout(()=>setFiltering(false),120);
    return ()=>clearTimeout(t);
  },[q]);

  return <div className="page">
    <div className="top">
      <div><div className="title">Inventory</div><div className="muted">Photo-first product search</div></div>
      <button className="btn" type="button" onClick={()=>setShowAddNote(v=>!v)}>+ Add Product</button>
    </div>

    {showAddNote && <div className="notice reveal" style={{marginBottom:16}}>
      The Add Product form is Phase 1 work: it needs the image upload UI and the Supabase insert before it can create a product.
    </div>}

    <div className="toolbar">
      <input className="input" placeholder="Search title, SKU, category, location..." aria-label="Search inventory" value={q} onChange={e=>setQ(e.target.value)}/>
    </div>

    {list.length===0
      ? <div className="card reveal muted">No products match “{q}”.</div>
      : <div className={`inventory stagger${filtering?' filtering':''}`}>{list.map(p=>
          <Link className="card product-card" href={`/inventory/${p.id}`} key={p.id}>
            <img src={p.image} alt={p.title}/>
            <div className="product-body">
              <div className="row"><strong>{p.title}</strong><span className={available(p)<=2?'badge warn':'badge good'}>{available(p)} available</span></div>
              <div className="muted" style={{marginTop:8}}>{p.sku}</div>
              <div className="row" style={{marginTop:12}}><span>📍 {p.location}</span><span>{p.condition}</span></div>
              <div className="row" style={{marginTop:10}}><span className="badge">eBay {p.ebay?'✓':'—'}</span><span className="badge">Vinted {p.vinted?'✓':'—'}</span></div>
            </div>
          </Link>)}
        </div>}
  </div>;
}
