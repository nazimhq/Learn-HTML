'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';

const links=[['/', 'Dashboard'],['/inventory','Inventory'],['/orders','Orders'],['/warehouse','Warehouse'],['/settings','Settings']] as const;

export default function Nav(){
  const path=usePathname();
  return <nav className="nav">{links.map(([href,label])=>{
    const active=href==='/'?path==='/':path.startsWith(href);
    return <Link key={href} href={href} aria-current={active?'page':undefined}>{label}</Link>;
  })}</nav>;
}
