'use client';

import {useState} from 'react';
import Link from 'next/link';
import {useStore} from '@/lib/useStore';
import {useSession} from '@/lib/useSession';
import {can} from '@/lib/auth';
import {recordReturn, money, available} from '@/lib/store';
import {RETURN_TYPES, RETURN_OUTCOMES, CONDITIONS} from '@/lib/types';
import type {ReturnType, ReturnOutcome, Condition} from '@/lib/types';
import Modal from '@/components/Modal';
import Tabs from '@/components/Tabs';
import Toast from '@/components/Toast';

type Tab = 'all' | 'quarantine';

export default function ReturnsPage() {
  const {state} = useStore();
  const {session} = useSession();
  const [tab, setTab] = useState<Tab>('all');
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  const quarantined = state.products.filter(p => p.quarantine > 0);
  const refunded = state.returns.reduce((t, r) => t + r.refundAmount, 0);

  return <div className="page">
    <div className="top">
      <div>
        <div className="eyebrow">After the sale</div>
        <div className="title">Returns</div>
        <div className="muted">Customer, marketplace and supplier returns — and what happened to the stock</div>
      </div>
      {can(session, 'stock.receive') && <button className="btn" type="button" onClick={() => setAdding(true)}>+ Record return</button>}
    </div>

    <div className="tiles stagger" style={{marginBottom: 22}}>
      <div className="tile"><div className="tile-icon tone-blue">↩</div><div>
        <div className="tile-label">Returns logged</div><div className="metric">{state.returns.length}</div>
        <div className="tile-sub">{state.returns.reduce((t, r) => t + r.qty, 0)} units</div></div></div>
      <div className="tile"><div className="tile-icon tone-amber">⚠</div><div>
        <div className="tile-label">In quarantine</div><div className="metric">{quarantined.reduce((t, p) => t + p.quarantine, 0)}</div>
        <div className="tile-sub">{quarantined.length} product{quarantined.length === 1 ? '' : 's'} held out of available</div></div></div>
      <div className="tile"><div className="tile-icon tone-red">£</div><div>
        <div className="tile-label">Refunded</div><div className="metric">{money(refunded, state)}</div>
        <div className="tile-sub">across all returns</div></div></div>
    </div>

    <Tabs<Tab> active={tab} onChange={setTab} tabs={[
      {key: 'all', label: 'All returns', count: state.returns.length},
      {key: 'quarantine', label: 'Quarantine', count: quarantined.length}
    ]}/>

    {error && <div className="notice reveal" role="alert" style={{marginBottom: 16}}>{error}</div>}

    {tab === 'all' && (state.returns.length === 0
      ? <div className="card muted">No returns recorded yet.</div>
      : <div className="table-wrap"><table className="table">
          <thead><tr><th>Reference</th><th>Type</th><th>Product</th><th className="num">Qty</th><th>Reason</th><th>Outcome</th><th className="num">Refund</th><th>By</th></tr></thead>
          <tbody>{state.returns.map(r => <tr key={r.id}>
            <td><b>{r.reference}</b>{r.orderNumber && <div className="muted" style={{fontSize: 11}}>{r.orderNumber}</div>}</td>
            <td>{r.type}</td>
            <td><Link className="link-btn" href={`/product/?id=${r.productId}`}>{r.title}</Link>
              <div className="muted" style={{fontSize: 11}}>{r.sku}</div></td>
            <td className="num">{r.qty}</td>
            <td>{r.reason}</td>
            <td><span className={r.outcome === 'Restock' ? 'badge good' : r.outcome === 'Damaged' ? 'badge low' : 'badge warn'}>{r.outcome}</span></td>
            <td className="num">{money(r.refundAmount, state)}</td>
            <td className="muted">{r.actor}</td>
          </tr>)}</tbody>
        </table></div>)}

    {tab === 'quarantine' && (quarantined.length === 0
      ? <div className="card muted">Nothing is in quarantine. Quarantined units are held out of available stock until somebody decides what happens to them.</div>
      : <div className="table-wrap"><table className="table">
          <thead><tr><th>Photo</th><th>SKU</th><th>Product</th><th>Reason</th><th className="num">Quarantined</th><th className="num">Physical</th><th className="num">Available</th></tr></thead>
          <tbody>{quarantined.map(p => <tr key={p.id}>
            <td><img className="thumb" src={p.image} alt=""/></td>
            <td><Link className="link-btn" href={`/product/?id=${p.id}`}>{p.sku}</Link></td>
            <td>{p.title}</td>
            <td><span className="badge warn">{p.quarantineReason ?? 'Held'}</span></td>
            <td className="num">{p.quarantine}</td>
            <td className="num">{p.physical}</td>
            <td className="num">{available(p)}</td>
          </tr>)}</tbody>
        </table></div>)}

    {adding && session && <RecordReturnDialog
      onClose={() => setAdding(false)}
      onSaved={ref => { setAdding(false); setToast(`${ref} recorded`); }}
      onError={setError}
      actor={session.username}
    />}

    {toast && <Toast message={toast} onDone={() => setToast('')}/>}
  </div>;

  function RecordReturnDialog({onClose, onSaved, actor}: {
    onClose: () => void; onSaved: (ref: string) => void; onError: (m: string) => void; actor: string;
  }) {
    const [type, setType] = useState<ReturnType>('Customer Return');
    const [orderId, setOrderId] = useState('');
    const [productId, setProductId] = useState(state.products[0]?.id ?? '');
    const [qty, setQty] = useState('1');
    const [reason, setReason] = useState('');
    const [conditionAfter, setConditionAfter] = useState<Condition>('Customer Return');
    const [outcome, setOutcome] = useState<ReturnOutcome>('Quarantine');
    const [refund, setRefund] = useState('0');
    const [notes, setNotes] = useState('');
    const [err, setErr] = useState('');

    const completedOrders = state.orders.filter(o => o.status === 'Delivery' || o.status === 'Collection');

    function pickOrder(id: string) {
      setOrderId(id);
      const o = state.orders.find(x => x.id === id);
      if (o) {
        setProductId(o.productId);
        setQty(String(o.qty));
        setRefund(String((o.unitPrice * o.qty).toFixed(2)));
      }
    }

    function submit(e: React.FormEvent) {
      e.preventDefault();
      setErr('');
      try {
        const entry = recordReturn({
          type, orderId: orderId || null, productId, qty: Number(qty),
          reason, conditionAfter, outcome, refundAmount: Number(refund) || 0, notes
        }, actor);
        onSaved(entry.reference);
      } catch (e2) {
        setErr((e2 as Error).message);
      }
    }

    return <Modal title="Record a return" onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        <div className="form-grid">
          <label className="field" htmlFor="rt-type">Return type
            <select id="rt-type" className="input" value={type} onChange={e => setType(e.target.value as ReturnType)}>
              {RETURN_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </label>
          <label className="field" htmlFor="rt-order">Original order
            <select id="rt-order" className="input" value={orderId} onChange={e => pickOrder(e.target.value)}>
              <option value="">— none —</option>
              {completedOrders.map(o => <option key={o.id} value={o.id}>{o.orderNumber} — {o.sku}</option>)}
            </select>
          </label>
        </div>

        <label className="field" htmlFor="rt-product">Product
          <select id="rt-product" className="input" value={productId} onChange={e => setProductId(e.target.value)}>
            {state.products.map(p => <option key={p.id} value={p.id}>{p.title} — {p.sku}</option>)}
          </select>
        </label>

        <div className="form-grid">
          <label className="field" htmlFor="rt-qty">Quantity
            <input id="rt-qty" className="input" type="number" min="1" step="1" value={qty} onChange={e => setQty(e.target.value)}/>
          </label>
          <label className="field" htmlFor="rt-refund">Refund amount
            <input id="rt-refund" className="input" type="number" min="0" step="0.01" value={refund} onChange={e => setRefund(e.target.value)}/>
          </label>
        </div>

        <label className="field" htmlFor="rt-reason">Reason
          <input id="rt-reason" className="input" value={reason} onChange={e => setReason(e.target.value)} placeholder="Faulty on arrival, wrong item, changed mind…" required/>
        </label>

        <div className="form-grid">
          <label className="field" htmlFor="rt-cond">Condition after return
            <select id="rt-cond" className="input" value={conditionAfter} onChange={e => setConditionAfter(e.target.value as Condition)}>
              {CONDITIONS.map(c => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="field" htmlFor="rt-outcome">What happens to it
            <select id="rt-outcome" className="input" value={outcome} onChange={e => setOutcome(e.target.value as ReturnOutcome)}>
              {RETURN_OUTCOMES.map(o => <option key={o}>{o}</option>)}
            </select>
          </label>
        </div>

        <label className="field" htmlFor="rt-notes">Notes
          <input id="rt-notes" className="input" value={notes} onChange={e => setNotes(e.target.value)}/>
        </label>

        <div className="notice" style={{fontSize: 13}}>
          <b>Restock</b> puts the units straight back into available stock. <b>Quarantine</b> holds
          them out until somebody checks them. <b>Damaged</b> writes them off. A returned item goes
          back to <b>Not Tested</b> either way.
        </div>

        {err && <div className="notice reveal" role="alert">{err}</div>}

        <div className="row" style={{justifyContent: 'flex-end', gap: 10}}>
          <button className="btn secondary" type="button" onClick={onClose}>Cancel</button>
          <button className="btn" type="submit">Record return</button>
        </div>
      </form>
    </Modal>;
  }
}
