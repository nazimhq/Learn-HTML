'use client';

import {ACCOUNTS} from './auth';
import type {Role} from './types';

/* ----------------------------------------------------------------------------
   HR & compliance.

   UK warehouse basics: who works here, their right-to-work check, the training
   they have done and when it expires. Stored in this browser like the rest of
   the app — see ARCHITECTURE.md for why that has to move to Supabase.
---------------------------------------------------------------------------- */

export type RtwStatus = 'Verified' | 'Pending' | 'Expiring soon' | 'Expired';

export type TrainingRecord = {
  name: string;
  completedAt: string | null;
  expiresAt: string | null;
};

export type StaffMember = {
  id: string;
  username: string;
  name: string;
  role: Role;
  jobTitle: string;
  startedAt: string;
  rightToWork: {status: RtwStatus; documentType: string; checkedAt: string | null; expiresAt: string | null};
  training: TrainingRecord[];
  emergencyContact: string;
  notes: string;
};

const KEY = 'hizli.hr.v1';

function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function seed(): StaffMember[] {
  const byUser = (u: string) => ACCOUNTS.find(a => a.username === u)!;
  return [
    {
      id: 'st1', username: 'admin', name: byUser('admin').name, role: 'admin',
      jobTitle: 'Director', startedAt: '2023-04-03',
      rightToWork: {status: 'Verified', documentType: 'British passport', checkedAt: '2023-04-01', expiresAt: null},
      training: [
        {name: 'Manual handling', completedAt: '2025-05-12', expiresAt: daysFromNow(220)},
        {name: 'Fire safety', completedAt: '2025-09-02', expiresAt: daysFromNow(330)}
      ],
      emergencyContact: '07700 900111', notes: ''
    },
    {
      id: 'st2', username: 'manager', name: byUser('manager').name, role: 'manager',
      jobTitle: 'Warehouse Manager', startedAt: '2024-01-15',
      rightToWork: {status: 'Verified', documentType: 'Share code', checkedAt: '2024-01-10', expiresAt: daysFromNow(400)},
      training: [
        {name: 'Manual handling', completedAt: '2025-03-20', expiresAt: daysFromNow(150)},
        {name: 'First aid at work', completedAt: '2024-11-08', expiresAt: daysFromNow(25)},
        {name: 'Fire safety', completedAt: '2025-06-01', expiresAt: daysFromNow(250)}
      ],
      emergencyContact: '07700 900222', notes: 'First aider on site'
    },
    {
      id: 'st3', username: 'warehouse', name: byUser('warehouse').name, role: 'warehouse',
      jobTitle: 'Warehouse Operative', startedAt: '2025-06-02',
      rightToWork: {status: 'Expiring soon', documentType: 'Share code', checkedAt: '2025-05-28', expiresAt: daysFromNow(21)},
      training: [
        {name: 'Manual handling', completedAt: '2025-06-05', expiresAt: daysFromNow(340)},
        {name: 'Fire safety', completedAt: null, expiresAt: null}
      ],
      emergencyContact: '07700 900333', notes: ''
    },
    {
      id: 'st4', username: 'listing', name: byUser('listing').name, role: 'listing',
      jobTitle: 'Listing Assistant', startedAt: '2025-09-01',
      rightToWork: {status: 'Pending', documentType: 'Share code requested', checkedAt: null, expiresAt: null},
      training: [{name: 'Fire safety', completedAt: null, expiresAt: null}],
      emergencyContact: '', notes: 'Right-to-work check outstanding — cannot work unsupervised'
    }
  ];
}

export function loadStaff(): StaffMember[] {
  if (typeof window === 'undefined') return seed();
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) as StaffMember[] : seed();
  } catch {
    return seed();
  }
}

export function saveStaff(staff: StaffMember[]) {
  try { localStorage.setItem(KEY, JSON.stringify(staff)); } catch {}
}

export function resetStaff() {
  try { localStorage.removeItem(KEY); } catch {}
}

/** Days until a date, or null when there is no date. */
export function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const then = new Date(date + 'T00:00:00').getTime();
  return Math.ceil((then - Date.now()) / 86400000);
}

export function rtwTone(status: RtwStatus) {
  return status === 'Verified' ? 'good' : status === 'Pending' ? 'warn' : status === 'Expiring soon' ? 'warn' : 'low';
}

export type ComplianceIssue = {staff: StaffMember; severity: 'high' | 'medium'; what: string};

/** Everything a UK warehouse would want flagged before an inspection. */
export function complianceIssues(staff: StaffMember[]): ComplianceIssue[] {
  const issues: ComplianceIssue[] = [];
  for (const s of staff) {
    const rtwDays = daysUntil(s.rightToWork.expiresAt);
    if (s.rightToWork.status === 'Expired') {
      issues.push({staff: s, severity: 'high', what: 'Right to work has expired'});
    } else if (s.rightToWork.status === 'Pending') {
      issues.push({staff: s, severity: 'high', what: 'Right to work not yet checked'});
    } else if (rtwDays !== null && rtwDays <= 30) {
      issues.push({staff: s, severity: 'medium', what: `Right to work expires in ${rtwDays} day${rtwDays === 1 ? '' : 's'}`});
    }
    for (const t of s.training) {
      if (!t.completedAt) {
        issues.push({staff: s, severity: 'medium', what: `${t.name} not completed`});
        continue;
      }
      const days = daysUntil(t.expiresAt);
      if (days !== null && days < 0) issues.push({staff: s, severity: 'high', what: `${t.name} expired`});
      else if (days !== null && days <= 30) issues.push({staff: s, severity: 'medium', what: `${t.name} expires in ${days} day${days === 1 ? '' : 's'}`});
    }
  }
  return issues.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'high' ? -1 : 1));
}
