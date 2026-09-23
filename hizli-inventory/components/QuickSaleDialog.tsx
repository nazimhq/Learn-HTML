'use client';

import {useState} from 'react';
import Modal from './Modal';
import {quickSale, available, CHANNELS, getState, currencySymbol} from '@/lib/store';
import type {Session} from '@/lib/auth';

export default function QuickSaleDialog({session, onClose, onSaved}: {
  session: Session; onClose: () => void; onSaved: (orderNumber: string) => void;
}) {
  const s = getState();
  const symbol = currencySymbol(s);
  const sellable = s.products.filter(p => available(p) > 0);

  const [productId, setProductId] = useState(sellable[0]?.id ?? '');
  const [qty, setQty] = useState('1');
  const [channel, setChannel] = useState(CHANNELS[0]);
  const selected = s.products.find(p => p.id === productId);
  const [unitPrice, setUnitPrice] = useState(String(sellable[0]?.price ?? 0));
  const [error, setError] = useState('');

  function choose(id: string) {
    setProductId(id);
    const p = s.products.find(x => x.id === id);
    if (p) setUnitPrice(String(p.price));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const n = Number(qty);
    if (!Number.isInteger(n) || n <= 0) { setError('Quantity must be a whole number above zero'); return; }
    if (Number(unitPrice) < 0) { setError('Price cannot be negative'); return; }
    try {
      const order = quickSale({productId, qty: n, channel, unitPrice: Number(unitPrice)}, session.username);
      onSaved(order.orderNumber);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (sellable.length === 0) {
    return <Modal title="Quick sale" onClose={onClose}>
      <div className="notice">Nothing is available to sell — every product is either out of stock or fully reserved.</div>
      <div className="row" style={{justifyContent: 'flex-end', marginTop: 14}}>
        <button className="btn" type="button" onClick={onClose}>Close</button>
      </div>
    </Modal>;
  }

  const total = (Number(unitPrice) || 0) * (Number(qty) || 0);

  return <Modal title="Quick sale" onClose={onClose}>
    <form onSubmit={submit} className="stack">
      <label className="field" htmlFor="q-product">Product
        <select id="q-product" className="input" value={productId} onChange={e => choose(e.target.value)}>
          {sellable.map(p => <option key={p.id} value={p.id}>{p.title} — {p.sku} ({available(p)} available)</option>)}
        </select>
      </label>

      <div className="form-grid">
        <label className="field" htmlFor="q-qty">Quantity
          <input id="q-qty" className="input" type="number" min="1" step="1" max={selected ? available(selected) : 1} value={qty} onChange={e => setQty(e.target.value)}/>
        </label>
        <label className="field" htmlFor="q-channel">Channel
          <select id="q-channel" className="input" value={channel} onChange={e => setChannel(e.target.value)}>
            {CHANNELS.map(c => <option key={c}>{c}</option>)}
          </select>
        </label>
      </div>

      <label className="field" htmlFor="q-price">Unit price ({symbol})
        <input id="q-price" className="input" type="number" min="0" step="0.01" value={unitPrice} onChange={e => setUnitPrice(e.target.value)}/>
      </label>

      <div className="row summary">
        <span className="muted">Order total</span>
        <strong style={{fontSize: 20}}>{symbol}{total.toFixed(2)}</strong>
      </div>

      <div className="muted" style={{fontSize: 13}}>
        Saving reserves the stock and opens the order at <b>Picking</b>. Physical
        stock only drops when you mark it Dispatched on the Orders page.
      </div>

      {error && <div className="notice reveal" role="alert">{error}</div>}

      <div className="row" style={{justifyContent: 'flex-end', gap: 10}}>
        <button className="btn secondary" type="button" onClick={onClose}>Cancel</button>
        <button className="btn" type="submit">Create order</button>
      </div>
    </form>
  </Modal>;
}
