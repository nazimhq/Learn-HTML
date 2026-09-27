'use client';

import {useState} from 'react';
import Modal from './Modal';
import {stockOut, STOCK_OUT_REASONS, available, type StockOutReason} from '@/lib/store';
import type {Product} from '@/lib/types';
import type {Session} from '@/lib/auth';

export default function StockOutDialog({product, session, onClose, onSaved}: {
  product: Product; session: Session; onClose: () => void; onSaved: (message: string) => void;
}) {
  const [qty, setQty] = useState('1');
  const [reason, setReason] = useState<StockOutReason>('Damaged');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      stockOut({productId: product.id, qty: Number(qty), reason, notes}, session.username);
      onSaved(`${qty} × ${product.sku} removed (${reason})`);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return <Modal title={`Remove stock — ${product.sku}`} onClose={onClose}>
    <form className="stack" onSubmit={submit}>
      <div className="form-grid">
        <label className="field" htmlFor="so-qty">Quantity
          <input id="so-qty" className="input" type="number" min="1" step="1" max={product.physical - product.reserved} value={qty} onChange={e => setQty(e.target.value)}/>
        </label>
        <label className="field" htmlFor="so-reason">Reason
          <select id="so-reason" className="input" value={reason} onChange={e => setReason(e.target.value as StockOutReason)}>
            {STOCK_OUT_REASONS.map(r => <option key={r}>{r}</option>)}
          </select>
        </label>
      </div>

      <label className="field" htmlFor="so-notes">Notes
        <input id="so-notes" className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Cracked lid found during picking" required/>
      </label>

      <div className="muted" style={{fontSize: 13}}>
        {product.physical} physical, {product.reserved} reserved, {available(product)} available.
        A reason is required — stock never changes silently.
      </div>

      {error && <div className="notice reveal" role="alert">{error}</div>}

      <div className="row" style={{justifyContent: 'flex-end', gap: 10}}>
        <button className="btn secondary" type="button" onClick={onClose}>Cancel</button>
        <button className="btn danger" type="submit">Remove stock</button>
      </div>
    </form>
  </Modal>;
}
