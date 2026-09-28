'use client';

import {useState} from 'react';
import Modal from './Modal';
import {changePassword, type Session} from '@/lib/auth';

export default function ChangePasswordDialog({session, onClose}: {session: Session; onClose: () => void}) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      changePassword(session.username, current, next, confirm);
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return <Modal title="Change password" onClose={onClose}>
    {done
      ? <div className="stack">
          <div className="notice">Password changed for <b>{session.username}</b>. It applies in this browser only.</div>
          <div className="row" style={{justifyContent: 'flex-end'}}>
            <button className="btn" type="button" onClick={onClose}>Done</button>
          </div>
        </div>
      : <form className="stack" onSubmit={submit}>
          <label className="field" htmlFor="cp-current">Current password
            <input id="cp-current" className="input" type="password" value={current} onChange={e => setCurrent(e.target.value)} autoComplete="current-password" required/>
          </label>
          <label className="field" htmlFor="cp-new">New password
            <input id="cp-new" className="input" type="password" value={next} onChange={e => setNext(e.target.value)} autoComplete="new-password" required/>
          </label>
          <label className="field" htmlFor="cp-confirm">Repeat new password
            <input id="cp-confirm" className="input" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" required/>
          </label>
          <div className="muted" style={{fontSize: 12}}>
            At least 8 characters. The change is saved in this browser only and does not reach other
            devices — real password management needs Supabase Auth.
          </div>
          {error && <div className="notice reveal" role="alert">{error}</div>}
          <div className="row" style={{justifyContent: 'flex-end', gap: 10}}>
            <button className="btn secondary" type="button" onClick={onClose}>Cancel</button>
            <button className="btn" type="submit">Change password</button>
          </div>
        </form>}
  </Modal>;
}
