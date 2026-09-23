'use client';

import {products as seedProducts} from './demo';

/* ----------------------------------------------------------------------------
   Client-side store.

   The app is deployed as a static bundle, so there is no server to talk to.
   Everything lives in this browser's localStorage. It survives reloads but is
   per-browser: it is not shared between devices and it is not a database.
   Swapping this file for Supabase queries is the Phase 1 job.
---------------------------------------------------------------------------- */

export type Role = 'admin' | 'warehouse';

export type Product = {
  id: string; sku: string; title: string; category: string; condition: string;
  location: string; physical: number; reserved: number; cost: number; price: number;
  image: string; ebay: boolean; vinted: boolean; createdAt: string;
};

export type OrderStatus = 'Picking' | 'Paid' | 'Dispatched' | 'Cancelled';

export type Order = {
  id: string; orderNumber: string; channel: string; productId: string; sku: string;
  title: string; qty: number; unitPrice: number; total: number;
  status: OrderStatus; createdAt: string;
};

export type MovementType = 'receive' | 'sale' | 'reserve' | 'release' | 'damage' | 'adjustment';

export type Movement = {
  id: string; productId: string; sku: string; type: MovementType;
  quantity: number; reason: string; actor: string; createdAt: string;
};

export type Settings = {
  company: string; skuPrefix: string; currency: string; timezone: string;
};

export type State = {
  products: Product[];
  orders: Order[];
  movements: Movement[];
  settings: Settings;
  seq: number;       // feeds the SKU sequence, like product_sku_seq in the schema
  orderSeq: number;
};

const KEY = 'hizli.inventory.v1';

export const CURRENCIES: Record<string, string> = {
  GBP: '£', USD: '$', EUR: '€', BDT: '৳'
};

export const CONDITIONS = ['Untested', 'Customer Return', 'Open Box', 'New Other', 'Brand New', 'Damaged'];

export const CHANNELS = ['eBay', 'Vinted', 'Direct', 'Shop'];

/** Two-letter code used in the middle of a SKU, e.g. HZ-AF-000124. */
function categoryCode(category: string) {
  const words = category.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1
    ? words[0][0] + words[1][0]
    : (category.replace(/[^a-z]/gi, '').slice(0, 2) || 'XX');
  return letters.toUpperCase();
}

function seed(): State {
  return {
    products: seedProducts.map(p => ({...p, createdAt: new Date().toISOString()})),
    orders: [
      {id: 'o1', orderNumber: 'HZ-ORD-1001', channel: 'eBay', productId: '1', sku: 'HZ-AF-000124', title: 'Black Dual Basket Air Fryer', qty: 1, unitPrice: 39.99, total: 39.99, status: 'Picking', createdAt: new Date().toISOString()},
      {id: 'o2', orderNumber: 'HZ-ORD-1002', channel: 'Vinted', productId: '3', sku: 'HZ-KT-000126', title: '3 Tier Black Utility Trolley', qty: 2, unitPrice: 24.99, total: 49.98, status: 'Paid', createdAt: new Date().toISOString()}
    ],
    movements: [],
    settings: {company: 'Hizli', skuPrefix: 'HZ', currency: 'GBP', timezone: 'Europe/London'},
    seq: 126,
    orderSeq: 1002
  };
}

let state: State | null = null;
const listeners = new Set<() => void>();

export function getState(): State {
  if (state) return state;
  if (typeof window === 'undefined') return seed();
  let loaded: State;
  try {
    const raw = window.localStorage.getItem(KEY);
    loaded = raw ? {...seed(), ...JSON.parse(raw) as Partial<State>} : seed();
  } catch {
    loaded = seed();
  }
  state = loaded;
  return loaded;
}

