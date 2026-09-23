'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useSession, notifySessionChange} from '@/lib/useSession';
import {useStore} from '@/lib/useStore';
import {signOut, can} from '@/lib/auth';
import LoginScreen from './LoginScreen';

const links = [
  ['/', 'Dashboard'],
  ['/inventory', 'Inventory'],
  ['/orders', 'Orders'],
  ['/warehouse', 'Warehouse'],
  ['/settings', 'Settings']
] as const;

export default function Shell({children}: {children: React.ReactNode}) {
  const path = usePathname();
  const {session, ready} = useSession();
  const {state} = useStore();

  // Nothing is rendered until sessionStorage has been read, so the app does not
  // flash behind the login screen on a refresh.
  if (!ready) return <div className="boot"/>;
  if (!session) return <LoginScreen/>;

  const visible = links.filter(([href]) => href !== '/settings' || can.manageSettings(session));

  return <div className="shell">
    <aside className="side">
      <div className="brand">{state.settings.company.toUpperCase()}<span>INVENTORY</span></div>
      <nav className="nav">
        {visible.map(([href, label]) => {
          const active = href === '/' ? path === '/' : path.startsWith(href);
          return <Link key={href} href={href} aria-current={active ? 'page' : undefined}>{label}</Link>;
        })}
      </nav>
      <div className="side-user">
        <div className="who">
          <div className="avatar" aria-hidden="true">{session.name.slice(0, 1)}</div>
          <div style={{minWidth: 0}}>
            <div className="who-name">{session.name}</div>
            <div className="who-role">{session.role}</div>
          </div>
        </div>
        <button className="btn secondary signout" type="button" onClick={() => { signOut(); notifySessionChange(); }}>Sign out</button>
      </div>
      <div className="footer-note">{state.settings.company} UK • MVP</div>
    </aside>
    <main className="main">{children}</main>
  </div>;
}
