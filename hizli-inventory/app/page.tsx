'use client';

import Link from 'next/link';
import {useStore} from '@/lib/useStore';
import {useSession} from '@/lib/useSession';
import {can} from '@/lib/auth';
import {money, available, currencySymbol} from '@/lib/store';
import {
  periodTotals, PERIOD_ROWS, salesByChannel, lowStock, outOfStock,
  stockValue, retailValue, activeProducts, ordersInPeriod
} from '@/lib/sales';
import StatTile from '@/components/StatTile';

export default function Dashboard() {
  const {state} = useStore();
  const {session} = useSession();
  const showMoney = can(session, 'cost.view');
  const showProfit = can(session, 'profit.view');
  const symbol = currencySymbol(state);

  const today = periodTotals(state, 'today');
  const yesterday = periodTotals(state, 'yesterday');
  const last7 = periodTotals(state, 'last7');
  const month = periodTotals(state, 'thisMonth');
  const year = periodTotals(state, 'thisYear');

  const products = activeProducts(state);
  const units = products.reduce((t, p) => t + p.physical, 0);
  const reserved = products.reduce((t, p) => t + p.reserved, 0);
  const availableUnits = products.reduce((t, p) => t + available(p), 0);
  const damaged = products.reduce((t, p) => t + p.damaged, 0);
  const low = lowStock(state);
  const out = outOfStock(state);
  const open = state.orders.filter(o => o.status === 'Picking' || o.status === 'Paid');

  const change = yesterday.sales > 0
    ? ((today.sales - yesterday.sales) / yesterday.sales) * 100
    : null;

  const channels = salesByChannel(state, 'thisYear');
  const recentSales = ordersInPeriod(state.orders, 'thisMonth')
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
    .slice(0, 5);

  return <div className="page">
    <div className="top">
      <div><div className="title">Dashboard</div><div className="muted">{state.settings.company} — stock and sales overview</div></div>
      <div className="row" style={{gap: 10}}>
        {can(session, 'order.create') && <Link className="btn" href="/ecommerce">+ New sale</Link>}
        {can(session, 'product.create') && <Link className="btn secondary" href="/inventory">+ Add product</Link>}
      </div>
    </div>

    {(low.length > 0 || out.length > 0) && <div className="notice reveal" style={{marginBottom: 18}}>
      {low.length > 0 && <><b>{low.length} product{low.length > 1 ? 's' : ''} low on stock.</b>{' '}</>}
      {out.length > 0 && <><b>{out.length} out of stock.</b>{' '}</>}
      <Link href="/stock" className="link-btn">Open stock</Link>
    </div>}

    {/* ---- sales tiles ---- */}
    <div className="tiles stagger">
      <StatTile icon="£" tone="green" label="Today's sales" value={today.sales} prefix={symbol} decimals={2}
        sub={<>{today.pieces} pcs · {today.orders} sale{today.orders === 1 ? '' : 's'}
          {change !== null && <span className={change >= 0 ? ' delta up' : ' delta down'}>
            {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(0)}% vs yesterday
          </span>}</>}/>

      {showProfit && <StatTile icon="◈" tone="violet" label="Today's profit" value={today.profit} prefix={symbol} decimals={2}
        sub={<>This month {money(month.profit, state)}</>}/>}

      <StatTile icon="◷" tone="blue" label="Sales, last 7 days" value={last7.sales} prefix={symbol} decimals={2}
        sub={<>{last7.pieces} pcs · {last7.orders} sales</>}/>

      <StatTile icon="▤" tone="blue" label="This month's sales" value={month.sales} prefix={symbol} decimals={2}
        sub={<>{month.pieces} pcs · {month.orders} sales{showMoney && <> · cost {money(month.cost, state)}</>}</>}/>

      <StatTile icon="↗" tone="green" label={`Sales this year (${new Date().getFullYear()})`} value={year.sales} prefix={symbol} decimals={2}
        sub={<>{year.pieces} pcs · {year.orders} sales</>}/>

      <StatTile icon="◔" tone="amber" label="Open orders" value={open.length} href="/ecommerce"
        sub={<>{open.reduce((t, o) => t + o.qty, 0)} pcs awaiting delivery or collection</>}/>

      <StatTile icon="⚠" tone="red" label="Low stock" value={low.length} href="/stock"
        sub={<>{out.length} out of stock · {products.length} active products</>}/>

      {showMoney && <StatTile icon="▦" tone="violet" label="Stock value" value={stockValue(state)} prefix={symbol} decimals={2}
        sub={<>{units} units at cost · retail {money(retailValue(state), state)}</>}/>}
    </div>

    {/* ---- period table ---- */}
    <div className="split-wide" style={{marginTop: 26}}>
      <div className="card">
        <h2 style={{marginTop: 0}}>Day / week / month / year — how many pieces, how much money</h2>
        <div style={{overflowX: 'auto'}}>
          <table className="table">
            <thead>
              <tr>
                <th>Time</th>
                <th className="num">Pieces sold</th>
                <th className="num">Sales amount</th>
                {showProfit && <th className="num">Profit</th>}
              </tr>
            </thead>
            <tbody>
              {PERIOD_ROWS.map(row => {
                const t = periodTotals(state, row.key);
                return <tr key={row.key}>
                  <td><b>{row.label}</b></td>
                  <td className="num">{t.pieces}</td>
                  <td className="num">{money(t.sales, state)}</td>
                  {showProfit && <td className="num">{money(t.profit, state)}</td>}
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="stack">
        <div className="card">
          <h3 style={{marginTop: 0}}>Stock right now</h3>
          <div className="kv"><span className="muted">Physical units</span><b>{units}</b></div>
          <div className="kv"><span className="muted">Reserved</span><b>{reserved}</b></div>
          <div className="kv"><span className="muted">Available</span><b>{availableUnits}</b></div>
          <div className="kv"><span className="muted">Damaged</span><b>{damaged}</b></div>
          <div className="kv"><span className="muted">Unique products</span><b>{products.length}</b></div>
        </div>

        <div className="card">
          <h3 style={{marginTop: 0}}>Sales by marketplace (this year)</h3>
          {channels.length === 0
            ? <div className="muted">No completed sales yet.</div>
            : <div className="stack">{channels.map(c => {
                const pct = year.sales > 0 ? (c.sales / year.sales) * 100 : 0;
                return <div key={c.channel}>
                  <div className="row" style={{marginBottom: 4}}>
                    <span><b>{c.channel}</b> <span className="muted">{c.pieces} pcs</span></span>
                    <span>{money(c.sales, state)}</span>
                  </div>
                  <div className="bar"><div className="bar-fill" style={{width: Math.max(2, pct) + '%'}}/></div>
                </div>;
              })}</div>}
        </div>
      </div>
    </div>

    <h2 style={{marginTop: 26}}>Recent sales</h2>
    {recentSales.length === 0
      ? <div className="card muted">Nothing completed this month yet.</div>
      : <div style={{overflowX: 'auto'}}>
          <table className="table">
            <thead><tr><th>Order</th><th>Product</th><th>Channel</th><th className="num">Qty</th><th>Fulfilment</th><th className="num">Amount</th></tr></thead>
            <tbody>{recentSales.map(o => <tr key={o.id}>
              <td><b>{o.orderNumber}</b></td>
              <td>{o.title}</td>
              <td>{o.channel}</td>
              <td className="num">{o.qty}</td>
              <td><span className={o.status === 'Collection' ? 'badge' : 'badge good'}>{o.status}</span></td>
              <td className="num">{money(o.unitPrice * o.qty, state)}</td>
            </tr>)}</tbody>
          </table>
        </div>}

    <h2 style={{marginTop: 26}}>Recently added</h2>
    <div className="inventory stagger">{products.slice(0, 4).map(p =>
      <Link className="card product-card card-link" href={`/product/?id=${p.id}`} key={p.id}>
        <img src={p.image} alt={p.title}/>
        <div className="product-body">
          <div className="row"><strong>{p.title}</strong><span className={available(p) <= p.lowStockThreshold ? 'badge warn' : 'badge good'}>{available(p)} available</span></div>
          <div className="muted" style={{marginTop: 8}}>{p.sku}</div>
        </div>
      </Link>)}
    </div>
  </div>;
}
