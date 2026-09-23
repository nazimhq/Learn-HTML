'use client';

import type {Role} from './store';

/* ----------------------------------------------------------------------------
   Sign-in for the static build.

   This is a UI gate, not security. The account list ships inside the JavaScript
   bundle, so anyone who opens devtools can read it and walk straight past this
   screen. It exists so the app has roles and an audit actor, and so a shared
   warehouse tablet does not sit on the Settings page.

   Real auth needs a server: Supabase Auth plus the RLS policies, with the
   profiles.role column in supabase/schema.sql driving permissions.
---------------------------------------------------------------------------- */

export type Account = {username: string; password: string; name: string; role: Role};

export const ACCOUNTS: Account[] = [
  {username: 'admin', password: 'Hizli@2026', name: 'Hizli Admin', role: 'admin'},
  {username: 'warehouse', password: 'Store@2026', name: 'Warehouse Staff', role: 'warehouse'}
];

export type Session = {username: string; name: string; role: Role};

const KEY = 'hizli.session.v1';

export function currentSession(): Session | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) as Session : null;
  } catch {
    return null;
  }
}

export function signIn(username: string, password: string): Session {
  const found = ACCOUNTS.find(a =>
    a.username.toLowerCase() === username.trim().toLowerCase() && a.password === password
  );
  if (!found) throw new Error('Wrong username or password');
  const session: Session = {username: found.username, name: found.name, role: found.role};
  try { window.sessionStorage.setItem(KEY, JSON.stringify(session)); } catch {}
  return session;
}

export function signOut() {
  try { window.sessionStorage.removeItem(KEY); } catch {}
}

/** Only an admin gets Settings, Quick Sale and product deletion. */
export const can = {
  manageSettings: (s: Session | null) => s?.role === 'admin',
  sell: (s: Session | null) => s?.role === 'admin',
  deleteProduct: (s: Session | null) => s?.role === 'admin',
  addProduct: (s: Session | null) => !!s,
  adjustStock: (s: Session | null) => !!s
};
