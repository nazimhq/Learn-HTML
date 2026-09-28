'use client';

import Link from 'next/link';
import Modal from './Modal';
import type {Notification} from '@/lib/types';

const TONE: Record<string, string> = {
  out_of_stock: 'low', low_stock: 'warn', needs_testing: 'warn',
  awaiting_dispatch: 'badge', large_adjustment: 'warn', duplicate: 'warn'
};

export default function NotificationsPanel({alerts, onClose}: {alerts: Notification[]; onClose: () => void}) {
  return <Modal title="Notifications" onClose={onClose}>
    {alerts.length === 0
      ? <div className="muted">Nothing needs attention right now.</div>
      : <div className="stack">
          {alerts.map(a => <div className="card" key={a.id}>
            <div className="row" style={{alignItems: 'flex-start'}}>
              <div style={{minWidth: 0}}>
                <b>{a.title}</b>
                <div className="muted" style={{fontSize: 12, marginTop: 4}}>{a.detail}</div>
              </div>
              <span className={'badge ' + (TONE[a.kind] ?? '')}>{a.kind.replace(/_/g, ' ')}</span>
            </div>
            {a.href && <div style={{marginTop: 10}}>
              <Link className="link-btn" href={a.href} onClick={onClose}>Open</Link>
            </div>}
          </div>)}
        </div>}
    <div className="muted" style={{fontSize: 12, marginTop: 14}}>
      These are worked out from the current stock and orders each time you open this, so they never
      go stale.
    </div>
  </Modal>;
}
