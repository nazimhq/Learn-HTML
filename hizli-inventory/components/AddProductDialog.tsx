'use client';

import {useState} from 'react';
import Modal from './Modal';
import {addProduct, getState, currencySymbol, recordAiUsage, aiUsedToday, PLACEHOLDER_IMAGE} from '@/lib/store';
import {CONDITIONS, TEST_STATUSES, COMPLETENESS} from '@/lib/types';
import type {Condition, TestStatus, Completeness, AiAnalysis} from '@/lib/types';
import {fileToDataUrl} from '@/lib/image';
import {analyseProduct, confidenceBand, FIELD_LABELS} from '@/lib/ai';
import {can, type Session} from '@/lib/auth';

const CATEGORIES = ['Kitchen Appliances', 'Home Appliances', 'Home Storage', 'Electronics', 'Furniture', 'Garden', 'Toys', 'Other'];

export default function AddProductDialog({session, onClose, onSaved}: {
  session: Session; onClose: () => void; onSaved: (sku: string) => void;
}) {
  const s = getState();
  const symbol = currencySymbol(s);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [subcategory, setSubcategory] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [colour, setColour] = useState('');
  const [condition, setCondition] = useState<Condition>('Untested');
  const [conditionNotes, setConditionNotes] = useState('');
  const [testStatus, setTestStatus] = useState<TestStatus>('Not Tested');
  const [completeness, setCompleteness] = useState<Completeness>('Unknown');
  const [rack, setRack] = useState('');
  const [bay, setBay] = useState('');
  const [level, setLevel] = useState('');
  const [physical, setPhysical] = useState('1');
  const [cost, setCost] = useState('0');
  const [price, setPrice] = useState('0');
  const [supplierId, setSupplierId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [image, setImage] = useState(PLACEHOLDER_IMAGE);
  const [hasPhoto, setHasPhoto] = useState(false);

  const [ai, setAi] = useState<AiAnalysis | null>(null);
  const [aiLive, setAiLive] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const aiAllowed = s.settings.aiEnabled && can(session, 'ai.run');
  const overLimit = aiUsedToday(s) >= s.settings.aiDailyLimit;

  async function pickImage(file: File | undefined) {
    if (!file) return;
    try {
      setBusy(true);
      setImage(await fileToDataUrl(file));
      setHasPhoto(true);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // AI only ever runs from this button, never automatically (spec §22)
  async function runAnalysis() {
    setAnalysing(true);
    setError('');
    try {
      const result = await analyseProduct(image, title);
      setAi(result.analysis);
      setAiLive(result.live);
      recordAiUsage(session.username, hasPhoto ? 1 : 0, result.provider);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAnalysing(false);
    }
  }

  function applySuggestion(field: string, value: string) {
    if (value === 'Needs Verification') return;
    if (field === 'title') setTitle(value);
    if (field === 'category' && CATEGORIES.includes(value)) setCategory(value);
    if (field === 'subcategory') setSubcategory(value);
    if (field === 'brand') setBrand(value);
    if (field === 'model') setModel(value);
    if (field === 'colour') setColour(value);
    if (field === 'condition_observation') setConditionNotes(value);
  }

  function acceptAll() {
    ai?.suggestions.forEach(sg => applySuggestion(sg.field, sg.value));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (title.trim().length < 3) { setError('Give the product a title of at least 3 characters'); return; }
    if (!rack.trim() || !bay.trim() || !level.trim()) { setError('Rack, bay and level are all needed for the warehouse location'); return; }
    const qty = Number(physical);
    if (!Number.isInteger(qty) || qty < 0) { setError('Physical quantity must be a whole number'); return; }
    if (Number(cost) < 0 || Number(price) < 0) { setError('Cost and price cannot be negative'); return; }
    if (condition === 'Customer Return' && testStatus === 'Tested Working') {
      setError('A customer return cannot be marked tested working until a person has actually tested it.');
      return;
    }

    try {
      const p = addProduct({
        title, category, subcategory, brand, model, colour,
        condition, conditionNotes, testStatus, completeness,
        image, images: [image],
        physical: qty, cost: Number(cost), targetPrice: Number(price),
        supplierId: supplierId || null, batchId: batchId || null,
        rack, bay, level,
        ai: ai ? {...ai, approvedBy: session.username, approvedAt: new Date().toISOString()} : null
      }, session.username);
      onSaved(p.sku);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return <Modal title="Add product" onClose={onClose}>
    <form onSubmit={submit} className="stack">
      {/* step 1 — photo */}
      <div className="photo-pick">
        <img src={image} alt="" className="photo-preview"/>
        <div className="stack" style={{alignContent: 'start'}}>
          <label className="field" htmlFor="photo">Photo
            <input id="photo" className="input" type="file" accept="image/*" capture="environment" onChange={e => pickImage(e.target.files?.[0])}/>
          </label>
          <div className="muted" style={{fontSize: 12}}>Phone camera or gallery. Resized to 800px before storing.</div>
          {aiAllowed && <button className="btn secondary" type="button" onClick={runAnalysis} disabled={analysing || overLimit}>
            {analysing ? 'Analysing…' : 'Analyse with AI'}
          </button>}
          {overLimit && <div className="muted" style={{fontSize: 12}}>Daily AI limit reached.</div>}
        </div>
      </div>

      {/* step 2 — AI review */}
      {ai && <div className="ai-panel reveal">
        <div className="row">
          <b>AI suggestions</b>
          <span className="badge">{aiLive ? 'Vision model' : 'Offline draft'}</span>
        </div>
        {!aiLive && <div className="muted" style={{fontSize: 12, marginTop: 4}}>
          No AI key is configured on this deployment, so this is a low-confidence draft from the title — not a reading of the photo.
        </div>}
        <div className="stack" style={{marginTop: 10}}>
          {ai.suggestions.map(sg => {
            const band = confidenceBand(sg.confidence);
            return <div className="ai-row" key={sg.field}>
              <div style={{minWidth: 0}}>
                <div className="muted" style={{fontSize: 12}}>{FIELD_LABELS[sg.field] ?? sg.field}</div>
                <div><b>{sg.value}</b></div>
              </div>
              <div className="row" style={{gap: 8, flex: '0 0 auto'}}>
                <span className={'badge ' + (band.tone === 'good' ? 'good' : band.tone === 'warn' ? 'warn' : 'low')}>
                  {sg.confidence}% · {band.label}
                </span>
                <button className="link-btn" type="button" onClick={() => applySuggestion(sg.field, sg.value)}>Use</button>
              </div>
            </div>;
          })}
        </div>
        <div className="row" style={{justifyContent: 'flex-end', gap: 10, marginTop: 12}}>
          <button className="btn secondary" type="button" onClick={() => setAi(null)}>Discard suggestions</button>
          <button className="btn secondary" type="button" onClick={acceptAll}>Accept all</button>
        </div>
        <div className="muted" style={{fontSize: 12, marginTop: 8}}>
          Nothing is saved until you press Save product. Anything marked Needs Verification is skipped.
        </div>
      </div>}

      {/* step 3 — the record */}
      <label className="field" htmlFor="p-title">Title
        <input id="p-title" className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Black Dual Basket Air Fryer" required/>
      </label>

      <div className="form-grid">
        <label className="field" htmlFor="p-cat">Category
          <select id="p-cat" className="input" value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="field" htmlFor="p-sub">Subcategory <span className="muted">(drives the SKU)</span>
          <input id="p-sub" className="input" value={subcategory} onChange={e => setSubcategory(e.target.value)} placeholder="Air Fryer"/>
        </label>
      </div>

      <div className="form-grid">
        <label className="field" htmlFor="p-brand">Brand<input id="p-brand" className="input" value={brand} onChange={e => setBrand(e.target.value)}/></label>
        <label className="field" htmlFor="p-model">Model<input id="p-model" className="input" value={model} onChange={e => setModel(e.target.value)}/></label>
      </div>

      <div className="form-grid">
        <label className="field" htmlFor="p-colour">Colour<input id="p-colour" className="input" value={colour} onChange={e => setColour(e.target.value)}/></label>
        <label className="field" htmlFor="p-cond">Condition
          <select id="p-cond" className="input" value={condition} onChange={e => setCondition(e.target.value as Condition)}>
            {CONDITIONS.map(c => <option key={c}>{c}</option>)}
          </select>
        </label>
      </div>

      <div className="form-grid">
        <label className="field" htmlFor="p-test">Test status
          <select id="p-test" className="input" value={testStatus} onChange={e => setTestStatus(e.target.value as TestStatus)}>
            {TEST_STATUSES.map(c => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="field" htmlFor="p-complete">Completeness
          <select id="p-complete" className="input" value={completeness} onChange={e => setCompleteness(e.target.value as Completeness)}>
            {COMPLETENESS.map(c => <option key={c}>{c}</option>)}
          </select>
        </label>
      </div>

      <label className="field" htmlFor="p-cnotes">Condition notes
        <input id="p-cnotes" className="input" value={conditionNotes} onChange={e => setConditionNotes(e.target.value)} placeholder="Box opened, accessories not checked"/>
      </label>

      <div className="field">Warehouse location</div>
      <div className="form-grid-3">
        <input className="input" value={rack} onChange={e => setRack(e.target.value)} placeholder="Rack — A" aria-label="Rack" required/>
        <input className="input" value={bay} onChange={e => setBay(e.target.value)} placeholder="Bay — 03" aria-label="Bay" required/>
        <input className="input" value={level} onChange={e => setLevel(e.target.value)} placeholder="Level — 01" aria-label="Level" required/>
      </div>

      <div className="form-grid-3">
        <label className="field" htmlFor="p-qty">Quantity<input id="p-qty" className="input" type="number" min="0" step="1" value={physical} onChange={e => setPhysical(e.target.value)}/></label>
        <label className="field" htmlFor="p-cost">Unit cost ({symbol})<input id="p-cost" className="input" type="number" min="0" step="0.01" value={cost} onChange={e => setCost(e.target.value)}/></label>
        <label className="field" htmlFor="p-price">Target price ({symbol})<input id="p-price" className="input" type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)}/></label>
      </div>

      <div className="form-grid">
        <label className="field" htmlFor="p-sup">Supplier
          <select id="p-sup" className="input" value={supplierId} onChange={e => setSupplierId(e.target.value)}>
            <option value="">— none —</option>
            {s.suppliers.map(sup => <option key={sup.id} value={sup.id}>{sup.name}</option>)}
          </select>
        </label>
        <label className="field" htmlFor="p-batch">Purchase batch
          <select id="p-batch" className="input" value={batchId} onChange={e => setBatchId(e.target.value)}>
            <option value="">— none —</option>
            {s.batches.map(b => <option key={b.id} value={b.id}>{b.code}</option>)}
          </select>
        </label>
      </div>

      {condition === 'Customer Return' && <div className="notice" style={{fontSize: 13}}>
        Customer returns stay untested until someone checks them. The system will not let this be
        saved as tested working from here.
      </div>}

      <div className="muted" style={{fontSize: 13}}>
        The SKU and barcode are generated from the prefix in Settings and the subcategory.
      </div>

      {error && <div className="notice reveal" role="alert">{error}</div>}

      <div className="row" style={{justifyContent: 'flex-end', gap: 10}}>
        <button className="btn secondary" type="button" onClick={onClose}>Cancel</button>
        <button className="btn" type="submit" disabled={busy}>{busy ? 'Working…' : 'Save product'}</button>
      </div>
    </form>
  </Modal>;
}
