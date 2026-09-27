'use client';

import {useState} from 'react';
import Link from 'next/link';
import {useStore} from '@/lib/useStore';
import {useSession} from '@/lib/useSession';
import {can} from '@/lib/auth';
import {completeOrder, cancelOrder, setOrderPaid, money} from '@/lib/store';
import {ordersInPeriod, periodTotals, salesByChannel} from '@/lib/sales';
import Tabs from '@/components/Tabs';
import NewSaleDialog from '@/components/NewSaleDialog';
import ConfirmOrderDialog from '@/components/ConfirmOrderDialog';
import Toast from '@/components/Toast';
import type {Order, OrderStatus} from '@/lib/types';

type Tab = 'orders' | 'today' | 'channels';

const badgeFor = (s: OrderStatus) =>
  s === 'Delivery' ? 'badge good'
  : s === 'Collection' ? 'badge good'
  : s === 'Cancelled' ? 'badge warn'
  : s === 'Paid' ? 'badge good'
  : 'badge';

export default function ECommercePage() {
  const {state} = useStore();
  const {session} = useSession();
  const [tab, setTab] = useState<Tab>('orders');
  const [selling, setSelling] = useState(false);
  const [confirming, setConfirming] = useState<Order | null>(null);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  const open = state.orders.filter(o => o.status === 'Picking' || o.status === 'Paid');
  const todayOrders = state.orders.filter(o => new Date(o.createdAt).toDateString() === new Date().toDateString());
  const today = periodTotals(state, 'today');
  const channels = salesByChannel(state, 'thisYear');
  const showProfit = can(session, 'profit.view');

  function act(fn: () => void, message: string) {
    try {
      fn();
      setError('');
      setToast(message);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const list = tab === 'today' ? todayOrders : state.orders;

  return <div className="page">
    <div className="top">
      <div>
        <div className="title">E-Commerce</div>
        <div className="muted">eBay, Vinted, Facebook, Website and warehouse sales in one place</div>
      </div>
      {can(session, 'order.create') && <button className="btn" type="button" onClick={() => setSelling(true)}>+ New sale</button>}
    </div>

    <div className="tiles stagger" style={{marginBottom: 20}}>
      <div className="card tile"><div className="tile-icon tone-green">£</div><div>
        <div className="muted tile-label">Today&apos;s orders</div>
        <div className="metric">{todayOrders.length}</div>
        <div className="tile-sub">{money(today.sales, state)} completed today</div>
      </div></div>
      <div className="card tile"><div className="tile-icon tone-amber">◔</div><div>
        <div className="muted tile-label">Awaiting fulfilment</div>
        <div className="metric">{open.length}</div>
        <div className="tile-sub">{open.reduce((t, o) => t + o.qty, 0)} pcs reserved</div>
      </div></div>
      <div className="card tile"><div className="tile-icon tone-blue">▤</div><div>
        <div className="muted tile-label">Orders all time</div>
        <div className="metric">{state.orders.length}</div>
        <div className="tile-sub">{state.orders.filter(o => o.status === 'Cancelled').length} cancelled</div>
      </div></div>
    </div>

    <Tabs<Tab>
      active={tab}
      onChange={setTab}
      tabs={[
        {key: 'orders', label: 'Orders', count: state.orders.length},
        {key: 'today', label: "Today's orders", count: todayOrders.length},
        {key: 'channels', label: 'By marketplace'}
      ]}
    />

    {error && <div className="notice reveal" role="alert" style={{marginBottom: 16}}>{error}</div>}

    {tab === 'channels'
      ? (channels.length === 0
          ? <div className="card muted">No completed sales yet this year.</div>
          : <div style={{overflowX: 'auto'}}>
              <table className="table">
                <thead><tr><th>Marketplace</th><th className="num">Pieces</th><th className="num">Sales</th>{showProfit && <th className="num">Profit</th>}</tr></thead>
                <tbody>{channels.map(c => <tr key={c.channel}>
                  <td><b>{c.channel}</b></td>
                  <td className="num">{c.pieces}</td>
                  <td className="num">{money(c.sales, state)}</td>
                  {showProfit && <td className="num">{money(c.profit, state)}</td>}
                </tr>)}</tbody>
              </table>
            </div>)
      : (list.length === 0
          ? <div className="card muted reveal">{tab === 'today' ? 'No orders today yet.' : 'No orders yet.'}</div>
          : <div style={{overflowX: 'auto'}}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Order</th><th>Channel</th><th>Product</th><th className="num">Qty</th>
                    <th>Status</th><th className="num">Total</th><th/>
                  </tr>
                </thead>
                <tbody>{list.map(o => {
                  const openOrder = o.status === 'Picking' || o.status === 'Paid';
                  return <tr key={o.id}>
                    <td>
                      <b>{o.orderNumber}</b>
                      {o.marketplaceOrderId && <div className="muted" style={{fontSize: 12}}>{o.marketplaceOrderId}</div>}
                    </td>
                    <td>{o.channel}</td>
                    <td>
                      <Link className="link-btn" href={`/product/?id=${o.productId}`}>{o.title}</Link>
                      <div className="muted" style={{fontSize: 12}}>{o.sku}</div>
                    </td>
                    <td className="num">{o.qty}</td>
                    <td><span className={badgeFor(o.status)}>{o.status}</span></td>
                    <td className="num">{money(o.unitPrice * o.qty, state)}</td>
                    <td className="row-actions">
                      {openOrder && can(session, 'order.complete') && <>
                        {o.status === 'Picking' && <button className="link-btn" type="button"
                          onClick={() => act(() => setOrderPaid(o.id, session!.username), `${o.orderNumber} marked paid`)}>Mark paid</button>}
                        <button className="link-btn" type="button" onClick={() => setConfirming(o)}>Confirm</button>
                      </>}
                      {openOrder && can(session, 'order.cancel') && <button className="link-danger" type="button"
                        onClick={() => act(() => cancelOrder(o.id, session!.username), `${o.orderNumber} cancelled`)}>Cancel</button>}
                    </td>
                  </tr>;
                })}</tbody>
              </table>
            </div>)}

    <div className="muted" style={{marginTop: 14, fontSize: 13}}>
      Confirming asks whether the order is a <b>Delivery</b> (going out to a customer) or a
      <b> Collection</b> (picked up from the warehouse). Either way the units leave physical stock.
      Cancelling releases the reservation instead.
    </div>

    {selling && session && <NewSaleDialog
      session={session}
      onClose={() => setSelling(false)}
      onSaved={n => { setSelling(false); setToast(`${n} created and stock reserved`); }}
    />}

    {confirming && session && <ConfirmOrderDialog
      order={confirming}
      onClose={() => setConfirming(null)}
      onConfirm={fulfilment => {
        act(() => completeOrder(confirming.id, fulfilment, session.username), `${confirming.orderNumber} confirmed as ${fulfilment}`);
        setConfirming(null);
      }}
    />}

    {toast && <Toast message={toast} onDone={() => setToast('')}/>}
  </div>;
}
