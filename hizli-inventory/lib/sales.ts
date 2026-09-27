'use client';

import type {Order, Product, State} from './types';
import {available} from './types';

/* ----------------------------------------------------------------------------
   Sales and profit aggregation.

   A sale counts once the order is completed as Delivery or Collection —
   reserved-but-unshipped orders are not revenue yet.
---------------------------------------------------------------------------- */

export const isCompleted = (o: Order) => o.status === 'Delivery' || o.status === 'Collection';

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }

export type Period = 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'thisYear' | 'all';

export function periodRange(period: Period, ref = new Date()): {from: Date; to: Date} {
  const today = startOfDay(ref);
  const endOfToday = new Date(today); endOfToday.setDate(endOfToday.getDate() + 1);

  switch (period) {
    case 'today':
      return {from: today, to: endOfToday};
    case 'yesterday': {
      const from = new Date(today); from.setDate(from.getDate() - 1);
      return {from, to: today};
    }
    case 'last7': {
      const from = new Date(today); from.setDate(from.getDate() - 6);
      return {from, to: endOfToday};
    }
    case 'thisMonth':
      return {from: new Date(ref.getFullYear(), ref.getMonth(), 1), to: endOfToday};
    case 'thisYear':
      return {from: new Date(ref.getFullYear(), 0, 1), to: endOfToday};
    default:
      return {from: new Date(0), to: endOfToday};
  }
}

export function ordersInPeriod(orders: Order[], period: Period, ref = new Date()): Order[] {
  const {from, to} = periodRange(period, ref);
  return orders.filter(o => {
    if (!isCompleted(o)) return false;
    const at = new Date(o.completedAt ?? o.createdAt);
    return at >= from && at < to;
  });
}

export type PeriodTotals = {
  pieces: number;
  sales: number;
  orders: number;
  cost: number;
  fees: number;
  shipping: number;
  profit: number;
};

export function totalsFor(orders: Order[], products: Product[]): PeriodTotals {
  const byId = new Map(products.map(p => [p.id, p]));
  return orders.reduce<PeriodTotals>((acc, o) => {
    const unitCost = byId.get(o.productId)?.cost ?? 0;
    const cost = unitCost * o.qty;
    const sales = o.unitPrice * o.qty;
    acc.pieces += o.qty;
    acc.orders += 1;
    acc.sales += sales;
    acc.cost += cost;
    acc.fees += o.marketplaceFee;
    acc.shipping += o.shippingCost;
    acc.profit += sales - cost - o.marketplaceFee - o.shippingCost - o.otherCosts;
    return acc;
  }, {pieces: 0, sales: 0, orders: 0, cost: 0, fees: 0, shipping: 0, profit: 0});
}

export function periodTotals(state: State, period: Period, ref = new Date()): PeriodTotals {
  return totalsFor(ordersInPeriod(state.orders, period, ref), state.products);
}

export const PERIOD_ROWS: Array<{key: Period; label: string}> = [
  {key: 'today', label: 'Today'},
  {key: 'yesterday', label: 'Yesterday'},
  {key: 'last7', label: 'Last 7 days'},
  {key: 'thisMonth', label: 'This month'},
  {key: 'thisYear', label: `This year (${new Date().getFullYear()})`}
];

export function salesByChannel(state: State, period: Period = 'thisYear') {
  const orders = ordersInPeriod(state.orders, period);
  const map = new Map<string, {pieces: number; sales: number; profit: number}>();
  const byId = new Map(state.products.map(p => [p.id, p]));
  for (const o of orders) {
    const row = map.get(o.channel) ?? {pieces: 0, sales: 0, profit: 0};
    const cost = (byId.get(o.productId)?.cost ?? 0) * o.qty;
    row.pieces += o.qty;
    row.sales += o.unitPrice * o.qty;
    row.profit += o.unitPrice * o.qty - cost - o.marketplaceFee - o.shippingCost - o.otherCosts;
    map.set(o.channel, row);
  }
  return [...map.entries()]
    .map(([channel, v]) => ({channel, ...v}))
    .sort((a, b) => b.sales - a.sales);
}

export const activeProducts = (s: State) => s.products.filter(p => !p.archived);

export const inStock = (s: State) => activeProducts(s).filter(p => p.physical > 0);
export const outOfStock = (s: State) => activeProducts(s).filter(p => p.physical <= 0);
export const lowStock = (s: State) =>
  activeProducts(s).filter(p => p.physical > 0 && available(p) <= p.lowStockThreshold);

export function stockValue(s: State) {
  return activeProducts(s).reduce((t, p) => t + p.physical * p.cost, 0);
}

export function retailValue(s: State) {
  return activeProducts(s).reduce((t, p) => t + p.physical * p.targetPrice, 0);
}

/** Products with stock that have not sold within `days`. */
export function deadStock(s: State, days: number) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return activeProducts(s).filter(p => {
    if (p.physical <= 0) return false;
    const last = p.lastSoldAt ? new Date(p.lastSoldAt) : null;
    return !last || last < cutoff;
  });
}
