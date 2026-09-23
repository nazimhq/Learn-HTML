import {products,available} from '@/lib/demo';

export default function Warehouse(){
  return <div className="page">
    <div className="top"><div><div className="title">Warehouse</div><div className="muted">Find stock by rack / bay / level</div></div></div>
    <div style={{overflowX:'auto'}}>
      <table className="table">
        <thead><tr><th>Location</th><th>Product</th><th>SKU</th><th>Available</th></tr></thead>
        <tbody>{products.map(p=><tr key={p.id}><td><b>{p.location}</b></td><td>{p.title}</td><td>{p.sku}</td><td>{available(p)}</td></tr>)}</tbody>
      </table>
    </div>
  </div>;
}
