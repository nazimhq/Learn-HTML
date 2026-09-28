'use client';

import {useState} from 'react';
import Modal from './Modal';
import {stockOut, STOCK_OUT_REASONS, available, StockShortfallError, type StockOutReason} from '@/lib/store';
import {can} from '@/lib/auth';
import type {Product} from '@/lib/types';
import type {Session} from '@/lib/auth';

export default function StockOutDialog({product, session, onClose, onSaved}: {
  product: Product; session: Session; onClose: () => void; onSaved: (message: string) => void;
}) {
  const [qty, setQty] = useState('1');
  const [reason, setReason] = useState<StockOutReason>('Damaged');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [shortfall, setShortfall] = useState('');

  function remove(override: boolean) {
    setError('');
    try {
      stockOut({productId: product.id, qty: Number(qty), reason, notes, override}, session.username);
      onSaved(`${qty} × ${product.sku} removed (${reason})${override ? ' — override logged' : ''}`);
    } catch (err) {
      if (err instanceof StockShortfallError && can(session, 'settings.manage')) {
        setShortfall(err.message);
      } else {
        setError((err as Error).message);
      }
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setShortfall('');
    remove(false);
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

      {shortfall && <div className="notice reveal" role="alert">
        <b>{shortfall}</b> As an admin you can force this through as a stock correction. The movement
        and the audit entry will both be marked as an override.
      </div>}

      <div className="row" style={{justifyContent: 'flex-end', gap: 10}}>
        <button className="btn secondary" type="button" onClick={onClose}>Cancel</button>
        {shortfall
          ? <button className="btn danger" type="button" onClick={() => remove(true)}>Override and remove</button>
          : <button className="btn danger" type="submit">Remove stock</button>}
      </div>
    </form>
  </Modal>;
}
