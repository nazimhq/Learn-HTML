'use client';

import Link from 'next/link';
import Counter from './Counter';

/** Dashboard tile: icon, label, one figure, one sub-line. Clickable where a
 *  destination is given (spec §6). */
export default function StatTile({icon, tone = 'blue', label, value, prefix, decimals = 0, sub, href}: {
  icon: string;
  tone?: 'blue' | 'green' | 'amber' | 'red' | 'violet';
  label: string;
  value: number;
  prefix?: string;
  decimals?: number;
  sub?: React.ReactNode;
  href?: string;
}) {
  const body = <>
    <div className={'tile-icon tone-' + tone} aria-hidden="true">{icon}</div>
    <div style={{minWidth: 0}}>
      <div className="muted tile-label">{label}</div>
      <div className="metric"><Counter value={value} prefix={prefix} decimals={decimals}/></div>
      {sub && <div className="tile-sub">{sub}</div>}
    </div>
  </>;

  return href
    ? <Link className="card tile tile-link" href={href}>{body}</Link>
    : <div className="card tile">{body}</div>;
}
