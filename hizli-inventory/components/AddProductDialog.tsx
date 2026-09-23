'use client';

import {useState} from 'react';
import Modal from './Modal';
import {addProduct, CONDITIONS, getState, currencySymbol} from '@/lib/store';
import {fileToDataUrl, PLACEHOLDER_IMAGE} from '@/lib/image';
import type {Session} from '@/lib/auth';

const CATEGORIES = ['Kitchen Appliances', 'Home Appliances', 'Home Storage', 'Electronics', 'Furniture', 'Garden', 'Toys', 'Other'];

export default function AddProductDialog({session, onClose, onSaved}: {
  session: Session; onClose: () => void; onSaved: (sku: string) => void;
}) {
  const s = getState();
  const symbol = currencySymbol(s);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [condition, setCondition] = useState('Untested');
  const [location, setLocation] = useState('');
  const [physical, setPhysical] = useState('1');
  const [cost, setCost] = useState('0');
  const [price, setPrice] = useState('0');
  const [ebay, setEbay] = useState(false);
  const [vinted, setVinted] = useState(false);
  const [image, setImage] = useState(PLACEHOLDER_IMAGE);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function pickImage(file: File | undefined) {
    if (!file) return;
    try {
      setBusy(true);
      setImage(await fileToDataUrl(file));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (title.trim().length < 3) { setError('Give the product a title of at least 3 characters'); return; }
    if (!/^[A-Za-z0-9-]{3,}$/.test(location.trim())) { setError('Location should look like A-03-01'); return; }
    const qty = Number(physical);
    if (!Number.isInteger(qty) || qty < 0) { setError('Physical quantity must be a whole number'); return; }
    if (Number(cost) < 0 || Number(price) < 0) { setError('Cost and price cannot be negative'); return; }

    try {
      const p = addProduct({
        title, category, condition, location,
        physical: qty, cost: Number(cost), price: Number(price),
        image, ebay, vinted
      }, session.username);
      onSaved(p.sku);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return <Modal title="Add product" onClose={onClose}>
    <form onSubmit={submit} className="stack">
      <div className="photo-pick">
        <img src={image} alt="" className="photo-preview"/>
        <div className="stack" style={{alignContent: 'start'}}>
          <label className="field" htmlFor="photo">Photo
            <input id="photo" className="input" type="file" accept="image/*" onChange={e => pickImage(e.target.files?.[0])}/>
          </label>
          <div className="muted" style={{fontSize: 12}}>Resized to 800px before it is stored.</div>
        </div>
      </div>

      <label className="field" htmlFor="p-title">Title
        <input id="p-title" className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Black Dual Basket Air Fryer" required/>
      </label>

      <div className="form-grid">
        <label className="field" htmlFor="p-cat">Category
          <select id="p-cat" className="input" value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="field" htmlFor="p-cond">Condition
          <select id="p-cond" className="input" value={condition} onChange={e => setCondition(e.target.value)}>
            {CONDITIONS.map(c => <option key={c}>{c}</option>)}
          </select>
        </label>
      </div>

      <div className="form-grid">
        <label className="field" htmlFor="p-loc">Location
          <input id="p-loc" className="input" value={location} onChange={e => setLocation(e.target.value)} placeholder="A-03-01" required/>
        </label>
        <label className="field" htmlFor="p-qty">Physical qty
          <input id="p-qty" className="input" type="number" min="0" step="1" value={physical} onChange={e => setPhysical(e.target.value)}/>
        </label>
      </div>

      <div className="form-grid">
        <label className="field" htmlFor="p-cost">Unit cost ({symbol})
          <input id="p-cost" className="input" type="number" min="0" step="0.01" value={cost} onChange={e => setCost(e.target.value)}/>
        </label>
        <label className="field" htmlFor="p-price">Target price ({symbol})
          <input id="p-price" className="input" type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)}/>
        </label>
      </div>

      <div className="row" style={{justifyContent: 'flex-start', gap: 20}}>
        <label className="check"><input type="checkbox" checked={ebay} onChange={e => setEbay(e.target.checked)}/> Listed on eBay</label>
        <label className="check"><input type="checkbox" checked={vinted} onChange={e => setVinted(e.target.checked)}/> Listed on Vinted</label>
      </div>

      <div className="muted" style={{fontSize: 13}}>
        The SKU is generated from the prefix in Settings, so you do not type it.
      </div>

      {error && <div className="notice reveal" role="alert">{error}</div>}

      <div className="row" style={{justifyContent: 'flex-end', gap: 10}}>
        <button className="btn secondary" type="button" onClick={onClose}>Cancel</button>
        <button className="btn" type="submit" disabled={busy}>{busy ? 'Working…' : 'Save product'}</button>
      </div>
    </form>
  </Modal>;
}
