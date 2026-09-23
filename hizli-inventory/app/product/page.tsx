'use client';

import {useEffect, useState} from 'react';
import Link from 'next/link';
import {QRCodeSVG} from 'qrcode.react';
import {useStore} from '@/lib/useStore';
import {useSession} from '@/lib/useSession';
import {available, money, type Product} from '@/lib/store';
import {can} from '@/lib/auth';
import Counter from '@/components/Counter';
import PrintLabelButton from '@/components/PrintLabelButton';
import AdjustStockDialog from '@/components/AdjustStockDialog';
import Toast from '@/components/Toast';

export default function ProductPage() {
  const {state, ready} = useStore();
  const {session} = useSession();
  const [id, setId] = useState<string | null>(null);
  const [adjusting, setAdjusting] = useState(false);
  const [toast, setToast] = useState('');

  // read straight off the URL: the static export has one HTML file for every
  // product, so the id cannot come from the path
  useEffect(() => {
    setId(new URLSearchParams(window.location.search).get('id'));
  }, []);

  if (!ready || id === null) return <div className="page"><div className="skeleton tile"/></div>;

  const p: Product | undefined = state.products.find(x => x.id === id);
  if (!p) {
    return <div className="page">
      <div className="top"><div><div className="title">Product not found</div><div className="muted">It may have been removed</div></div></div>
      <div className="card"><p>Nothing here with id {id}.</p><Link className="btn" href="/inventory">Back to inventory</Link></div>
    </div>;
  }

  const history = state.movements.filter(m => m.productId === p.id).slice(0, 6);

  return <div className="page">
    <div className="top">
      <div><div className="title">{p.title}</div><div className="muted">{p.sku}</div></div>
      <div className="row" style={{gap: 10}}>
        {can.adjustStock(session) && <button className="btn secondary no-print" type="button" onClick={() => setAdjusting(true)}>Adjust stock</button>}
        <PrintLabelButton/>
      </div>
    </div>

    <div className="split print-hide">
      <div>
        <img className="hero-img" src={p.image} alt={p.title}/>
        <div className="card" style={{marginTop: 16}}>
          <h3>Stock</h3>
          <div className="grid stagger" style={{gridTemplateColumns: 'repeat(3,1fr)'}}>
            <div><div className="muted">Physical</div><div className="metric"><Counter value={p.physical} key={`ph${p.physical}`}/></div></div>
            <div><div className="muted">Reserved</div><div className="metric"><Counter value={p.reserved} key={`re${p.reserved}`}/></div></div>
            <div><div className="muted">Available</div><div className="metric"><Counter value={available(p)} key={`av${available(p)}`}/></div></div>
          </div>
        </div>
        {history.length > 0 && <div className="card" style={{marginTop: 16}}>
          <h3>Recent movements</h3>
          <div style={{overflowX: 'auto'}}>
            <table className="table">
              <thead><tr><th>Type</th><th>Qty</th><th>Reason</th><th>By</th></tr></thead>
              <tbody>{history.map(m => <tr key={m.id}>
                <td><span className="badge">{m.type}</span></td><td>{m.quantity}</td><td>{m.reason}</td><td>{m.actor}</td>
              </tr>)}</tbody>
            </table>
          </div>
        </div>}
      </div>

      <div className="stack">
        <div className="card"><h3>Product</h3>
          <div><b>Category:</b> {p.category}</div>
          <div><b>Condition:</b> {p.condition}</div>
          <div><b>Location:</b> {p.location}</div>
          <div><b>Cost:</b> {money(p.cost, state)}</div>
          <div><b>Target price:</b> {money(p.price, state)}</div>
        </div>
        <div className="card qr-in"><h3>Barcode / QR</h3>
          <QRCodeSVG value={p.sku} size={160}/>
          <div style={{marginTop: 8, fontWeight: 800}}>{p.sku}</div>
        </div>
        <div className="card"><h3>Marketplace</h3>
          <div>eBay: {p.ebay ? 'Listed' : 'Not listed'}</div>
          <div>Vinted: {p.vinted ? 'Listed' : 'Not listed'}</div>
        </div>
        {p.condition === 'Customer Return' && <div className="notice">
          Customer-return items must not be marked working/complete until staff verify them.
        </div>}
      </div>
    </div>

    <div className="label-sheet">
      <div className="label-title">{p.title}</div>
      <QRCodeSVG value={p.sku} size={150}/>
      <div className="label-meta">
        <div><b>SKU:</b> {p.sku}</div>
        <div><b>Location:</b> {p.location}</div>
        <div><b>Condition:</b> {p.condition}</div>
      </div>
    </div>

    {adjusting && session && <AdjustStockDialog
      product={p} session={session}
      onClose={() => setAdjusting(false)}
      onSaved={() => { setAdjusting(false); setToast('Stock movement recorded'); }}
    />}
    {toast && <Toast message={toast} onDone={() => setToast('')}/>}
  </div>;
}
