'use client';

import {useEffect, useState} from 'react';
import {useStore} from '@/lib/useStore';
import {useSession} from '@/lib/useSession';
import {saveSettings, resetDemoData, addWarehouse, CURRENCIES} from '@/lib/store';
import {can, ACCOUNTS, ROLE_LABELS} from '@/lib/auth';
import {downloadCsv} from '@/lib/csv';
import Tabs from '@/components/Tabs';
import Toast from '@/components/Toast';
import type {Settings} from '@/lib/types';

type Tab = 'company' | 'users' | 'warehouses' | 'integrations' | 'data';

export default function SettingsPage() {
  const {state, ready} = useStore();
  const {session} = useSession();
  const [tab, setTab] = useState<Tab>('company');
  const [form, setForm] = useState<Settings>(state.settings);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => { if (ready) setForm(state.settings); }, [ready, state.settings]);

  if (!can(session, 'settings.manage')) {
    return <div className="page">
      <div className="top"><div><div className="eyebrow">Configuration</div><div className="title">Settings</div></div></div>
      <div className="notice">Only an admin can change company settings. You are signed in as <b>{session ? ROLE_LABELS[session.role] : 'nobody'}</b>.</div>
    </div>;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      saveSettings(form, session!.username);
      setError('');
      setToast('Settings saved');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const set = <K extends keyof Settings>(k: K) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const raw = e.target.value;
    setForm(f => ({...f, [k]: typeof f[k] === 'number' ? Number(raw) : raw}));
  };

  return <div className="page">
    <div className="top"><div><div className="title">Settings</div><div className="muted">Company, users, integrations and data</div></div></div>

    <Tabs<Tab> active={tab} onChange={setTab} tabs={[
      {key: 'company', label: 'Company'},
      {key: 'users', label: 'Users & roles', count: ACCOUNTS.length},
      {key: 'warehouses', label: 'Warehouses', count: state.warehouses.length},
      {key: 'integrations', label: 'Integrations'},
      {key: 'data', label: 'Data'}
    ]}/>

    {tab === 'company' && <form className="card stack" onSubmit={submit} style={{maxWidth: 560}}>
      <h3 style={{marginTop: 0}}>Company</h3>
      <label className="field" htmlFor="company">Company name <span className="muted">(shown in the header)</span>
        <input id="company" className="input" value={form.company} onChange={set('company')}/></label>
      <label className="field" htmlFor="legal">Trading as / legal name
        <input id="legal" className="input" value={form.legalName} onChange={set('legalName')}/></label>
      <div className="form-grid">
        <label className="field" htmlFor="location">Location<input id="location" className="input" value={form.location} onChange={set('location')}/></label>
        <label className="field" htmlFor="hours">Opening hours<input id="hours" className="input" value={form.openingHours} onChange={set('openingHours')}/></label>
      </div>
      <label className="field" htmlFor="whatsapp">WhatsApp number <span className="muted">(international, digits only)</span>
        <input id="whatsapp" className="input" value={form.whatsapp} onChange={set('whatsapp')} placeholder="447000000000"/></label>
      <div className="form-grid">
        <label className="field" htmlFor="prefix">SKU prefix<input id="prefix" className="input" value={form.skuPrefix} onChange={set('skuPrefix')} maxLength={6}/></label>
        <label className="field" htmlFor="currency">Currency
          <select id="currency" className="input" value={form.currency} onChange={set('currency')}>
            {Object.keys(CURRENCIES).map(c => <option key={c} value={c}>{c} ({CURRENCIES[c]})</option>)}
          </select>
        </label>
      </div>
      <div className="form-grid">
        <label className="field" htmlFor="timezone">Timezone<input id="timezone" className="input" value={form.timezone} onChange={set('timezone')}/></label>
        <label className="field" htmlFor="lowstock">Default low-stock level<input id="lowstock" className="input" type="number" min="0" step="1" value={form.lowStockDefault} onChange={set('lowStockDefault')}/></label>
      </div>
      {error && <div className="notice reveal" role="alert">{error}</div>}
      <div><button className="btn" type="submit">Save</button></div>
      <div className="muted" style={{fontSize: 13}}>
        The prefix is used for the next SKU and order number; the currency changes every price shown.
      </div>
    </form>}

    {tab === 'users' && <div className="stack">
      <div className="card">
        <h3 style={{marginTop: 0}}>Accounts</h3>
        <div style={{overflowX: 'auto'}}><table className="table">
          <thead><tr><th>Username</th><th>Password</th><th>Name</th><th>Role</th></tr></thead>
          <tbody>{ACCOUNTS.map(a => <tr key={a.username}>
            <td><b>{a.username}</b></td><td className="muted">{a.password}</td><td>{a.name}</td>
            <td><span className="badge">{ROLE_LABELS[a.role]}</span></td>
          </tr>)}</tbody>
        </table></div>
        <div className="notice" style={{marginTop: 12, fontSize: 13}}>
          Accounts live in <code>lib/auth.ts</code> and ship inside the browser bundle, so the sign-in
          screen organises the app rather than securing it. Creating and disabling real users needs
          Supabase Auth and the RLS policies.
        </div>
      </div>
      <div className="card">
        <h3 style={{marginTop: 0}}>What each role can do</h3>
        <div style={{overflowX: 'auto'}}><table className="table">
          <thead><tr><th>Area</th><th>Admin</th><th>Manager</th><th>Warehouse</th><th>Listing</th></tr></thead>
          <tbody>
            <tr><td>Add / edit products</td><td>✓</td><td>✓</td><td>add only</td><td>edit only</td></tr>
            <tr><td>Receive / remove / move stock</td><td>✓</td><td>✓</td><td>✓</td><td>—</td></tr>
            <tr><td>Take a sale</td><td>✓</td><td>✓</td><td>—</td><td>—</td></tr>
            <tr><td>Confirm delivery / collection</td><td>✓</td><td>✓</td><td>✓</td><td>—</td></tr>
            <tr><td>See cost and profit</td><td>✓</td><td>✓</td><td>—</td><td>—</td></tr>
            <tr><td>Suppliers and purchases</td><td>✓</td><td>✓</td><td>—</td><td>—</td></tr>
            <tr><td>Marketplace listings</td><td>✓</td><td>✓</td><td>—</td><td>✓</td></tr>
            <tr><td>Reports</td><td>✓</td><td>✓</td><td>—</td><td>—</td></tr>
            <tr><td>Audit log</td><td>✓</td><td>—</td><td>—</td><td>—</td></tr>
            <tr><td>Settings</td><td>✓</td><td>—</td><td>—</td><td>—</td></tr>
          </tbody>
        </table></div>
      </div>
    </div>}

    {tab === 'warehouses' && <div className="split">
      <div className="card">
        <h3 style={{marginTop: 0}}>Warehouses</h3>
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Name</th><th>Address</th><th className="num">Products</th></tr></thead>
          <tbody>{state.warehouses.map(w => <tr key={w.id}>
            <td><b>{w.name}</b></td>
            <td className="muted">{w.address || '—'}</td>
            <td className="num">{state.products.filter(p => p.warehouse === w.name).length}</td>
          </tr>)}</tbody>
        </table></div>
        <div className="muted" style={{fontSize: 13, marginTop: 12}}>
          Stock is stored against a warehouse and a rack / bay / level / bin, so a second site can be
          added without changing anything else.
        </div>
      </div>
      <form className="card stack" onSubmit={e => {
        e.preventDefault();
        const f = new FormData(e.currentTarget as HTMLFormElement);
        try {
          const w = addWarehouse({name: String(f.get('wname') ?? ''), address: String(f.get('waddr') ?? '')}, session!.username);
          setError('');
          setToast(`${w.name} added`);
          (e.currentTarget as HTMLFormElement).reset();
        } catch (err) { setError((err as Error).message); }
      }}>
        <h3 style={{marginTop: 0}}>Add a warehouse</h3>
        <label className="field" htmlFor="wname">Name<input id="wname" name="wname" className="input" placeholder="Unit 4" required/></label>
        <label className="field" htmlFor="waddr">Address<input id="waddr" name="waddr" className="input"/></label>
        {error && <div className="notice reveal" role="alert">{error}</div>}
        <div><button className="btn" type="submit">Add warehouse</button></div>
      </form>
    </div>}

    {tab === 'integrations' && <div className="split">
      <form className="card stack" onSubmit={submit}>
        <h3 style={{marginTop: 0}}>AI assistant</h3>
        <label className="check"><input type="checkbox" checked={form.aiEnabled} onChange={e => setForm(f => ({...f, aiEnabled: e.target.checked}))}/> Enable AI analysis</label>
        <label className="field" htmlFor="ailimit">Daily analysis limit<input id="ailimit" className="input" type="number" min="0" step="1" value={form.aiDailyLimit} onChange={set('aiDailyLimit')}/></label>
        <div className="muted" style={{fontSize: 13}}>
          AI only runs when somebody presses <b>Analyse with AI</b> — never automatically. Usage is
          logged on the Audit page. The API key lives on the server, never in the browser.
        </div>
        {error && <div className="notice reveal" role="alert">{error}</div>}
        <div><button className="btn" type="submit">Save</button></div>
      </form>
      <div className="card">
        <h3 style={{marginTop: 0}}>Marketplaces</h3>
        <p><b>eBay</b> — the data model stores listing ID, price, status and order ID, so the official
          API can be connected later without changing the schema. SKU is the matching key.</p>
        <p><b>Vinted</b> — manual reference and status for now; the same fields work for an API later.</p>
        <p><b>Facebook / Website / Manual</b> — recorded as sales channels on every order.</p>
        <div className="notice" style={{fontSize: 13}}>
          Live marketplace sync needs a server and your seller credentials. The static build cannot
          hold either.
        </div>
      </div>
    </div>}

    {tab === 'data' && <div className="split">
      <div className="card">
        <h3 style={{marginTop: 0}}>Export</h3>
        <p className="muted" style={{marginTop: 0}}>Download everything as CSV for Excel or a backup.</p>
        <div className="stack">
          <button className="btn secondary" type="button" onClick={() => downloadCsv('hizli-products.csv', state.products.map(p => ({
            SKU: p.sku, Title: p.title, Category: p.category, Condition: p.condition,
            Rack: p.rack, Bay: p.bay, Level: p.level, Physical: p.physical, Reserved: p.reserved,
            Cost: p.cost, TargetPrice: p.targetPrice, eBay: p.ebayStatus, Vinted: p.vintedStatus
          })))}>Export products</button>
          <button className="btn secondary" type="button" onClick={() => downloadCsv('hizli-orders.csv', state.orders.map(o => ({
            Order: o.orderNumber, Date: o.createdAt, Channel: o.channel, SKU: o.sku,
            Qty: o.qty, UnitPrice: o.unitPrice, Fee: o.marketplaceFee, Shipping: o.shippingCost, Status: o.status
          })))}>Export orders</button>
          <button className="btn secondary" type="button" onClick={() => downloadCsv('hizli-movements.csv', state.movements.map(m => ({
            When: m.createdAt, SKU: m.sku, Type: m.type, Qty: m.quantity, After: m.newQty, Reason: m.reason, User: m.actor
          })))}>Export stock movements</button>
        </div>
      </div>
      <div className="card">
        <h3 style={{marginTop: 0}}>Where this data lives</h3>
        <p className="muted" style={{marginTop: 0}}>
          Products, orders, movements and settings are kept in <b>this browser only</b>. They are not
          shared with other devices or staff, and clearing site data wipes them. Connecting Supabase
          is what makes the data shared, backed up and real.
        </p>
        {confirmReset
          ? <div className="stack reveal">
              <div className="notice">This removes every product, order and movement you have added and puts the demo data back.</div>
              <div className="row" style={{justifyContent: 'flex-end', gap: 10}}>
                <button className="btn secondary" type="button" onClick={() => setConfirmReset(false)}>Keep my data</button>
                <button className="btn danger" type="button" onClick={() => { resetDemoData(); setConfirmReset(false); setToast('Demo data restored'); }}>Reset everything</button>
              </div>
            </div>
          : <button className="btn secondary" type="button" onClick={() => setConfirmReset(true)}>Reset demo data</button>}
      </div>
    </div>}

    {toast && <Toast message={toast} onDone={() => setToast('')}/>}
  </div>;
}
