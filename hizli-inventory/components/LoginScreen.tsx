'use client';

import {useState} from 'react';
import {signIn, ACCOUNTS} from '@/lib/auth';
import {notifySessionChange} from '@/lib/useSession';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      signIn(username, password);
      setError('');
      notifySessionChange();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function useAccount(u: string, p: string) {
    setUsername(u);
    setPassword(p);
    setError('');
  }

  return <div className="login-shell">
    <div className="login-card page">
      <div className="brand login-brand">HIZLI<span>INVENTORY</span></div>
      <p className="muted" style={{marginTop: 0}}>Sign in to manage stock.</p>

      <form onSubmit={submit} className="stack">
        <label className="field" htmlFor="username">Username
          <input id="username" className="input" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" required/>
        </label>
        <label className="field" htmlFor="password">Password
          <input id="password" className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required/>
        </label>
        {error && <div className="notice reveal" role="alert">{error}</div>}
        <button className="btn" type="submit" style={{width: '100%'}}>Sign in</button>
      </form>

      <div className="login-accounts">
        <div className="label" style={{marginBottom: 8}}>Demo accounts — tap to fill</div>
        {ACCOUNTS.map(a => <button key={a.username} type="button" className="account-row" onClick={() => useAccount(a.username, a.password)}>
          <span><b>{a.username}</b> <span className="muted">/ {a.password}</span></span>
          <span className="badge">{a.role}</span>
        </button>)}
      </div>

      <div className="notice" style={{marginTop: 16, fontSize: 13}}>
        These accounts live in the JavaScript bundle, so this screen keeps the
        app tidy — it does not secure it. Real accounts need Supabase Auth and
        the row-level security policies.
      </div>
    </div>
  </div>;
}
