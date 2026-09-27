'use client';

import {useState} from 'react';
import {useStore} from '@/lib/useStore';
import {downloadCsv} from '@/lib/csv';
import Tabs from '@/components/Tabs';

type Tab = 'audit' | 'movements' | 'ai';

export default function AuditPage() {
  const {state} = useStore();
  const [tab, setTab] = useState<Tab>('audit');
  const [q, setQ] = useState('');

  const match = (s: string) => s.toLowerCase().includes(q.toLowerCase());
  const audit = state.audit.filter(a => match([a.actor, a.action, a.entityType, a.detail].join(' ')));
  const movements = state.movements.filter(m => match([m.sku, m.type, m.reason, m.actor].join(' ')));

  function exportCurrent() {
    if (tab === 'audit') {
      downloadCsv('hizli-audit-log.csv', audit.map(a => ({
        When: a.createdAt, User: a.actor, Action: a.action, Entity: a.entityType, Detail: a.detail
      })));
    } else if (tab === 'movements') {
      downloadCsv('hizli-stock-movements.csv', movements.map(m => ({
        When: m.createdAt, SKU: m.sku, Type: m.type, Quantity: m.quantity,
        Before: m.previousQty, After: m.newQty, From: m.fromLocation ?? '', To: m.toLocation ?? '',
        Reason: m.reason, User: m.actor
      })));
    } else {
      downloadCsv('hizli-ai-usage.csv', state.aiUsage.map(u => ({
        When: u.createdAt, User: u.actor, Images: u.images, Provider: u.provider
      })));
    }
  }

  return <div className="page">
    <div className="top">
      <div><div className="title">Audit log</div><div className="muted">Who changed what, and when — this list is never edited</div></div>
      <button className="btn secondary" type="button" onClick={exportCurrent}>Export CSV</button>
    </div>

    <Tabs<Tab> active={tab} onChange={setTab} tabs={[
      {key: 'audit', label: 'Actions', count: state.audit.length},
      {key: 'movements', label: 'Stock movements', count: state.movements.length},
      {key: 'ai', label: 'AI usage', count: state.aiUsage.length}
    ]}/>

    <div className="toolbar">
      <input className="input" placeholder="Search user, action, SKU, reason…" aria-label="Search log" value={q} onChange={e => setQ(e.target.value)}/>
    </div>

    {tab === 'audit' && (audit.length === 0
      ? <div className="card muted">Nothing recorded yet. Actions appear here as soon as you add stock or take a sale.</div>
      : <div style={{overflowX: 'auto'}}><table className="table">
          <thead><tr><th>When</th><th>User</th><th>Action</th><th>Entity</th><th>Detail</th></tr></thead>
          <tbody>{audit.slice(0, 200).map(a => <tr key={a.id}>
            <td className="muted">{new Date(a.createdAt).toLocaleString('en-GB')}</td>
            <td><b>{a.actor}</b></td>
            <td><span className="badge">{a.action}</span></td>
            <td>{a.entityType}</td>
            <td>{a.detail}</td>
          </tr>)}</tbody>
        </table></div>)}

    {tab === 'movements' && (movements.length === 0
      ? <div className="card muted">No stock movements yet.</div>
      : <div style={{overflowX: 'auto'}}><table className="table">
          <thead><tr><th>When</th><th>SKU</th><th>Type</th><th className="num">Qty</th><th className="num">Before</th><th className="num">After</th><th>Reason</th><th>User</th></tr></thead>
          <tbody>{movements.slice(0, 200).map(m => <tr key={m.id}>
            <td className="muted">{new Date(m.createdAt).toLocaleString('en-GB')}</td>
            <td><b>{m.sku}</b></td>
            <td><span className="badge">{m.type}</span></td>
            <td className="num">{m.quantity}</td>
            <td className="num">{m.previousQty}</td>
            <td className="num">{m.newQty}</td>
            <td>{m.reason}</td>
            <td>{m.actor}</td>
          </tr>)}</tbody>
        </table></div>)}

    {tab === 'ai' && (state.aiUsage.length === 0
      ? <div className="card muted">AI has not been run yet. It only runs when someone presses Analyse with AI.</div>
      : <div style={{overflowX: 'auto'}}><table className="table">
          <thead><tr><th>When</th><th>User</th><th className="num">Images</th><th>Provider</th></tr></thead>
          <tbody>{state.aiUsage.map(u => <tr key={u.id}>
            <td className="muted">{new Date(u.createdAt).toLocaleString('en-GB')}</td>
            <td><b>{u.actor}</b></td><td className="num">{u.images}</td><td>{u.provider}</td>
          </tr>)}</tbody>
        </table></div>)}
  </div>;
}
