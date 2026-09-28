'use client';

import {useState} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useSession, notifySessionChange} from '@/lib/useSession';
import {useStore} from '@/lib/useStore';
import {signOut, can, ROLE_LABELS, type Permission} from '@/lib/auth';
import {notifications} from '@/lib/store';
import LoginScreen from './LoginScreen';
import ChangePasswordDialog from './ChangePasswordDialog';
import NotificationsPanel from './NotificationsPanel';

type NavItem = {href: string; label: string; permission: Permission};

const NAV: NavItem[] = [
  {href: '/', label: 'Dashboard', permission: 'product.view'},
  {href: '/inventory', label: 'Inventory', permission: 'product.view'},
  {href: '/import', label: 'Import', permission: 'purchase.view'},
  {href: '/stock', label: 'Stock', permission: 'stock.receive'},
  {href: '/ecommerce', label: 'Orders', permission: 'order.view'},
  {href: '/returns', label: 'Returns', permission: 'order.view'},
  {href: '/suppliers', label: 'Suppliers', permission: 'purchase.view'},
  {href: '/hr', label: 'HR & Compliance', permission: 'hr.view'},
  {href: '/reports', label: 'Reports', permission: 'report.view'},
  {href: '/audit', label: 'Audit', permission: 'audit.view'},
  {href: '/settings', label: 'Settings', permission: 'settings.manage'}
];

function BoxMark() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d="M12 2.6 21 7v10l-9 4.4L3 17V7z" strokeLinejoin="round"/>
    <path d="M3 7l9 4.4L21 7M12 11.4V21.4" strokeLinejoin="round"/>
  </svg>;
}

function WhatsAppMark() {
  return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2m0 2a8 8 0 1 1-4.1 14.9l-.3-.2-2.5.7.7-2.4-.2-.3A8 8 0 0 1 12 4m-2.7 4c-.2 0-.5.1-.7.4s-.8.8-.8 2 .8 2.3.9 2.5c.1.2 1.6 2.6 4 3.5 1.9.8 2.3.6 2.7.6.4 0 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1l-.6-.3-1.4-.7c-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6.4 6.4 0 0 1-1.9-1.2 7 7 0 0 1-1.3-1.6c-.1-.2 0-.4.1-.5l.4-.5.3-.5v-.4l-.7-1.7c-.2-.4-.4-.4-.5-.4z"/>
  </svg>;
}

export default function Shell({children}: {children: React.ReactNode}) {
  const path = usePathname();
  const {session, ready} = useSession();
  const {state} = useStore();
  const [changingPassword, setChangingPassword] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);

  if (!ready) return <div className="boot"/>;
  if (!session) return <LoginScreen/>;

  const visible = NAV.filter(item => can(session, item.permission));
  const alerts = notifications(state);
  const s = state.settings;
  const waHref = s.whatsapp ? `https://wa.me/${s.whatsapp.replace(/\D/g, '')}` : '';

  return <div className="shell">
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/" className="brand">
          <span className="brand-mark"><BoxMark/></span>
          {s.company.split(' ')[0]}<span className="accent">{s.company.split(' ').slice(1).join(' ') || 'Inventory'}</span>
        </Link>

        <nav className="topnav">
          {visible.map(({href, label}) => {
            const active = href === '/' ? path === '/' : path.startsWith(href);
            const count = href === '/stock' ? alerts.filter(a => a.kind === 'low_stock' || a.kind === 'out_of_stock').length : 0;
            return <Link key={href} href={href} aria-current={active ? 'page' : undefined}>
              {label}{count > 0 && <span className="nav-count">{count}</span>}
            </Link>;
          })}
        </nav>

        <div className="topbar-right">
          <button className="icon-btn" type="button" onClick={() => setShowAlerts(true)}
            aria-label={`Notifications (${alerts.length})`} style={{position: 'relative'}}>
            ◉{alerts.length > 0 && <span className="nav-count" style={{position: 'absolute', top: -4, right: -6, marginLeft: 0}}>{alerts.length}</span>}
          </button>
          <div className="who-block">
            <div className="who-name">{ROLE_LABELS[session.role]}</div>
            <div className="who-links">
              <button type="button" onClick={() => setChangingPassword(true)}>Change password</button>
              <button type="button" onClick={() => { signOut(); notifySessionChange(); }}>Sign out</button>
            </div>
          </div>
          {waHref && <a className="wa-btn" href={waHref} target="_blank" rel="noopener noreferrer">
            <WhatsAppMark/><span>WhatsApp</span>
          </a>}
        </div>
      </div>
    </header>

    <div className="ticker">
      <div className="ticker-inner">
        <span>Trading as {s.legalName}</span>
        <span>{s.location}</span>
        <span>{s.openingHours}</span>
      </div>
    </div>

    <main className="main">{children}</main>

    {changingPassword && <ChangePasswordDialog session={session} onClose={() => setChangingPassword(false)}/>}
    {showAlerts && <NotificationsPanel alerts={alerts} onClose={() => setShowAlerts(false)}/>}
  </div>;
}
