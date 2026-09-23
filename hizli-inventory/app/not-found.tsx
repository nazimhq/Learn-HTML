import Link from 'next/link';

export default function NotFound(){
  return <div className="page">
    <div className="top"><div><div className="title">Page not found</div><div className="muted">That product or page does not exist</div></div></div>
    <div className="card"><p>Check the SKU or go back to the inventory list.</p>
      <Link className="btn" href="/inventory">Back to inventory</Link>
    </div>
  </div>;
}
