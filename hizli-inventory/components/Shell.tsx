'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useSession, notifySessionChange} from '@/lib/useSession';
import {useStore} from '@/lib/useStore';
import {signOut, can, ROLE_LABELS, type Permission} from '@/lib/auth';
import {lowStock, outOfStock} from '@/lib/sales';
import LoginScreen from './LoginScreen';

type NavItem = {href: string; label: string; permission: Permission};

const NAV: NavItem[] = [
  {href: '/', label: 'Dashboard', permission: 'product.view'},
  {href: '/inventory', label: 'Inventory', permission: 'product.view'},
  {href: '/stock', label: 'Stock', permission: 'stock.receive'},
  {href: '/ecommerce', label: 'E-Commerce', permission: 'order.view'},
  {href: '/suppliers', label: 'Suppliers', permission: 'purchase.view'},
  {href: '/reports', label: 'Reports', permission: 'report.view'},
  {href: '/audit', label: 'Audit log', permission: 'audit.view'},
  {href: '/settings', label: 'Settings', permission: 'settings.manage'}
];

export default function Shell({children}: {children: React.ReactNode}) {
  const path = usePathname();
  const {session, ready} = useSession();
  const {state} = useStore();

  if (!ready) return <div className="boot"/>;
  if (!session) return <LoginScreen/>;

  const visible = NAV.filter(item => can(session, item.permission));
  const alerts = lowStock(state).length + outOfStock(state).length;

  return <div className="shell">
    <aside className="side">
      <div className="brand">{state.settings.company.toUpperCase()}<span>INVENTORY</span></div>
      <nav className="nav">
        {visible.map(({href, label}) => {
          const active = href === '/' ? path === '/' : path.startsWith(href);
          return <Link key={href} href={href} aria-current={active ? 'page' : undefined}>
            {label}
            {href === '/inventory' && alerts > 0 && <span className="nav-count" title="Low or out of stock">{alerts}</span>}
          </Link>;
        })}
      </nav>
      <div className="side-user">
        <div className="who">
          <div className="avatar" aria-hidden="true">{session.name.slice(0, 1)}</div>
          <div style={{minWidth: 0}}>
            <div className="who-name">{session.name}</div>
            <div className="who-role">{ROLE_LABELS[session.role]}</div>
          </div>
        </div>
        <button className="btn secondary signout" type="button" onClick={() => { signOut(); notifySessionChange(); }}>Sign out</button>
      </div>
      <div className="footer-note">{state.settings.company} UK • MVP</div>
    </aside>
    <main className="main">{children}</main>
  </div>;
}
