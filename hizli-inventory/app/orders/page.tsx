'use client';

import {useState} from 'react';
import {useStore} from '@/lib/useStore';
import {useSession} from '@/lib/useSession';
import {setOrderStatus, money, type OrderStatus} from '@/lib/store';
import {can} from '@/lib/auth';
import QuickSaleDialog from '@/components/QuickSaleDialog';
import Toast from '@/components/Toast';

const badgeFor = (s: OrderStatus) =>
  s === 'Paid' ? 'badge good' : s === 'Dispatched' ? 'badge' : s === 'Cancelled' ? 'badge warn' : 'badge';

export default function Orders() {
  const {state} = useStore();
  const {session} = useSession();
  const [selling, setSelling] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  function move(id: string, status: OrderStatus) {
    if (!session) return;
    try {
      setOrderStatus(id, status, session.username);
      setToast(`Order marked ${status.toLowerCase()}`);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return <div className="page">
    <div className="top">
      <div><div className="title">Orders</div><div className="muted">Manual eBay/Vinted orders now; API sync later</div></div>
      {can.sell(session) && <button className="btn" type="button" onClick={() => setSelling(true)}>+ Quick Sale</button>}
    </div>

    {error && <div className="notice reveal" role="alert" style={{marginBottom: 16}}>{error}</div>}

    {state.orders.length === 0
      ? <div className="card muted">No orders yet.</div>
      : <div style={{overflowX: 'auto'}}>
          <table className="table">
            <thead><tr><th>Order</th><th>Channel</th><th>SKU</th><th>Qty</th><th>Status</th><th>Total</th><th/></tr></thead>
            <tbody>{state.orders.map(o => <tr key={o.id}>
              <td><b>{o.orderNumber}</b></td>
              <td>{o.channel}</td>
              <td>{o.sku}</td>
              <td>{o.qty}</td>
              <td><span className={badgeFor(o.status)}>{o.status}</span></td>
              <td>{money(o.total, state)}</td>
              <td className="row-actions">
                {(o.status === 'Picking' || o.status === 'Paid') && can.sell(session) && <>
                  {o.status === 'Picking' && <button className="link-btn" type="button" onClick={() => move(o.id, 'Paid')}>Mark paid</button>}
                  <button className="link-btn" type="button" onClick={() => move(o.id, 'Dispatched')}>Dispatch</button>
                  <button className="link-danger" type="button" onClick={() => move(o.id, 'Cancelled')}>Cancel</button>
                </>}
              </td>
            </tr>)}</tbody>
          </table>
        </div>}

    <div className="muted" style={{marginTop: 14, fontSize: 13}}>
      Dispatching removes the units from physical stock. Cancelling releases the reservation.
    </div>

    {selling && session && <QuickSaleDialog
      session={session}
      onClose={() => setSelling(false)}
      onSaved={n => { setSelling(false); setToast(`${n} created and stock reserved`); }}
    />}
    {toast && <Toast message={toast} onDone={() => setToast('')}/>}
  </div>;
}