function commit(next: State) {
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch (e) {
    // Most likely the 5MB quota, usually from product photos.
    console.warn('Could not save to localStorage', e);
    throw new Error('Storage is full. Remove a product photo or reset the demo data in Settings.');
  }
  listeners.forEach(fn => fn());
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export const available = (p: Product) => p.physical - p.reserved;

export function currencySymbol(state: State) {
  return CURRENCIES[state.settings.currency] ?? state.settings.currency + ' ';
}

export function money(amount: number, s: State) {
  return currencySymbol(s) + amount.toFixed(2);
}

function movement(m: Omit<Movement, 'id' | 'createdAt'>): Movement {
  return {...m, id: 'mv-' + Math.random().toString(36).slice(2, 10), createdAt: new Date().toISOString()};
}

/* --------------------------------- actions -------------------------------- */

export type NewProduct = {
  title: string; category: string; condition: string; location: string;
  physical: number; cost: number; price: number; image: string;
  ebay: boolean; vinted: boolean;
};

export function addProduct(input: NewProduct, actor: string): Product {
  const s = getState();
  const seq = s.seq + 1;
  const sku = `${s.settings.skuPrefix}-${categoryCode(input.category)}-${String(seq).padStart(6, '0')}`;
  const product: Product = {
    id: 'p-' + seq,
    sku,
    title: input.title.trim(),
    category: input.category.trim(),
    condition: input.condition,
    location: input.location.trim().toUpperCase(),
    physical: input.physical,
    reserved: 0,
    cost: input.cost,
    price: input.price,
    image: input.image,
    ebay: input.ebay,
    vinted: input.vinted,
    createdAt: new Date().toISOString()
  };
  commit({
    ...s,
    seq,
    products: [product, ...s.products],
    movements: [movement({productId: product.id, sku, type: 'receive', quantity: input.physical, reason: 'Initial stock', actor}), ...s.movements]
  });
  return product;
}

export function deleteProduct(id: string, actor: string) {
  const s = getState();
  const p = s.products.find(x => x.id === id);
  if (!p) throw new Error('Product not found');
  if (s.orders.some(o => o.productId === id && (o.status === 'Picking' || o.status === 'Paid'))) {
    throw new Error('This product is on an open order. Dispatch or cancel that order first.');
  }
  commit({
    ...s,
    products: s.products.filter(x => x.id !== id),
    movements: [movement({productId: id, sku: p.sku, type: 'adjustment', quantity: p.physical, reason: 'Product removed', actor}), ...s.movements]
  });
}

/** Mirrors reserve_stock + dispatch_reserved_stock from supabase/schema.sql. */
export function quickSale(
  input: {productId: string; qty: number; channel: string; unitPrice: number},
  actor: string
): Order {
  const s = getState();
  const p = s.products.find(x => x.id === input.productId);
  if (!p) throw new Error('Product not found');
  if (input.qty <= 0) throw new Error('Quantity must be positive');
  if (available(p) < input.qty) {
    throw new Error(`Only ${available(p)} available for ${p.sku}. Reduce the quantity or receive more stock first.`);
  }

  const orderSeq = s.orderSeq + 1;
  const order: Order = {
    id: 'o-' + orderSeq,
    orderNumber: `${s.settings.skuPrefix}-ORD-${orderSeq}`,
    channel: input.channel,
    productId: p.id,
    sku: p.sku,
    title: p.title,
    qty: input.qty,
    unitPrice: input.unitPrice,
    total: Number((input.unitPrice * input.qty).toFixed(2)),
    status: 'Picking',
    createdAt: new Date().toISOString()
  };

  commit({
    ...s,
    orderSeq,
    orders: [order, ...s.orders],
    products: s.products.map(x => x.id === p.id ? {...x, reserved: x.reserved + input.qty} : x),
    movements: [movement({productId: p.id, sku: p.sku, type: 'reserve', quantity: input.qty, reason: `Reserved for ${order.orderNumber}`, actor}), ...s.movements]
  });
  return order;
}

export function setOrderStatus(orderId: string, status: OrderStatus, actor: string) {
  const s = getState();
  const order = s.orders.find(o => o.id === orderId);
  if (!order) throw new Error('Order not found');
  if (order.status === status) return;

  let products = s.products;
  let extra: Movement[] = [];
  const wasHolding = order.status === 'Picking' || order.status === 'Paid';

  if (status === 'Dispatched' && wasHolding) {
    // physical and reserved both come down, as dispatch_reserved_stock does
    products = products.map(p => p.id === order.productId
      ? {...p, physical: Math.max(0, p.physical - order.qty), reserved: Math.max(0, p.reserved - order.qty)}
      : p);
    extra = [movement({productId: order.productId, sku: order.sku, type: 'sale', quantity: order.qty, reason: `Dispatched ${order.orderNumber}`, actor})];
  } else if (status === 'Cancelled' && wasHolding) {
    products = products.map(p => p.id === order.productId
      ? {...p, reserved: Math.max(0, p.reserved - order.qty)}
      : p);
    extra = [movement({productId: order.productId, sku: order.sku, type: 'release', quantity: order.qty, reason: `Cancelled ${order.orderNumber}`, actor})];
  }

  commit({
    ...s,
    products,
    orders: s.orders.map(o => o.id === orderId ? {...o, status} : o),
    movements: [...extra, ...s.movements]
  });
}

export function adjustStock(
  input: {productId: string; type: 'receive' | 'damage' | 'adjustment'; qty: number; reason: string},
  actor: string
) {
  const s = getState();
  const p = s.products.find(x => x.id === input.productId);
  if (!p) throw new Error('Product not found');
  if (input.qty <= 0) throw new Error('Quantity must be positive');
  if (input.reason.trim().length < 2) throw new Error('Give a reason for the adjustment');

  let physical = p.physical;
  if (input.type === 'receive') physical += input.qty;
  else physical -= input.qty;

  if (physical < 0) throw new Error(`${p.sku} only has ${p.physical} in stock`);
  if (physical < p.reserved) {
    throw new Error(`${p.reserved} unit(s) are reserved for open orders, so stock cannot drop below that.`);
  }

  commit({
    ...s,
    products: s.products.map(x => x.id === p.id ? {...x, physical} : x),
    movements: [movement({productId: p.id, sku: p.sku, type: input.type, quantity: input.qty, reason: input.reason.trim(), actor}), ...s.movements]
  });
}

export function saveSettings(settings: Settings) {
  const s = getState();
  if (!settings.company.trim()) throw new Error('Company name cannot be empty');
  if (!/^[A-Za-z0-9]{1,6}$/.test(settings.skuPrefix)) throw new Error('SKU prefix must be 1-6 letters or digits');
  commit({...s, settings: {...settings, skuPrefix: settings.skuPrefix.toUpperCase()}});
}

export function resetDemoData() {
  commit(seed());
}
