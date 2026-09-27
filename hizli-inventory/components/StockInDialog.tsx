'use client';

import {useState} from 'react';
import Modal from './Modal';
import {stockIn, getState, currencySymbol, available} from '@/lib/store';
import type {Session} from '@/lib/auth';

export default function StockInDialog({session, onClose, onSaved}: {
  session: Session; onClose: () => void; onSaved: (message: string) => void;
}) {
  const s = getState();
  const symbol = currencySymbol(s);
  const products = s.products.filter(p => !p.archived);

  const [productId, setProductId] = useState(products[0]?.id ?? '');
  const [qty, setQty] = useState('1');
  const [unitCost, setUnitCost] = useState(String(products[0]?.cost ?? 0));
  const [supplierId, setSupplierId] = useState<string>(products[0]?.supplierId ?? '');
  const [batchId, setBatchId] = useState<string>(products[0]?.batchId ?? '');
  const [reason, setReason] = useState('Supplier delivery');
  const [error, setError] = useState('');

  const selected = products.find(p => p.id === productId);

  function choose(id: string) {
    setProductId(id);
    const p = products.find(x => x.id === id);
    if (p) {
      setUnitCost(String(p.cost));
      setSupplierId(p.supplierId ?? '');
      setBatchId(p.batchId ?? '');
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      stockIn({
        productId,
        qty: Number(qty),
        unitCost: Number(unitCost),
        supplierId: supplierId || null,
        batchId: batchId || null,
        reason
      }, session.username);
      onSaved(`${qty} × ${selected?.sku ?? 'units'} received`);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (products.length === 0) {
    return <Modal title="Receive stock" onClose={onClose}>
      <div className="notice">There are no products yet. Add one from the Inventory page first.</div>
      <div className="row" style={{justifyContent: 'flex-end', marginTop: 14}}>
        <button className="btn" type="button" onClick={onClose}>Close</button>
      </div>
    </Modal>;
  }

  return <Modal title="Receive stock" onClose={onClose}>
    <form className="stack" onSubmit={submit}>
      <label className="field" htmlFor="si-product">Product
        <select id="si-product" className="input" value={productId} onChange={e => choose(e.target.value)}>
          {products.map(p => <option key={p.id} value={p.id}>{p.title} — {p.sku} ({p.physical} in stock)</option>)}
        </select>
      </label>

      <div className="form-grid">
        <label className="field" htmlFor="si-qty">Quantity received
          <input id="si-qty" className="input" type="number" min="1" step="1" value={qty} onChange={e => setQty(e.target.value)}/>
        </label>
        <label className="field" htmlFor="si-cost">Unit cost ({symbol})
          <input id="si-cost" className="input" type="number" min="0" step="0.01" value={unitCost} onChange={e => setUnitCost(e.target.value)}/>
        </label>
      </div>

      <div className="form-grid">
        <label className="field" htmlFor="si-supplier">Supplier
          <select id="si-supplier" className="input" value={supplierId} onChange={e => setSupplierId(e.target.value)}>
            <option value="">— none —</option>
            {s.suppliers.map(sup => <option key={sup.id} value={sup.id}>{sup.name}</option>)}
          </select>
        </label>
        <label className="field" htmlFor="si-batch">Purchase batch
          <select id="si-batch" className="input" value={batchId} onChange={e => setBatchId(e.target.value)}>
            <option value="">— none —</option>
            {s.batches.map(b => <option key={b.id} value={b.id}>{b.code}</option>)}
          </select>
        </label>
      </div>

      <label className="field" htmlFor="si-reason">Reason
        <input id="si-reason" className="input" value={reason} onChange={e => setReason(e.target.value)} required/>
      </label>

      {selected && <div className="summary row">
        <span className="muted">After this receipt</span>
        <b>{selected.physical + (Number(qty) || 0)} physical · {available(selected) + (Number(qty) || 0)} available</b>
      </div>}

      <div className="muted" style={{fontSize: 13}}>
        Unit cost is averaged across the stock on hand. The batch keeps its own recorded cost.
      </div>

      {error && <div className="notice reveal" role="alert">{error}</div>}

      <div className="row" style={{justifyContent: 'flex-end', gap: 10}}>
        <button className="btn secondary" type="button" onClick={onClose}>Cancel</button>
        <button className="btn" type="submit">Receive stock</button>
      </div>
    </form>
  </Modal>;
}
