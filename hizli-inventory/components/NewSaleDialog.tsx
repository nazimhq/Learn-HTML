'use client';

import {useState} from 'react';
import Modal from './Modal';
import {recordSale, available, getState, currencySymbol} from '@/lib/store';
import {CHANNELS} from '@/lib/types';
import type {Channel} from '@/lib/types';
import type {Session} from '@/lib/auth';

export default function NewSaleDialog({session, onClose, onSaved}: {
  session: Session; onClose: () => void; onSaved: (orderNumber: string) => void;
}) {
  const s = getState();
  const symbol = currencySymbol(s);
  const sellable = s.products.filter(p => !p.archived && available(p) > 0);

  const [productId, setProductId] = useState(sellable[0]?.id ?? '');
  const [qty, setQty] = useState('1');
  const [channel, setChannel] = useState<Channel>('eBay');
  const [unitPrice, setUnitPrice] = useState(String(sellable[0]?.targetPrice ?? 0));
  const [shipping, setShipping] = useState('3.50');
  const [fee, setFee] = useState('0');
  const [customerRef, setCustomerRef] = useState('');
  const [marketplaceOrderId, setMarketplaceOrderId] = useState('');
  const [error, setError] = useState('');

  const selected = s.products.find(p => p.id === productId);

  function choose(id: string) {
    setProductId(id);
    const p = s.products.find(x => x.id === id);
    if (p) setUnitPrice(String(p.targetPrice));
  }

  function pickChannel(c: Channel) {
    setChannel(c);
    // eBay and Vinted take roughly 11%; a warehouse collection has no fee
    const gross = (Number(unitPrice) || 0) * (Number(qty) || 0);
    setFee(c === 'eBay' || c === 'Vinted' ? (gross * 0.11).toFixed(2) : '0');
    if (c === 'Warehouse') setShipping('0');
  }

  if (sellable.length === 0) {
    return <Modal title="New sale" onClose={onClose}>
      <div className="notice">Nothing is available to sell — every product is out of stock or fully reserved.</div>
      <div className="row" style={{justifyContent: 'flex-end', marginTop: 14}}>
        <button className="btn" type="button" onClick={onClose}>Close</button>
      </div>
    </Modal>;
  }

  const gross = (Number(unitPrice) || 0) * (Number(qty) || 0);
  const cost = (selected?.cost ?? 0) * (Number(qty) || 0);
  const profit = gross - cost - (Number(fee) || 0) - (Number(shipping) || 0);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const n = Number(qty);
    if (!Number.isInteger(n) || n <= 0) { setError('Quantity must be a whole number above zero'); return; }
    if (Number(unitPrice) < 0) { setError('Price cannot be negative'); return; }
    try {
      const order = recordSale({
        productId, qty: n, channel,
        unitPrice: Number(unitPrice),
        shippingCost: Number(shipping) || 0,
        marketplaceFee: Number(fee) || 0,
        customerRef, marketplaceOrderId
      }, session.username);
      onSaved(order.orderNumber);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return <Modal title="New sale" onClose={onClose}>
    <form className="stack" onSubmit={submit}>
      <label className="field" htmlFor="ns-product">Product
        <select id="ns-product" className="input" value={productId} onChange={e => choose(e.target.value)}>
          {sellable.map(p => <option key={p.id} value={p.id}>{p.title} — {p.sku} ({available(p)} available)</option>)}
        </select>
      </label>

      <div className="form-grid">
        <label className="field" htmlFor="ns-qty">Quantity
          <input id="ns-qty" className="input" type="number" min="1" step="1" max={selected ? available(selected) : 1} value={qty} onChange={e => setQty(e.target.value)}/>
        </label>
        <label className="field" htmlFor="ns-channel">Channel
          <select id="ns-channel" className="input" value={channel} onChange={e => pickChannel(e.target.value as Channel)}>
            {CHANNELS.map(c => <option key={c}>{c}</option>)}
          </select>
        </label>
      </div>

      <div className="form-grid">
        <label className="field" htmlFor="ns-price">Unit price ({symbol})
          <input id="ns-price" className="input" type="number" min="0" step="0.01" value={unitPrice} onChange={e => setUnitPrice(e.target.value)}/>
        </label>
        <label className="field" htmlFor="ns-ship">Shipping cost ({symbol})
          <input id="ns-ship" className="input" type="number" min="0" step="0.01" value={shipping} onChange={e => setShipping(e.target.value)}/>
        </label>
      </div>

      <div className="form-grid">
        <label className="field" htmlFor="ns-fee">Marketplace fee ({symbol})
          <input id="ns-fee" className="input" type="number" min="0" step="0.01" value={fee} onChange={e => setFee(e.target.value)}/>
        </label>
        <label className="field" htmlFor="ns-ref">Customer reference
          <input id="ns-ref" className="input" value={customerRef} onChange={e => setCustomerRef(e.target.value)} placeholder="Optional"/>
        </label>
      </div>

      <label className="field" htmlFor="ns-moid">Marketplace order ID
        <input id="ns-moid" className="input" value={marketplaceOrderId} onChange={e => setMarketplaceOrderId(e.target.value)} placeholder="Optional — e.g. the eBay order number"/>
      </label>

      <div className="summary stack">
        <div className="row"><span className="muted">Order total</span><b style={{fontSize: 20}}>{symbol}{gross.toFixed(2)}</b></div>
        <div className="row"><span className="muted">Estimated profit after cost, fee and shipping</span>
          <b className={profit < 0 ? 'neg' : 'pos'}>{symbol}{profit.toFixed(2)}</b></div>
      </div>

      <div className="muted" style={{fontSize: 13}}>
        Saving reserves the stock and opens the order at <b>Picking</b>. Physical stock drops when
        you confirm it as Delivery or Collection.
      </div>

      {error && <div className="notice reveal" role="alert">{error}</div>}

      <div className="row" style={{justifyContent: 'flex-end', gap: 10}}>
        <button className="btn secondary" type="button" onClick={onClose}>Cancel</button>
        <button className="btn" type="submit">Create order</button>
      </div>
    </form>
  </Modal>;
}
