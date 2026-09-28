'use client';

import {useEffect, useState} from 'react';
import {useSession} from '@/lib/useSession';
import {can, ROLE_LABELS} from '@/lib/auth';
import {loadStaff, saveStaff, complianceIssues, daysUntil, rtwTone, type StaffMember, type RtwStatus} from '@/lib/hr';
import {downloadCsv} from '@/lib/csv';
import Tabs from '@/components/Tabs';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';

type Tab = 'staff' | 'rtw' | 'training' | 'issues';

const RTW_STATUSES: RtwStatus[] = ['Verified', 'Pending', 'Expiring soon', 'Expired'];

export default function HrPage() {
  const {session} = useSession();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [tab, setTab] = useState<Tab>('staff');
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => { setStaff(loadStaff()); }, []);

  const manage = can(session, 'hr.manage');
  const issues = complianceIssues(staff);
  const high = issues.filter(i => i.severity === 'high');

  function update(next: StaffMember) {
    const list = staff.map(s => s.id === next.id ? next : s);
    setStaff(list);
    saveStaff(list);
    setEditing(null);
    setToast(`${next.name} updated`);
  }

  return <div className="page">
    <div className="top">
      <div>
        <div className="eyebrow">People &amp; paperwork</div>
        <div className="title">HR &amp; Compliance</div>
        <div className="muted">Who works here, their right to work, and training that is running out</div>
      </div>
      <button className="btn secondary" type="button" onClick={() => downloadCsv('hizli-staff-compliance.csv', staff.map(s => ({
        Name: s.name, Username: s.username, Role: ROLE_LABELS[s.role], JobTitle: s.jobTitle,
        Started: s.startedAt, RightToWork: s.rightToWork.status,
        Document: s.rightToWork.documentType, Checked: s.rightToWork.checkedAt ?? '',
        Expires: s.rightToWork.expiresAt ?? '',
        Training: s.training.map(t => `${t.name}:${t.completedAt ?? 'not done'}`).join(' | ')
      })))}>Export CSV</button>
    </div>

    <div className="tiles stagger" style={{marginBottom: 22}}>
      <div className="tile"><div className="tile-icon tone-blue">◫</div><div>
        <div className="tile-label">Staff on record</div><div className="metric">{staff.length}</div>
        <div className="tile-sub">{staff.filter(s => s.rightToWork.status === 'Verified').length} fully verified</div></div></div>
      <div className="tile"><div className="tile-icon tone-red">⚠</div><div>
        <div className="tile-label">Needs attention now</div><div className="metric">{high.length}</div>
        <div className="tile-sub">{issues.length - high.length} coming up in the next 30 days</div></div></div>
      <div className="tile"><div className="tile-icon tone-amber">◷</div><div>
        <div className="tile-label">Training gaps</div>
        <div className="metric">{staff.reduce((t, s) => t + s.training.filter(x => !x.completedAt).length, 0)}</div>
        <div className="tile-sub">courses not yet completed</div></div></div>
    </div>

    <Tabs<Tab> active={tab} onChange={setTab} tabs={[
      {key: 'staff', label: 'Staff', count: staff.length},
      {key: 'rtw', label: 'Right to work'},
      {key: 'training', label: 'Training'},
      {key: 'issues', label: 'Action list', count: issues.length}
    ]}/>

    {tab === 'staff' && <div className="table-wrap"><table className="table">
      <thead><tr><th>Name</th><th>Job title</th><th>Role</th><th>Started</th><th>Right to work</th><th>Emergency contact</th>{manage && <th/>}</tr></thead>
      <tbody>{staff.map(s => <tr key={s.id}>
        <td><b>{s.name}</b><div className="muted" style={{fontSize: 11}}>{s.username}</div></td>
        <td>{s.jobTitle}</td>
        <td><span className="badge">{ROLE_LABELS[s.role]}</span></td>
        <td className="muted">{new Date(s.startedAt).toLocaleDateString('en-GB')}</td>
        <td><span className={'badge ' + rtwTone(s.rightToWork.status)}>{s.rightToWork.status}</span></td>
        <td className="muted">{s.emergencyContact || '—'}</td>
        {manage && <td className="row-actions"><button className="link-btn" type="button" onClick={() => setEditing(s)}>Edit</button></td>}
      </tr>)}</tbody>
    </table></div>}

    {tab === 'rtw' && <div className="table-wrap"><table className="table">
      <thead><tr><th>Name</th><th>Status</th><th>Document</th><th>Checked</th><th>Expires</th><th className="num">Days left</th></tr></thead>
      <tbody>{staff.map(s => {
        const days = daysUntil(s.rightToWork.expiresAt);
        return <tr key={s.id}>
          <td><b>{s.name}</b></td>
          <td><span className={'badge ' + rtwTone(s.rightToWork.status)}>{s.rightToWork.status}</span></td>
          <td>{s.rightToWork.documentType}</td>
          <td className="muted">{s.rightToWork.checkedAt ? new Date(s.rightToWork.checkedAt).toLocaleDateString('en-GB') : '—'}</td>
          <td className="muted">{s.rightToWork.expiresAt ? new Date(s.rightToWork.expiresAt).toLocaleDateString('en-GB') : 'no expiry'}</td>
          <td className="num">{days === null ? '—' : <span className={days <= 30 ? 'neg' : ''}>{days}</span>}</td>
        </tr>;
      })}</tbody>
    </table></div>}

    {tab === 'training' && <div className="table-wrap"><table className="table">
      <thead><tr><th>Name</th><th>Course</th><th>Completed</th><th>Expires</th><th>Status</th></tr></thead>
      <tbody>{staff.flatMap(s => s.training.map(t => {
        const days = daysUntil(t.expiresAt);
        const status = !t.completedAt ? 'Not completed'
          : days !== null && days < 0 ? 'Expired'
          : days !== null && days <= 30 ? 'Expiring soon' : 'Valid';
        return <tr key={s.id + t.name}>
          <td><b>{s.name}</b></td>
          <td>{t.name}</td>
          <td className="muted">{t.completedAt ? new Date(t.completedAt).toLocaleDateString('en-GB') : '—'}</td>
          <td className="muted">{t.expiresAt ? new Date(t.expiresAt).toLocaleDateString('en-GB') : '—'}</td>
          <td><span className={'badge ' + (status === 'Valid' ? 'good' : status === 'Expired' ? 'low' : 'warn')}>{status}</span></td>
        </tr>;
      }))}</tbody>
    </table></div>}

    {tab === 'issues' && (issues.length === 0
      ? <div className="card muted">Nothing outstanding. Every right-to-work check and training record is in date.</div>
      : <div className="stack">{issues.map((i, ix) => <div className="card" key={ix}>
          <div className="row">
            <div><b>{i.staff.name}</b> <span className="muted">· {i.staff.jobTitle}</span>
              <div style={{marginTop: 4}}>{i.what}</div></div>
            <span className={'badge ' + (i.severity === 'high' ? 'low' : 'warn')}>{i.severity === 'high' ? 'Act now' : 'Within 30 days'}</span>
          </div>
        </div>)}</div>)}

    <div className="muted" style={{fontSize: 12, marginTop: 18}}>
      Right-to-work checks are a legal duty for UK employers. This screen tracks them; it is not legal
      advice, and the records live in this browser until the database is connected.
    </div>

    {editing && <EditStaffDialog staff={editing} onClose={() => setEditing(null)} onSave={update}/>}
    {toast && <Toast message={toast} onDone={() => setToast('')}/>}
  </div>;
}

