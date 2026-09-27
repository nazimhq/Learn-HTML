'use client';

import {useState} from 'react';
import Modal from './Modal';
import {moveStock, locationOf} from '@/lib/store';
import type {Product} from '@/lib/types';
import type {Session} from '@/lib/auth';

export default function MoveStockDialog({product, session, onClose, onSaved}: {
  product: Product; session: Session; onClose: () => void; onSaved: (message: string) => void;
}) {
  const [rack, setRack] = useState(product.rack);
  const [bay, setBay] = useState(product.bay);
  const [level, setLevel] = useState(product.level);
  const [bin, setBin] = useState(product.bin);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      moveStock({productId: product.id, rack, bay, level, bin, notes}, session.username);
      onSaved(`${product.sku} moved`);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return <Modal title={`Move stock — ${product.sku}`} onClose={onClose}>
    <form className="stack" onSubmit={submit}>
      <div className="muted">Currently in <b>{locationOf(product) || 'no location'}</b>.</div>
      <div className="form-grid">
        <label className="field" htmlFor="mv-rack">Rack<input id="mv-rack" className="input" value={rack} onChange={e => setRack(e.target.value)} placeholder="A" required/></label>
        <label className="field" htmlFor="mv-bay">Bay<input id="mv-bay" className="input" value={bay} onChange={e => setBay(e.target.value)} placeholder="03" required/></label>
      </div>
      <div className="form-grid">
        <label className="field" htmlFor="mv-level">Level<input id="mv-level" className="input" value={level} onChange={e => setLevel(e.target.value)} placeholder="01" required/></label>
        <label className="field" htmlFor="mv-bin">Bin <span className="muted">(optional)</span><input id="mv-bin" className="input" value={bin} onChange={e => setBin(e.target.value)} placeholder="BIN04"/></label>
      </div>
      <label className="field" htmlFor="mv-notes">Notes<input id="mv-notes" className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Consolidating rack A"/></label>
      {error && <div className="notice reveal" role="alert">{error}</div>}
      <div className="row" style={{justifyContent: 'flex-end', gap: 10}}>
        <button className="btn secondary" type="button" onClick={onClose}>Cancel</button>
        <button className="btn" type="submit">Move stock</button>
      </div>
    </form>
  </Modal>;
}
