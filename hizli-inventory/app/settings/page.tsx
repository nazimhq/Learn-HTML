'use client';

import {useEffect, useState} from 'react';
import {useStore} from '@/lib/useStore';
import {useSession} from '@/lib/useSession';
import {saveSettings, resetDemoData, CURRENCIES, type Settings} from '@/lib/store';
import {can, ACCOUNTS} from '@/lib/auth';
import Toast from '@/components/Toast';

export default function SettingsPage() {
  const {state, ready} = useStore();
  const {session} = useSession();
  const [form, setForm] = useState<Settings>(state.settings);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => { if (ready) setForm(state.settings); }, [ready, state.settings]);

  if (!can.manageSettings(session)) {
    return <div className="page">
      <div className="top"><div><div className="title">Settings</div></div></div>
      <div className="notice">Only an admin can change company settings. You are signed in as <b>{session?.role}</b>.</div>
    </div>;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      saveSettings(form);
      setError('');
      setToast('Settings saved');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const set = (k: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({...f, [k]: e.target.value}));

  return <div className="page">
    <div className="top"><div><div className="title">Settings</div><div className="muted">Company &amp; integration configuration</div></div></div>

    <div className="split stagger">
      <form className="card stack" onSubmit={submit}>
        <h3 style={{marginTop: 0}}>Company</h3>
        <label className="field" htmlFor="company">Company name
          <input id="company" className="input" value={form.company} onChange={set('company')}/>
        </label>
        <label className="field" htmlFor="prefix">SKU prefix
          <input id="prefix" className="input" value={form.skuPrefix} onChange={set('skuPrefix')} maxLength={6}/>
        </label>
        <label className="field" htmlFor="currency">Currency
          <select id="currency" className="input" value={form.currency} onChange={set('currency')}>
            {Object.keys(CURRENCIES).map(c => <option key={c} value={c}>{c} ({CURRENCIES[c]})</option>)}
          </select>
        </label>
        <label className="field" htmlFor="timezone">Timezone
          <input id="timezone" className="input" value={form.timezone} onChange={set('timezone')}/>
        </label>
        {error && <div className="notice reveal" role="alert">{error}</div>}
        <div><button className="btn" type="submit">Save</button></div>
        <div className="muted" style={{fontSize: 13}}>
          The prefix is used for the next SKU and order number; the currency changes every price shown.
        </div>
      </form>

      <div className="stack">
        <div className="card"><h3 style={{marginTop: 0}}>Integrations</h3>
          <p>AI product analysis: configure OPENAI_API_KEY (needs the Node build).</p>
          <p>eBay: integration-ready; OAuth credentials required.</p>
          <p>Vinted: manual workflow by default; API can be added when access is available.</p>
        </div>

        <div className="card"><h3 style={{marginTop: 0}}>Accounts</h3>
          <div className="stack">
            {ACCOUNTS.map(a => <div className="row" key={a.username}>
              <span><b>{a.username}</b> <span className="muted">/ {a.password}</span></span>
              <span className="badge">{a.role}</span>
            </div>)}
          </div>
          <div className="notice" style={{marginTop: 12, fontSize: 13}}>
            Accounts are defined in <code>lib/auth.ts</code> and ship in the browser
            bundle, so the sign-in screen organises the app rather than securing it.
            Changing a password means editing that file and rebuilding.
          </div>
        </div>

        <div className="card"><h3 style={{marginTop: 0}}>Data</h3>
          <p className="muted" style={{marginTop: 0}}>
            Products, orders and movements live in this browser only. They are not
            shared with other devices and clearing site data wipes them.
          </p>
          {confirmReset
            ? <div className="stack reveal">
                <div className="notice">This removes every product, order and movement you have added and puts the three demo products back.</div>
                <div className="row" style={{justifyContent: 'flex-end', gap: 10}}>
                  <button className="btn secondary" type="button" onClick={() => setConfirmReset(false)}>Keep my data</button>
                  <button className="btn danger" type="button" onClick={() => { resetDemoData(); setConfirmReset(false); setToast('Demo data restored'); }}>Reset everything</button>
                </div>
              </div>
            : <button className="btn secondary" type="button" onClick={() => setConfirmReset(true)}>Reset demo data</button>}
        </div>
      </div>
    </div>

    {toast && <Toast message={toast} onDone={() => setToast('')}/>}
  </div>;
}
