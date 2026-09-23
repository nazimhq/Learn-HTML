'use client';

import Link from 'next/link';
import {useStore} from '@/lib/useStore';
import {available} from '@/lib/store';

export default function Warehouse() {
  const {state} = useStore();
  const rows = [...state.products].sort((a, b) => a.location.localeCompare(b.location));

  return <div className="page">
    <div className="top"><div><div className="title">Warehouse</div><div className="muted">Find stock by rack / bay / level</div></div></div>
    {rows.length === 0
      ? <div className="card muted">No stock recorded yet.</div>
      : <div style={{overflowX: 'auto'}}>
          <table className="table">
            <thead><tr><th>Location</th><th>Product</th><th>SKU</th><th>Physical</th><th>Reserved</th><th>Available</th></tr></thead>
            <tbody>{rows.map(p => <tr key={p.id}>
              <td><b>{p.location}</b></td>
              <td><Link href={`/product/?id=${p.id}`} className="link-btn">{p.title}</Link></td>
              <td>{p.sku}</td>
              <td>{p.physical}</td>
              <td>{p.reserved}</td>
              <td>{available(p)}</td>
            </tr>)}</tbody>
          </table>
        </div>}
  </div>;
}
