import {products,available} from '@/lib/demo';
import {notFound} from 'next/navigation';
import {QRCodeSVG} from 'qrcode.react';
import Counter from '@/components/Counter';
import PrintLabelButton from '@/components/PrintLabelButton';

// required so every product page is emitted by the static export
export function generateStaticParams(){
  return products.map(p=>({id:p.id}));
}

export default function ProductPage({params}:{params:{id:string}}){
  const p=products.find(x=>x.id===params.id);
  if(!p)return notFound();
  return <div className="page">
    <div className="top">
      <div><div className="title">{p.title}</div><div className="muted">{p.sku}</div></div>
      <PrintLabelButton/>
    </div>

    <div className="split print-hide">
      <div>
        <img className="hero-img" src={p.image} alt={p.title}/>
        <div className="card" style={{marginTop:16}}>
          <h3>Stock</h3>
          <div className="grid stagger" style={{gridTemplateColumns:'repeat(3,1fr)'}}>
            <div><div className="muted">Physical</div><div className="metric"><Counter value={p.physical}/></div></div>
            <div><div className="muted">Reserved</div><div className="metric"><Counter value={p.reserved}/></div></div>
            <div><div className="muted">Available</div><div className="metric"><Counter value={available(p)}/></div></div>
          </div>
        </div>
      </div>
      <div className="stack">
        <div className="card"><h3>Product</h3>
          <div><b>Category:</b> {p.category}</div>
          <div><b>Condition:</b> {p.condition}</div>
          <div><b>Location:</b> {p.location}</div>
          <div><b>Cost:</b> £{p.cost}</div>
          <div><b>Target price:</b> £{p.price}</div>
        </div>
        <div className="card qr-in"><h3>Barcode / QR</h3>
          <QRCodeSVG value={p.sku} size={160}/>
          <div style={{marginTop:8,fontWeight:800}}>{p.sku}</div>
        </div>
        <div className="card"><h3>Marketplace</h3>
          <div>eBay: {p.ebay?'Listed':'Not listed'}</div>
          <div>Vinted: {p.vinted?'Listed':'Not listed'}</div>
        </div>
        <div className="notice">Customer-return items must not be marked working/complete until staff verify them.</div>
      </div>
    </div>

    {/* laid out only on paper — see the @media print block in globals.css */}
    <div className="label-sheet">
      <div className="label-title">{p.title}</div>
      <QRCodeSVG value={p.sku} size={150}/>
      <div className="label-meta">
        <div><b>SKU:</b> {p.sku}</div>
        <div><b>Location:</b> {p.location}</div>
        <div><b>Condition:</b> {p.condition}</div>
      </div>
    </div>
  </div>;
}
