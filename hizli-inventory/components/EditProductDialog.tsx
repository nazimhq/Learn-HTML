'use client';

import {useState} from 'react';
import Modal from './Modal';
import {updateProduct, findDuplicates} from '@/lib/store';
import {CONDITIONS, TEST_STATUSES, COMPLETENESS} from '@/lib/types';
import type {Product, Condition, TestStatus, Completeness} from '@/lib/types';
import {fileToDataUrl} from '@/lib/image';
import {can, type Session} from '@/lib/auth';

export default function EditProductDialog({product, session, onClose, onSaved}: {
  product: Product; session: Session; onClose: () => void; onSaved: (message: string) => void;
}) {
  const [form, setForm] = useState<Product>(product);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const showCost = can(session, 'cost.view');
  const set = <K extends keyof Product>(k: K, v: Product[K]) => setForm(f => ({...f, [k]: v}));

  async function addImage(file: File | undefined) {
    if (!file) return;
    try {
      setBusy(true);
      const url = await fileToDataUrl(file);
      setForm(f => ({...f, images: [...f.images, url], image: f.images.length === 0 ? url : f.image}));
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
    if (form.title.trim().length < 3) { setError('Title must be at least 3 characters'); return; }
    if (!form.rack.trim() || !form.bay.trim() || !form.level.trim()) { setError('Rack, bay and level are all needed'); return; }
    if (form.condition === 'Customer Return' && form.testStatus === 'Tested Working' && product.testStatus !== 'Tested Working') {
      setError('Mark a customer return as tested working only after somebody has actually tested it — record the test first.');
      return;
    }
    try {
      const {physical, reserved, damaged, quarantine, sold, returned, ...patch} = form;
      updateProduct(product.id, patch, session.username);
      onSaved(`${product.sku} updated`);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const dupes = findDuplicates({title: form.title, model: form.model}).filter(d => d.product.id !== product.id);

  return <Modal title={`Edit — ${product.sku}`} onClose={onClose}>
    <form className="stack" onSubmit={submit}>
      <div className="photo-pick">
        <img src={form.image} alt="" className="photo-preview"/>
        <div className="stack" style={{alignContent: 'start'}}>
          <label className="field" htmlFor="ep-photo">Add a photo
            <input id="ep-photo" className="input" type="file" accept="image/*" capture="environment" onChange={e => addImage(e.target.files?.[0])}/>
          </label>
          {form.images.length > 1 && <div className="row" style={{justifyContent: 'flex-start', gap: 8, flexWrap: 'wrap'}}>
            {form.images.map((url, ix) => <button key={ix} type="button" className="icon-btn"
              style={{width: 44, height: 44, padding: 0, overflow: 'hidden', borderColor: url === form.image ? 'var(--accent)' : undefined}}
              onClick={() => set('image', url)} title={url === form.image ? 'Main image' : 'Make main image'}>
              <img src={url} alt="" style={{width: '100%', height: '100%', objectFit: 'cover'}}/>
            </button>)}
          </div>}
          <div className="muted" style={{fontSize: 12}}>Click a thumbnail to make it the main photo.</div>
        </div>
      </div>

      <label className="field" htmlFor="ep-title">Title
        <input id="ep-title" className="input" value={form.title} onChange={e => set('title', e.target.value)} required/>
      </label>
      <label className="field" htmlFor="ep-internal">Internal short title
        <input id="ep-internal" className="input" value={form.internalTitle} onChange={e => set('internalTitle', e.target.value)}/>
      </label>

      {dupes.length > 0 && <div className="notice reveal">
        <b>Possible duplicate:</b> {dupes.map(d => `${d.product.sku} (${d.why})`).join(', ')}. Nothing is
        merged automatically — check before saving.
      </div>}

      <div className="form-grid">
        <label className="field" htmlFor="ep-cat">Category<input id="ep-cat" className="input" value={form.category} onChange={e => set('category', e.target.value)}/></label>
        <label className="field" htmlFor="ep-sub">Subcategory<input id="ep-sub" className="input" value={form.subcategory} onChange={e => set('subcategory', e.target.value)}/></label>
      </div>
      <div className="form-grid-3">
        <label className="field" htmlFor="ep-brand">Brand<input id="ep-brand" className="input" value={form.brand} onChange={e => set('brand', e.target.value)}/></label>
        <label className="field" htmlFor="ep-model">Model<input id="ep-model" className="input" value={form.model} onChange={e => set('model', e.target.value)}/></label>
        <label className="field" htmlFor="ep-colour">Colour<input id="ep-colour" className="input" value={form.colour} onChange={e => set('colour', e.target.value)}/></label>
      </div>

      <div className="form-grid-3">
        <label className="field" htmlFor="ep-cond">Condition
          <select id="ep-cond" className="input" value={form.condition} onChange={e => set('condition', e.target.value as Condition)}>
            {CONDITIONS.map(c => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="field" htmlFor="ep-test">Test status
          <select id="ep-test" className="input" value={form.testStatus} onChange={e => set('testStatus', e.target.value as TestStatus)}>
            {TEST_STATUSES.map(c => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="field" htmlFor="ep-complete">Completeness
          <select id="ep-complete" className="input" value={form.completeness} onChange={e => set('completeness', e.target.value as Completeness)}>
            {COMPLETENESS.map(c => <option key={c}>{c}</option>)}
          </select>
        </label>
      </div>

      <label className="field" htmlFor="ep-cnotes">Condition notes
        <input id="ep-cnotes" className="input" value={form.conditionNotes} onChange={e => set('conditionNotes', e.target.value)}/>
      </label>

      <div className="field">Warehouse location</div>
      <div className="form-grid-3">
        <input className="input" value={form.rack} onChange={e => set('rack', e.target.value)} placeholder="Rack" aria-label="Rack" required/>
        <input className="input" value={form.bay} onChange={e => set('bay', e.target.value)} placeholder="Bay" aria-label="Bay" required/>
        <input className="input" value={form.level} onChange={e => set('level', e.target.value)} placeholder="Level" aria-label="Level" required/>
      </div>

      {showCost && <div className="form-grid-3">
        <label className="field" htmlFor="ep-cost">Unit cost<input id="ep-cost" className="input" type="number" min="0" step="0.01" value={form.cost} onChange={e => set('cost', Number(e.target.value))}/></label>
        <label className="field" htmlFor="ep-price">Target price<input id="ep-price" className="input" type="number" min="0" step="0.01" value={form.targetPrice} onChange={e => set('targetPrice', Number(e.target.value))}/></label>
        <label className="field" htmlFor="ep-low">Low-stock level<input id="ep-low" className="input" type="number" min="0" step="1" value={form.lowStockThreshold} onChange={e => set('lowStockThreshold', Number(e.target.value))}/></label>
      </div>}

      <div className="form-grid">
        <label className="field" htmlFor="ep-ebay">eBay listing ID<input id="ep-ebay" className="input" value={form.ebayListingId} onChange={e => set('ebayListingId', e.target.value)}/></label>
        <label className="field" htmlFor="ep-vinted">Vinted reference<input id="ep-vinted" className="input" value={form.vintedRef} onChange={e => set('vintedRef', e.target.value)}/></label>
      </div>

      <label className="field" htmlFor="ep-notes">Notes
        <input id="ep-notes" className="input" value={form.notes} onChange={e => set('notes', e.target.value)}/>
      </label>

      <div className="muted" style={{fontSize: 12}}>
        Stock quantities are not editable here — they only change through a stock movement, so the
        history always adds up.
      </div>

      {error && <div className="notice reveal" role="alert">{error}</div>}

      <div className="row" style={{justifyContent: 'flex-end', gap: 10}}>
        <button className="btn secondary" type="button" onClick={onClose}>Cancel</button>
        <button className="btn" type="submit" disabled={busy}>Save changes</button>
      </div>
    </form>
  </Modal>;
}
