'use client';

import {useState} from 'react';
import {useStore} from '@/lib/useStore';
import {useSession} from '@/lib/useSession';
import {addSupplier, addBatch, money} from '@/lib/store';
import {can} from '@/lib/auth';
import Tabs from '@/components/Tabs';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';

type Tab = 'suppliers' | 'batches';

export default function SuppliersPage() {
  const {state} = useStore();
  const {session} = useSession();
  const [tab, setTab] = useState<Tab>('suppliers');
  const [dialog, setDialog] = useState<Tab | null>(null);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  const manage = can(session, 'supplier.manage');
  const supplierName = (id: string | null) => state.suppliers.find(s => s.id === id)?.name ?? '—';

  function saveSupplier(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      addSupplier({
        name: String(f.get('name') ?? ''), contactName: String(f.get('contact') ?? ''),
        phone: String(f.get('phone') ?? ''), email: String(f.get('email') ?? ''),
        address: String(f.get('address') ?? ''), notes: String(f.get('notes') ?? ''), active: true
      }, session!.username);
      setDialog(null);
      setError('');
      setToast('Supplier added');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function saveBatch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      const b = addBatch({
        supplierId: String(f.get('supplier') ?? '') || null,
        purchaseDate: String(f.get('date') ?? ''),
        invoiceRef: String(f.get('invoice') ?? ''),
        totalCost: Number(f.get('cost') ?? 0),
        notes: String(f.get('notes') ?? '')
      }, session!.username);
      setDialog(null);
      setError('');
      setToast(`${b.code} created`);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return <div className="page">
    <div className="top">
      <div><div className="title">Suppliers</div><div className="muted">Where the stock came from, and what it cost</div></div>
      {manage && <button className="btn" type="button" onClick={() => setDialog(tab)}>
        + {tab === 'suppliers' ? 'Add supplier' : 'New purchase batch'}
      </button>}
    </div>

    <Tabs<Tab> active={tab} onChange={setTab} tabs={[
      {key: 'suppliers', label: 'Suppliers', count: state.suppliers.length},
      {key: 'batches', label: 'Purchase batches', count: state.batches.length}
    ]}/>

    {error && <div className="notice reveal" role="alert" style={{marginBottom: 16}}>{error}</div>}

    {tab === 'suppliers'
      ? <div style={{overflowX: 'auto'}}><table className="table">
          <thead><tr><th>Supplier</th><th>Contact</th><th>Phone</th><th>Email</th><th className="num">Products</th><th>Notes</th></tr></thead>
          <tbody>{state.suppliers.map(s => <tr key={s.id}>
            <td><b>{s.name}</b></td><td>{s.contactName}</td><td>{s.phone}</td><td>{s.email}</td>
            <td className="num">{state.products.filter(p => p.supplierId === s.id).length}</td>
            <td className="muted">{s.notes}</td>
          </tr>)}</tbody>
        </table></div>
      : <div style={{overflowX: 'auto'}}><table className="table">
          <thead><tr><th>Batch</th><th>Supplier</th><th>Date</th><th>Invoice</th><th className="num">Total cost</th><th className="num">Products</th><th>Notes</th></tr></thead>
          <tbody>{state.batches.map(b => <tr key={b.id}>
            <td><b>{b.code}</b></td><td>{supplierName(b.supplierId)}</td><td>{b.purchaseDate}</td><td>{b.invoiceRef}</td>
            <td className="num">{money(b.totalCost, state)}</td>
            <td className="num">{state.products.filter(p => p.batchId === b.id).length}</td>
            <td className="muted">{b.notes}</td>
          </tr>)}</tbody>
        </table></div>}

    {dialog === 'suppliers' && <Modal title="Add supplier" onClose={() => setDialog(null)}>
      <form className="stack" onSubmit={saveSupplier}>
        <label className="field" htmlFor="sp-name">Supplier name<input id="sp-name" name="name" className="input" required/></label>
        <div className="form-grid">
          <label className="field" htmlFor="sp-contact">Contact person<input id="sp-contact" name="contact" className="input"/></label>
          <label className="field" htmlFor="sp-phone">Phone<input id="sp-phone" name="phone" className="input"/></label>
        </div>
        <label className="field" htmlFor="sp-email">Email<input id="sp-email" name="email" type="email" className="input"/></label>
        <label className="field" htmlFor="sp-address">Address<input id="sp-address" name="address" className="input"/></label>
        <label className="field" htmlFor="sp-notes">Notes<input id="sp-notes" name="notes" className="input"/></label>
        <div className="row" style={{justifyContent: 'flex-end', gap: 10}}>
          <button className="btn secondary" type="button" onClick={() => setDialog(null)}>Cancel</button>
          <button className="btn" type="submit">Save supplier</button>
        </div>
      </form>
    </Modal>}

    {dialog === 'batches' && <Modal title="New purchase batch" onClose={() => setDialog(null)}>
      <form className="stack" onSubmit={saveBatch}>
        <label className="field" htmlFor="bt-supplier">Supplier
          <select id="bt-supplier" name="supplier" className="input">
            <option value="">— none —</option>
            {state.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <div className="form-grid">
          <label className="field" htmlFor="bt-date">Purchase date<input id="bt-date" name="date" type="date" className="input" defaultValue={new Date().toISOString().slice(0, 10)} required/></label>
          <label className="field" htmlFor="bt-invoice">Invoice reference<input id="bt-invoice" name="invoice" className="input"/></label>
        </div>
        <label className="field" htmlFor="bt-cost">Total cost<input id="bt-cost" name="cost" type="number" min="0" step="0.01" className="input" defaultValue="0"/></label>
        <label className="field" htmlFor="bt-notes">Notes<input id="bt-notes" name="notes" className="input" placeholder="Customer return pallet, mixed small appliances"/></label>
        <div className="row" style={{justifyContent: 'flex-end', gap: 10}}>
          <button className="btn secondary" type="button" onClick={() => setDialog(null)}>Cancel</button>
          <button className="btn" type="submit">Create batch</button>
        </div>
      </form>
    </Modal>}

    {toast && <Toast message={toast} onDone={() => setToast('')}/>}
  </div>;
}
