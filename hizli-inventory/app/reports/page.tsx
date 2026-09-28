'use client';

import {useState} from 'react';
import {useStore} from '@/lib/useStore';
import {useSession} from '@/lib/useSession';
import {can} from '@/lib/auth';
import {money, available, locationOf} from '@/lib/store';
import {
  periodTotals, PERIOD_ROWS, salesByChannel, lowStock, outOfStock,
  deadStock, stockValue, retailValue, activeProducts, ordersInPeriod, type Period
} from '@/lib/sales';
import {downloadCsv} from '@/lib/csv';
import Tabs from '@/components/Tabs';

type Tab = 'sales' | 'inventory' | 'low' | 'dead' | 'movement';

export default function ReportsPage() {
  const {state} = useStore();
  const {session} = useSession();
  const [tab, setTab] = useState<Tab>('sales');
  const [period, setPeriod] = useState<Period>('thisMonth');
  const [deadDays, setDeadDays] = useState(60);

  const showProfit = can(session, 'profit.view');
  const products = activeProducts(state);
  const totals = periodTotals(state, period);
  const orders = ordersInPeriod(state.orders, period);
  const channels = salesByChannel(state, period);
  const low = lowStock(state);
  const out = outOfStock(state);
  const dead = deadStock(state, deadDays);

  function exportCurrent() {
    if (tab === 'sales') {
      downloadCsv(`hizli-sales-${period}.csv`, orders.map(o => ({
        Order: o.orderNumber, Date: o.completedAt ?? o.createdAt, Channel: o.channel,
        SKU: o.sku, Product: o.title, Qty: o.qty, UnitPrice: o.unitPrice,
        Total: (o.unitPrice * o.qty).toFixed(2), Fee: o.marketplaceFee, Shipping: o.shippingCost,
        Fulfilment: o.status
      })));
    } else if (tab === 'inventory') {
      downloadCsv('hizli-inventory.csv', products.map(p => ({
        SKU: p.sku, Product: p.title, Category: p.category, Condition: p.condition,
        Location: locationOf(p), Physical: p.physical, Reserved: p.reserved, Available: available(p),
        Cost: p.cost, TargetPrice: p.targetPrice, StockValue: (p.physical * p.cost).toFixed(2),
        eBay: p.ebayStatus, Vinted: p.vintedStatus
      })));
    } else if (tab === 'low') {
      downloadCsv('hizli-low-stock.csv', [...low, ...out].map(p => ({
        SKU: p.sku, Product: p.title, Location: locationOf(p),
        Available: available(p), Threshold: p.lowStockThreshold,
        Status: p.physical <= 0 ? 'Out of stock' : 'Low stock'
      })));
    } else if (tab === 'dead') {
      downloadCsv(`hizli-dead-stock-${deadDays}d.csv`, dead.map(p => ({
        SKU: p.sku, Product: p.title, Location: locationOf(p), Quantity: p.physical,
        StockValue: (p.physical * p.cost).toFixed(2), LastSold: p.lastSoldAt ?? 'never'
      })));
    } else {
      downloadCsv('hizli-stock-movements.csv', state.movements.map(m => ({
        When: m.createdAt, SKU: m.sku, Type: m.type, Quantity: m.quantity,
        Before: m.previousQty, After: m.newQty, Reason: m.reason, User: m.actor
      })));
    }
  }

  return <div className="page">
    <div className="top">
      <div><div className="eyebrow">Numbers</div><div className="title">Reports</div><div className="muted">Every table here exports to CSV for Excel</div></div>
      <button className="btn" type="button" onClick={exportCurrent}>Export CSV</button>
    </div>

    <Tabs<Tab> active={tab} onChange={setTab} tabs={[
      {key: 'sales', label: 'Sales'},
      {key: 'inventory', label: 'Inventory valuation'},
      {key: 'low', label: 'Low / out of stock', count: low.length + out.length},
      {key: 'dead', label: 'Dead stock', count: dead.length},
      {key: 'movement', label: 'Stock movement', count: state.movements.length}
    ]}/>

    {tab === 'sales' && <>
      <div className="toolbar">
        <select className="input" style={{maxWidth: 240}} aria-label="Period" value={period} onChange={e => setPeriod(e.target.value as Period)}>
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="last7">Last 7 days</option>
          <option value="thisMonth">This month</option>
          <option value="thisYear">This year</option>
          <option value="all">All time</option>
        </select>
      </div>

      <div className="tiles stagger" style={{marginBottom: 20}}>
        <div className="card tile"><div className="tile-icon tone-green">£</div><div>
          <div className="muted tile-label">Sales</div><div className="metric">{money(totals.sales, state)}</div>
          <div className="tile-sub">{totals.pieces} pcs · {totals.orders} orders</div></div></div>
        {showProfit && <>
          <div className="card tile"><div className="tile-icon tone-violet">◈</div><div>
            <div className="muted tile-label">Gross profit</div><div className="metric">{money(totals.profit, state)}</div>
            <div className="tile-sub">{totals.sales > 0 ? ((totals.profit / totals.sales) * 100).toFixed(1) : '0'}% margin</div></div></div>
          <div className="card tile"><div className="tile-icon tone-amber">▤</div><div>
            <div className="muted tile-label">Costs</div><div className="metric">{money(totals.cost + totals.fees + totals.shipping, state)}</div>
            <div className="tile-sub">goods {money(totals.cost, state)} · fees {money(totals.fees, state)} · post {money(totals.shipping, state)}</div></div></div>
        </>}
      </div>

      <div className="split-wide">
        <div className="card">
          <h3 style={{marginTop: 0}}>Every period</h3>
          <table className="table">
            <thead><tr><th>Time</th><th className="num">Pieces</th><th className="num">Sales</th>{showProfit && <th className="num">Profit</th>}</tr></thead>
            <tbody>{PERIOD_ROWS.map(r => {
              const t = periodTotals(state, r.key);
              return <tr key={r.key}><td><b>{r.label}</b></td><td className="num">{t.pieces}</td>
                <td className="num">{money(t.sales, state)}</td>
                {showProfit && <td className="num">{money(t.profit, state)}</td>}</tr>;
            })}</tbody>
          </table>
        </div>
        <div className="card">
          <h3 style={{marginTop: 0}}>By marketplace</h3>
          {channels.length === 0 ? <div className="muted">Nothing in this period.</div>
            : <table className="table">
                <thead><tr><th>Channel</th><th className="num">Pcs</th><th className="num">Sales</th></tr></thead>
                <tbody>{channels.map(c => <tr key={c.channel}><td><b>{c.channel}</b></td>
                  <td className="num">{c.pieces}</td><td className="num">{money(c.sales, state)}</td></tr>)}</tbody>
              </table>}
        </div>
      </div>
    </>}

    {tab === 'inventory' && <>
      <div className="tiles stagger" style={{marginBottom: 20}}>
        <div className="card tile"><div className="tile-icon tone-blue">▦</div><div>
          <div className="muted tile-label">Stock at cost</div><div className="metric">{money(stockValue(state), state)}</div>
          <div className="tile-sub">{products.reduce((t, p) => t + p.physical, 0)} units</div></div></div>
        <div className="card tile"><div className="tile-icon tone-green">↗</div><div>
          <div className="muted tile-label">Retail value</div><div className="metric">{money(retailValue(state), state)}</div>
          <div className="tile-sub">at target prices</div></div></div>
      </div>
      <div style={{overflowX: 'auto'}}><table className="table">
        <thead><tr><th>SKU</th><th>Product</th><th>Location</th><th className="num">Physical</th><th className="num">Available</th><th className="num">Cost</th><th className="num">Stock value</th></tr></thead>
        <tbody>{products.map(p => <tr key={p.id}>
          <td><b>{p.sku}</b></td><td>{p.title}</td><td>{locationOf(p)}</td>
          <td className="num">{p.physical}</td><td className="num">{available(p)}</td>
          <td className="num">{money(p.cost, state)}</td><td className="num">{money(p.physical * p.cost, state)}</td>
        </tr>)}</tbody>
      </table></div>
    </>}

    {tab === 'low' && ([...low, ...out].length === 0
      ? <div className="card muted">Nothing is low or out of stock.</div>
      : <div style={{overflowX: 'auto'}}><table className="table">
          <thead><tr><th>SKU</th><th>Product</th><th>Location</th><th className="num">Available</th><th className="num">Threshold</th><th>Status</th></tr></thead>
          <tbody>{[...out, ...low].map(p => <tr key={p.id}>
            <td><b>{p.sku}</b></td><td>{p.title}</td><td>{locationOf(p)}</td>
            <td className="num">{available(p)}</td><td className="num">{p.lowStockThreshold}</td>
            <td><span className={p.physical <= 0 ? 'badge warn' : 'badge'}>{p.physical <= 0 ? 'Out of stock' : 'Low stock'}</span></td>
          </tr>)}</tbody>
        </table></div>)}

    {tab === 'dead' && <>
      <div className="toolbar">
        <select className="input" style={{maxWidth: 240}} aria-label="Dead stock period" value={deadDays} onChange={e => setDeadDays(Number(e.target.value))}>
          <option value={30}>Not sold in 30 days</option>
          <option value={60}>Not sold in 60 days</option>
          <option value={90}>Not sold in 90 days</option>
          <option value={180}>Not sold in 180 days</option>
        </select>
      </div>
      {dead.length === 0
        ? <div className="card muted">Everything with stock has sold within {deadDays} days.</div>
        : <div style={{overflowX: 'auto'}}><table className="table">
            <thead><tr><th>Photo</th><th>SKU</th><th>Product</th><th className="num">Qty</th><th className="num">Stock value</th><th>Last sold</th></tr></thead>
            <tbody>{dead.map(p => <tr key={p.id}>
              <td><img className="thumb" src={p.image} alt=""/></td>
              <td><b>{p.sku}</b></td><td>{p.title}</td><td className="num">{p.physical}</td>
              <td className="num">{money(p.physical * p.cost, state)}</td>
              <td className="muted">{p.lastSoldAt ? new Date(p.lastSoldAt).toLocaleDateString('en-GB') : 'never'}</td>
            </tr>)}</tbody>
          </table></div>}
    </>}

    {tab === 'movement' && (state.movements.length === 0
      ? <div className="card muted">No stock movements recorded yet.</div>
      : <div style={{overflowX: 'auto'}}><table className="table">
          <thead><tr><th>When</th><th>SKU</th><th>Type</th><th className="num">Qty</th><th className="num">After</th><th>Reason</th><th>User</th></tr></thead>
          <tbody>{state.movements.slice(0, 200).map(m => <tr key={m.id}>
            <td className="muted">{new Date(m.createdAt).toLocaleString('en-GB')}</td>
            <td><b>{m.sku}</b></td><td><span className="badge">{m.type}</span></td>
            <td className="num">{m.quantity}</td><td className="num">{m.newQty}</td>
            <td>{m.reason}</td><td>{m.actor}</td>
          </tr>)}</tbody>
        </table></div>)}
  </div>;
}
