'use client';

import type {Role} from './types';

/* ----------------------------------------------------------------------------
   Sign-in for the static build.

   This is a UI gate, not security: the account list ships inside the
   JavaScript bundle, so anyone who opens devtools can read it. It gives the
   app roles and an audit actor, and keeps a shared warehouse tablet off the
   cost and profit screens.

   Real auth needs a server — Supabase Auth plus the RLS policies, with
   profiles.role driving permissions.
---------------------------------------------------------------------------- */

export type Account = {username: string; password: string; name: string; role: Role};

export const ACCOUNTS: Account[] = [
  {username: 'admin', password: 'Hizli@2026', name: 'Hizli Admin', role: 'admin'},
  {username: 'manager', password: 'Manager@2026', name: 'Warehouse Manager', role: 'manager'},
  {username: 'warehouse', password: 'Store@2026', name: 'Warehouse Staff', role: 'warehouse'},
  {username: 'listing', password: 'Listing@2026', name: 'Listing Staff', role: 'listing'}
];

export type Session = {username: string; name: string; role: Role};

const KEY = 'hizli.session.v2';

export function currentSession(): Session | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) as Session : null;
  } catch {
    return null;
  }
}

/* ---------------------------- password overrides --------------------------- */

const PW_KEY = 'hizli.passwords.v1';

function readOverrides(): Record<string, string> {
  try {
    const raw = localStorage.getItem(PW_KEY);
    return raw ? JSON.parse(raw) as Record<string, string> : {};
  } catch {
    return {};
  }
}

/** The bundled password unless it has been changed in this browser. */
export function passwordFor(username: string): string {
  const overrides = readOverrides();
  return overrides[username] ?? ACCOUNTS.find(a => a.username === username)?.password ?? '';
}

export function passwordChanged(username: string): boolean {
  return Boolean(readOverrides()[username]);
}

export function changePassword(username: string, current: string, next: string, confirm: string) {
  if (passwordFor(username) !== current) throw new Error('Current password is wrong');
  if (next.length < 8) throw new Error('New password must be at least 8 characters');
  if (next === current) throw new Error('The new password is the same as the old one');
  if (next !== confirm) throw new Error('The two new passwords do not match');
  const overrides = readOverrides();
  overrides[username] = next;
  try {
    localStorage.setItem(PW_KEY, JSON.stringify(overrides));
  } catch {
    throw new Error('Could not save the new password in this browser');
  }
}

export function resetPasswords() {
  try { localStorage.removeItem(PW_KEY); } catch {}
}

export function signIn(username: string, password: string): Session {
  // a password changed in this browser wins over the bundled default
  const found = ACCOUNTS.find(a =>
    a.username.toLowerCase() === username.trim().toLowerCase() &&
    passwordFor(a.username) === password
  );
  if (!found) throw new Error('Wrong username or password');
  const session: Session = {username: found.username, name: found.name, role: found.role};
  try { window.sessionStorage.setItem(KEY, JSON.stringify(session)); } catch {}
  return session;
}

export function signOut() {
  try { window.sessionStorage.removeItem(KEY); } catch {}
}

/* -------------------------- permission matrix (§4) ------------------------- */

export type Permission =
  | 'product.view' | 'product.create' | 'product.edit' | 'product.archive'
  | 'stock.receive' | 'stock.remove' | 'stock.move'
  | 'order.view' | 'order.create' | 'order.complete' | 'order.cancel'
  | 'cost.view' | 'profit.view'
  | 'supplier.manage' | 'purchase.view'
  | 'report.view' | 'audit.view'
  | 'listing.manage' | 'ai.run'
  | 'settings.manage' | 'user.manage' | 'hr.view' | 'hr.manage';

const MATRIX: Record<Role, Permission[]> = {
  admin: [
    'product.view', 'product.create', 'product.edit', 'product.archive',
    'stock.receive', 'stock.remove', 'stock.move',
    'order.view', 'order.create', 'order.complete', 'order.cancel',
    'cost.view', 'profit.view', 'supplier.manage', 'purchase.view',
    'report.view', 'audit.view', 'listing.manage', 'ai.run',
    'settings.manage', 'user.manage', 'hr.view', 'hr.manage'
  ],
  manager: [
    'product.view', 'product.create', 'product.edit', 'product.archive',
    'stock.receive', 'stock.remove', 'stock.move',
    'order.view', 'order.create', 'order.complete', 'order.cancel',
    'cost.view', 'profit.view', 'supplier.manage', 'purchase.view',
    'report.view', 'listing.manage', 'ai.run', 'hr.view'
  ],
  // no cost, no profit — spec §45
  warehouse: [
    'product.view', 'product.create',
    'stock.receive', 'stock.remove', 'stock.move',
    'order.view', 'order.complete',
    'ai.run'
  ],
  listing: [
    'product.view', 'product.edit',
    'order.view',
    'listing.manage', 'ai.run'
  ]
};

export function can(session: Session | null, permission: Permission): boolean {
  if (!session) return false;
  return MATRIX[session.role].includes(permission);
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin', manager: 'Manager', warehouse: 'Warehouse Staff', listing: 'Listing Staff'
};