function EditStaffDialog({staff, onClose, onSave}: {
  staff: StaffMember; onClose: () => void; onSave: (s: StaffMember) => void;
}) {
  const [form, setForm] = useState<StaffMember>(staff);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSave(form);
  }

  return <Modal title={`Edit — ${staff.name}`} onClose={onClose}>
    <form className="stack" onSubmit={submit}>
      <div className="form-grid">
        <label className="field" htmlFor="hr-title">Job title
          <input id="hr-title" className="input" value={form.jobTitle} onChange={e => setForm(f => ({...f, jobTitle: e.target.value}))}/>
        </label>
        <label className="field" htmlFor="hr-started">Start date
          <input id="hr-started" className="input" type="date" value={form.startedAt} onChange={e => setForm(f => ({...f, startedAt: e.target.value}))}/>
        </label>
      </div>
      <div className="form-grid">
        <label className="field" htmlFor="hr-rtw">Right to work
          <select id="hr-rtw" className="input" value={form.rightToWork.status}
            onChange={e => setForm(f => ({...f, rightToWork: {...f.rightToWork, status: e.target.value as RtwStatus}}))}>
            {RTW_STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label className="field" htmlFor="hr-doc">Document
          <input id="hr-doc" className="input" value={form.rightToWork.documentType}
            onChange={e => setForm(f => ({...f, rightToWork: {...f.rightToWork, documentType: e.target.value}}))}/>
        </label>
      </div>
      <div className="form-grid">
        <label className="field" htmlFor="hr-checked">Checked on
          <input id="hr-checked" className="input" type="date" value={form.rightToWork.checkedAt ?? ''}
            onChange={e => setForm(f => ({...f, rightToWork: {...f.rightToWork, checkedAt: e.target.value || null}}))}/>
        </label>
        <label className="field" htmlFor="hr-expires">Expires
          <input id="hr-expires" className="input" type="date" value={form.rightToWork.expiresAt ?? ''}
            onChange={e => setForm(f => ({...f, rightToWork: {...f.rightToWork, expiresAt: e.target.value || null}}))}/>
        </label>
      </div>
      <label className="field" htmlFor="hr-contact">Emergency contact
        <input id="hr-contact" className="input" value={form.emergencyContact} onChange={e => setForm(f => ({...f, emergencyContact: e.target.value}))}/>
      </label>
      <label className="field" htmlFor="hr-notes">Notes
        <input id="hr-notes" className="input" value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))}/>
      </label>

      <div className="label" style={{marginTop: 4}}>Training</div>
      <div className="stack">{form.training.map((t, ix) => <div className="form-grid" key={t.name}>
        <label className="field" htmlFor={'tr-c-' + ix}>{t.name} — completed
          <input id={'tr-c-' + ix} className="input" type="date" value={t.completedAt ?? ''}
            onChange={e => setForm(f => ({...f, training: f.training.map((x, i) => i === ix ? {...x, completedAt: e.target.value || null} : x)}))}/>
        </label>
        <label className="field" htmlFor={'tr-e-' + ix}>Expires
          <input id={'tr-e-' + ix} className="input" type="date" value={t.expiresAt ?? ''}
            onChange={e => setForm(f => ({...f, training: f.training.map((x, i) => i === ix ? {...x, expiresAt: e.target.value || null} : x)}))}/>
        </label>
      </div>)}</div>

      <div className="row" style={{justifyContent: 'flex-end', gap: 10}}>
        <button className="btn secondary" type="button" onClick={onClose}>Cancel</button>
        <button className="btn" type="submit">Save</button>
      </div>
    </form>
  </Modal>;
}
