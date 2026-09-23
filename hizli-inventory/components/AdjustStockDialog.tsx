'use client';

import {useState} from 'react';
import Modal from './Modal';
import {adjustStock, type Product} from '@/lib/store';
import type {Session} from '@/lib/auth';

const TYPES = [
  {value: 'receive', label: 'Receive — stock arrived'},
  {value: 'damage', label: 'Damage — write off'},
  {value: 'adjustment', label: 'Adjustment — stock count correction'}
] as const;

export default function AdjustStockDialog({product, session, onClose, onSaved}: {
  product: Product; session: Session; onClose: () => void; onSaved: () => void;
}) {
  const [type, setType] = useState<typeof TYPES[number]['value']>('receive');
  const [qty, setQty] = useState('1');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      adjustStock({productId: product.id, type, qty: Number(qty), reason}, session.username);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return <Modal title={`Adjust stock — ${product.sku}`} onClose={onClose}>
    <form onSubmit={submit} className="stack">
      <label className="field" htmlFor="a-type">Movement
        <select id="a-type" className="input" value={type} onChange={e => setType(e.target.value as typeof type)}>
          {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </label>
      <label className="field" htmlFor="a-qty">Quantity
        <input id="a-qty" className="input" type="number" min="1" step="1" value={qty} onChange={e => setQty(e.target.value)}/>
      </label>
      <label className="field" htmlFor="a-reason">Reason
        <input id="a-reason" className="input" value={reason} onChange={e => setReason(e.target.value)} placeholder="Supplier delivery, damaged in transit…" required/>
      </label>
      <div className="muted" style={{fontSize: 13}}>
        Currently {product.physical} physical, {product.reserved} reserved. Stock
        cannot go below what is reserved for open orders.
      </div>
      {error && <div className="notice reveal" role="alert">{error}</div>}
      <div className="row" style={{justifyContent: 'flex-end', gap: 10}}>
        <button className="btn secondary" type="button" onClick={onClose}>Cancel</button>
        <button className="btn" type="submit">Record movement</button>
      </div>
    </form>
  </Modal>;
}
