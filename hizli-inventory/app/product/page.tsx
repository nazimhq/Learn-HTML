'use client';

import {useEffect, useState} from 'react';
import Link from 'next/link';
import {QRCodeSVG} from 'qrcode.react';
import {useStore} from '@/lib/useStore';
import {useSession} from '@/lib/useSession';
import {available, money, locationOf, updateProduct} from '@/lib/store';
import {can} from '@/lib/auth';
import {generateEbayListing, generateVintedListing, confidenceBand, FIELD_LABELS} from '@/lib/ai';
import Counter from '@/components/Counter';
import PrintLabelButton from '@/components/PrintLabelButton';
import StockInDialog from '@/components/StockInDialog';
import StockOutDialog from '@/components/StockOutDialog';
import MoveStockDialog from '@/components/MoveStockDialog';
import Tabs from '@/components/Tabs';
import Toast from '@/components/Toast';
import type {Product} from '@/lib/types';

type Tab = 'overview' | 'stock' | 'marketplace' | 'orders' | 'activity' | 'ai';

export default function ProductPage() {
  const {state, ready} = useStore();
  const {session} = useSession();
  const [id, setId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [dialog, setDialog] = useState<'in' | 'out' | 'move' | null>(null);
  const [toast, setToast] = useState('');
  const [listing, setListing] = useState('');

  useEffect(() => {
    setId(new URLSearchParams(window.location.search).get('id'));
  }, []);

  if (!ready || id === null) return <div className="page"><div className="skeleton tile"/></div>;

  const p: Product | undefined = state.products.find(x => x.id === id);
  if (!p) {
    return <div className="page">
      <div className="top"><div><div className="title">Product not found</div><div className="muted">It may have been archived</div></div></div>
      <div className="card"><p>Nothing here with id {id}.</p><Link className="btn" href="/inventory">Back to inventory</Link></div>
    </div>;
  }

  const showCost = can(session, 'cost.view');
  const movements = state.movements.filter(m => m.productId === p.id);
  const orders = state.orders.filter(o => o.productId === p.id);
  const supplier = state.suppliers.find(s => s.id === p.supplierId);
  const batch = state.batches.find(b => b.id === p.batchId);

  function setListingStatus(channel: 'ebay' | 'vinted', status: 'Listed' | 'Not listed') {
    if (!session || !p) return;
    try {
      updateProduct(p.id, channel === 'ebay' ? {ebayStatus: status} : {vintedStatus: status}, session.username);
      setToast(`${channel === 'ebay' ? 'eBay' : 'Vinted'} marked ${status.toLowerCase()}`);
    } catch (e) {
      setToast((e as Error).message);
    }
  }

  return <div className="page">
    <div className="top">
      <div>
        <div className="title">{p.title}</div>
        <div className="muted">{p.sku} · {locationOf(p) || 'no location'} · {p.condition}</div>
      </div>
      <div className="row no-print" style={{gap: 10, flexWrap: 'wrap'}}>
        {can(session, 'stock.receive') && <button className="btn secondary" type="button" onClick={() => setDialog('in')}>Add stock</button>}
        {can(session, 'stock.remove') && <button className="btn secondary" type="button" onClick={() => setDialog('out')}>Remove stock</button>}
        {can(session, 'stock.move') && <button className="btn secondary" type="button" onClick={() => setDialog('move')}>Move</button>}
        <PrintLabelButton/>
      </div>
    </div>

    <div className="split print-hide">
      <div>
        <img className="hero-img" src={p.image} alt={p.title}/>
        <div className="card" style={{marginTop: 16}}>
          <h3 style={{marginTop: 0}}>Stock</h3>
          <div className="grid stagger" style={{gridTemplateColumns: 'repeat(4,1fr)'}}>
            <div><div className="muted">Physical</div><div className="metric"><Counter value={p.physical} key={`ph${p.physical}`}/></div></div>
            <div><div className="muted">Reserved</div><div className="metric"><Counter value={p.reserved} key={`re${p.reserved}`}/></div></div>
            <div><div className="muted">Available</div><div className="metric"><Counter value={available(p)} key={`av${available(p)}`}/></div></div>
            <div><div className="muted">Sold</div><div className="metric"><Counter value={p.sold} key={`so${p.sold}`}/></div></div>
          </div>
        </div>
      </div>

      <div className="stack">
        <div className="card qr-in"><h3 style={{marginTop: 0}}>Barcode / QR</h3>
          <QRCodeSVG value={p.barcode} size={150}/>
          <div style={{marginTop: 8, fontWeight: 800}}>{p.barcode}</div>
          <div className="muted" style={{fontSize: 12, marginTop: 4}}>Scan with a phone to open this product.</div>
        </div>
        {p.condition === 'Customer Return' && p.testStatus !== 'Tested Working' && <div className="notice">
          Customer return — <b>{p.testStatus}</b>, {p.completeness.toLowerCase()}. Do not describe it as
          working or complete until a person has verified it.
        </div>}
      </div>
    </div>

    <div className="no-print" style={{marginTop: 22}}>
      <Tabs<Tab>
        active={tab}
        onChange={setTab}
        tabs={[
          {key: 'overview', label: 'Overview'},
          {key: 'stock', label: 'Stock'},
          {key: 'marketplace', label: 'Marketplace'},
          {key: 'orders', label: 'Orders', count: orders.length},
          {key: 'activity', label: 'Activity', count: movements.length},
          {key: 'ai', label: 'AI suggestions'}
        ]}
      />

      {tab === 'overview' && <div className="split">
        <div className="card"><h3 style={{marginTop: 0}}>Product</h3>
          <div className="kv"><span className="muted">Internal title</span><b>{p.internalTitle || '—'}</b></div>
          <div className="kv"><span className="muted">Category</span><b>{p.category}{p.subcategory ? ` · ${p.subcategory}` : ''}</b></div>
          <div className="kv"><span className="muted">Brand / model</span><b>{[p.brand, p.model].filter(Boolean).join(' ') || '—'}</b></div>
          <div className="kv"><span className="muted">Colour / material</span><b>{[p.colour, p.material].filter(Boolean).join(' · ') || '—'}</b></div>
          <div className="kv"><span className="muted">Condition</span><b>{p.condition}</b></div>
          <div className="kv"><span className="muted">Test status</span><b>{p.testStatus}</b></div>
          <div className="kv"><span className="muted">Completeness</span><b>{p.completeness}</b></div>
          {p.conditionNotes && <div className="kv"><span className="muted">Condition notes</span><b>{p.conditionNotes}</b></div>}
        </div>
        <div className="card"><h3 style={{marginTop: 0}}>Commercial</h3>
          {showCost
            ? <>
                <div className="kv"><span className="muted">Unit cost</span><b>{money(p.cost, state)}</b></div>
                <div className="kv"><span className="muted">Target price</span><b>{money(p.targetPrice, state)}</b></div>
                <div className="kv"><span className="muted">Stock value</span><b>{money(p.physical * p.cost, state)}</b></div>
                <div className="kv"><span className="muted">Margin at target</span>
                  <b>{p.targetPrice > 0 ? (((p.targetPrice - p.cost) / p.targetPrice) * 100).toFixed(0) + '%' : '—'}</b></div>
              </>
            : <div className="muted">Cost and profit are not shown to your role.</div>}
          <div className="kv"><span className="muted">Supplier</span><b>{supplier?.name ?? '—'}</b></div>
          <div className="kv"><span className="muted">Purchase batch</span><b>{batch?.code ?? '—'}</b></div>
          <div className="kv"><span className="muted">Received</span><b>{new Date(p.receivedAt).toLocaleDateString('en-GB')}</b></div>
          <div className="kv"><span className="muted">Low stock threshold</span><b>{p.lowStockThreshold}</b></div>
        </div>
      </div>}

      {tab === 'stock' && <div className="card">
        <h3 style={{marginTop: 0}}>Location and quantities</h3>
        <div className="kv"><span className="muted">Warehouse</span><b>{p.warehouse}</b></div>
        <div className="kv"><span className="muted">Rack / bay / level</span><b>{p.rack || '—'} / {p.bay || '—'} / {p.level || '—'}</b></div>
        {p.bin && <div className="kv"><span className="muted">Bin</span><b>{p.bin}</b></div>}
        <div className="kv"><span className="muted">Damaged</span><b>{p.damaged}</b></div>
        <div className="kv"><span className="muted">Quarantine</span><b>{p.quarantine}</b></div>
        <div className="kv"><span className="muted">Returned</span><b>{p.returned}</b></div>
        <div className="kv"><span className="muted">Last sold</span><b>{p.lastSoldAt ? new Date(p.lastSoldAt).toLocaleDateString('en-GB') : 'never'}</b></div>
      </div>}

      {tab === 'marketplace' && <div className="split">
        <div className="card"><h3 style={{marginTop: 0}}>eBay</h3>
          <div className="kv"><span className="muted">Status</span><b>{p.ebayStatus}</b></div>
          <div className="kv"><span className="muted">Listing ID</span><b>{p.ebayListingId || '—'}</b></div>
          <div className="kv"><span className="muted">Listed price</span><b>{p.ebayPrice != null ? money(p.ebayPrice, state) : '—'}</b></div>
          {can(session, 'listing.manage') && <div className="row" style={{gap: 10, marginTop: 12}}>
            <button className="btn secondary" type="button" onClick={() => setListingStatus('ebay', p.ebayStatus === 'Listed' ? 'Not listed' : 'Listed')}>
              Mark {p.ebayStatus === 'Listed' ? 'not listed' : 'listed'}
            </button>
            <button className="btn secondary" type="button" onClick={() => {
              const l = generateEbayListing(p);
              setListing(`EBAY TITLE\n${l.title}\n\nDESCRIPTION\n${l.description}\n\nITEM SPECIFICS\n${Object.entries(l.itemSpecifics).map(([k, v]) => `${k}: ${v}`).join('\n')}`);
            }}>Generate eBay listing</button>
          </div>}
        </div>
        <div className="card"><h3 style={{marginTop: 0}}>Vinted</h3>
          <div className="kv"><span className="muted">Status</span><b>{p.vintedStatus}</b></div>
          <div className="kv"><span className="muted">Reference</span><b>{p.vintedRef || '—'}</b></div>
          <div className="kv"><span className="muted">Listed price</span><b>{p.vintedPrice != null ? money(p.vintedPrice, state) : '—'}</b></div>
          {can(session, 'listing.manage') && <div className="row" style={{gap: 10, marginTop: 12}}>
            <button className="btn secondary" type="button" onClick={() => setListingStatus('vinted', p.vintedStatus === 'Listed' ? 'Not listed' : 'Listed')}>
              Mark {p.vintedStatus === 'Listed' ? 'not listed' : 'listed'}
            </button>
            <button className="btn secondary" type="button" onClick={() => {
              const l = generateVintedListing(p);
              setListing(`VINTED TITLE\n${l.title}\n\nDESCRIPTION\n${l.description}\n\nTAGS\n${l.tags.join(', ')}`);
            }}>Generate Vinted listing</button>
          </div>}
        </div>
        {listing && <div className="card" style={{gridColumn: '1 / -1'}}>
          <div className="row"><h3 style={{margin: 0}}>Draft — edit before publishing</h3>
            <button className="link-btn" type="button" onClick={() => setListing('')}>Close</button></div>
          <textarea className="input" rows={12} value={listing} onChange={e => setListing(e.target.value)} style={{marginTop: 10, fontFamily: 'inherit'}}/>
          <div className="muted" style={{fontSize: 13, marginTop: 8}}>
            This draft never changes the internal title. Nothing is published from here.
          </div>
        </div>}
      </div>}

      {tab === 'orders' && (orders.length === 0
        ? <div className="card muted">No orders for this product yet.</div>
        : <div style={{overflowX: 'auto'}}><table className="table">
            <thead><tr><th>Order</th><th>Channel</th><th className="num">Qty</th><th>Status</th><th className="num">Total</th><th>Date</th></tr></thead>
            <tbody>{orders.map(o => <tr key={o.id}>
              <td><b>{o.orderNumber}</b></td><td>{o.channel}</td><td className="num">{o.qty}</td>
              <td><span className="badge">{o.status}</span></td>
              <td className="num">{money(o.unitPrice * o.qty, state)}</td>
              <td className="muted">{new Date(o.createdAt).toLocaleDateString('en-GB')}</td>
            </tr>)}</tbody>
          </table></div>)}

      {tab === 'activity' && (movements.length === 0
        ? <div className="card muted">No stock movements recorded yet.</div>
        : <div style={{overflowX: 'auto'}}><table className="table">
            <thead><tr><th>When</th><th>Type</th><th className="num">Qty</th><th className="num">Before</th><th className="num">After</th><th>Reason</th><th>By</th></tr></thead>
            <tbody>{movements.map(m => <tr key={m.id}>
              <td className="muted">{new Date(m.createdAt).toLocaleString('en-GB')}</td>
              <td><span className="badge">{m.type}</span></td>
              <td className="num">{m.quantity}</td>
              <td className="num">{m.previousQty}</td>
              <td className="num">{m.newQty}</td>
              <td>{m.reason}</td>
              <td>{m.actor}</td>
            </tr>)}</tbody>
          </table></div>)}

      {tab === 'ai' && (p.ai
        ? <div className="card">
            <div className="row"><h3 style={{margin: 0}}>AI suggestions kept with this product</h3>
              <span className="badge">{p.ai.approvedBy ? `approved by ${p.ai.approvedBy}` : 'not approved'}</span></div>
            <div className="muted" style={{fontSize: 13, margin: '8px 0 14px'}}>
              Model {p.ai.modelUsed} · {new Date(p.ai.analysedAt).toLocaleString('en-GB')}.
              These are kept apart from the confirmed product record.
            </div>
            <div className="stack">{p.ai.suggestions.map(sg => {
              const band = confidenceBand(sg.confidence);
              return <div className="ai-row" key={sg.field}>
                <div><div className="muted" style={{fontSize: 12}}>{FIELD_LABELS[sg.field] ?? sg.field}</div><b>{sg.value}</b></div>
                <span className={'badge ' + (band.tone === 'good' ? 'good' : band.tone === 'warn' ? 'warn' : 'low')}>{sg.confidence}% · {band.label}</span>
              </div>;
            })}</div>
          </div>
        : <div className="card muted">No AI analysis was run for this product.</div>)}
    </div>

    <div className="label-sheet">
      <div className="label-title">{state.settings.company} — {p.title}</div>
      <QRCodeSVG value={p.barcode} size={150}/>
      <div className="label-meta">
        <div><b>SKU:</b> {p.sku}</div>
        <div><b>Location:</b> {locationOf(p)}</div>
        <div><b>Condition:</b> {p.condition}</div>
      </div>
    </div>

    {dialog === 'in' && session && <StockInDialog session={session} onClose={() => setDialog(null)} onSaved={m => { setDialog(null); setToast(m); }}/>}
    {dialog === 'out' && session && <StockOutDialog product={p} session={session} onClose={() => setDialog(null)} onSaved={m => { setDialog(null); setToast(m); }}/>}
    {dialog === 'move' && session && <MoveStockDialog product={p} session={session} onClose={() => setDialog(null)} onSaved={m => { setDialog(null); setToast(m); }}/>}
    {toast && <Toast message={toast} onDone={() => setToast('')}/>}
  </div>;
}
