'use client';

import type {
  State, Product, Order, Movement, Supplier, PurchaseBatch, AuditEntry,
  Settings, Condition, Channel, OrderStatus, Fulfilment, MovementType, AiAnalysis
} from './types';
import {CURRENCIES, available, locationOf} from './types';

export * from './types';

/* ----------------------------------------------------------------------------
   Client-side store.

   The static build has no server, so state lives in this browser's
   localStorage. Every mutation goes through this file, which is the single
   seam to replace with Supabase queries.

   Two rules are enforced here rather than in the UI, because the UI is not the
   place to guarantee them (spec §61, §81):
     - stock never changes without a movement row and an audit entry
     - available stock never goes negative
---------------------------------------------------------------------------- */

const KEY = 'hizli.inventory.v2';

export {CURRENCIES, available, locationOf};

function now() { return new Date().toISOString(); }
function uid(p: string) { return p + '-' + Math.random().toString(36).slice(2, 10); }

function categoryCode(category: string) {
  const words = category.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1
    ? words[0][0] + words[1][0]
    : (category.replace(/[^a-z]/gi, '').slice(0, 2) || 'XX');
  return letters.toUpperCase();
}

function demoProduct(over: Partial<Product>): Product {
  const base: Product = {
    id: '', sku: '', barcode: '', title: '', internalTitle: '', description: '',
    category: '', subcategory: '', brand: '', model: '', colour: '', material: '',
    condition: 'Untested', conditionNotes: '', testStatus: 'Not Tested', completeness: 'Unknown',
    image: '', images: [],
    physical: 0, reserved: 0, damaged: 0, quarantine: 0, sold: 0, returned: 0,
    cost: 0, targetPrice: 0,
    supplierId: null, batchId: null, receivedAt: now(),
    warehouse: 'Main', rack: '', bay: '', level: '', bin: '',
    weightKg: null, dimensions: '',
    ebayListingId: '', ebayStatus: 'Not listed', ebayPrice: null,
    vintedRef: '', vintedStatus: 'Not listed', vintedPrice: null,
    lowStockThreshold: 2, notes: '', archived: false, lastSoldAt: null, ai: null,
    createdBy: 'system', createdAt: now(), updatedBy: 'system', updatedAt: now()
  };
  return {...base, ...over};
}

const IMG = {
  airfryer: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600"><rect width="900" height="600" fill="#1f2430"/><rect x="300" y="140" width="300" height="330" rx="28" fill="#2c3342" stroke="#3d4658" stroke-width="4"/><rect x="330" y="200" width="240" height="110" rx="14" fill="#11151d"/><rect x="330" y="340" width="240" height="100" rx="14" fill="#11151d"/><circle cx="450" cy="170" r="12" fill="#f5a524"/><text x="450" y="530" font-family="Inter,Arial,sans-serif" font-size="30" fill="#8b95a7" text-anchor="middle">Air Fryer</text></svg>'),
  vacuum: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600"><rect width="900" height="600" fill="#1c2733"/><rect x="420" y="120" width="60" height="280" rx="20" fill="#3d5a72"/><circle cx="450" cy="430" r="80" fill="#2c3f52" stroke="#4d6b85" stroke-width="6"/><circle cx="450" cy="430" r="34" fill="#11151d"/><rect x="405" y="90" width="90" height="46" rx="18" fill="#5b8bb0"/><text x="450" y="560" font-family="Inter,Arial,sans-serif" font-size="30" fill="#8b95a7" text-anchor="middle">Cordless Vacuum</text></svg>'),
  trolley: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600"><rect width="900" height="600" fill="#232a22"/><g fill="#39413a" stroke="#586154" stroke-width="5"><rect x="300" y="150" width="300" height="26" rx="8"/><rect x="300" y="270" width="300" height="26" rx="8"/><rect x="300" y="390" width="300" height="26" rx="8"/></g><rect x="306" y="150" width="14" height="280" fill="#586154"/><rect x="580" y="150" width="14" height="280" fill="#586154"/><circle cx="313" cy="450" r="20" fill="#11151d"/><circle cx="587" cy="450" r="20" fill="#11151d"/><text x="450" y="540" font-family="Inter,Arial,sans-serif" font-size="30" fill="#8b95a7" text-anchor="middle">3 Tier Trolley</text></svg>')
};

export const PLACEHOLDER_IMAGE =
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600"><rect width="900" height="600" fill="#eef2f6"/>' +
    '<rect x="330" y="200" width="240" height="180" rx="16" fill="#cfd8e3"/><circle cx="396" cy="258" r="22" fill="#eef2f6"/>' +
    '<path d="M348 372l72-76 54 52 40-34 78 58z" fill="#eef2f6"/>' +
    '<text x="450" y="440" font-family="Inter,Arial,sans-serif" font-size="26" fill="#8b95a7" text-anchor="middle">No photo yet</text></svg>');

/** Back-dated demo rows, so the day/week/month/year figures have something to
 *  add up on a first visit. */
function daysAgo(n: number, hour = 11) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 15, 0, 0);
  return d.toISOString();
}

function seed(): State {
  const suppliers: Supplier[] = [
    {id: 's1', name: 'Northern Returns Ltd', contactName: 'Dave Marshall', phone: '0161 555 0142', email: 'sales@northernreturns.co.uk', address: 'Unit 7, Trafford Park, Manchester', notes: 'Customer-return pallets, weekly', active: true, createdAt: daysAgo(90)},
    {id: 's2', name: 'Clearance Direct UK', contactName: 'Amira Khan', phone: '0121 555 0190', email: 'accounts@clearancedirect.uk', address: 'Aston Cross, Birmingham', notes: 'Open-box and graded stock', active: true, createdAt: daysAgo(60)}
  ];

  const batches: PurchaseBatch[] = [
    {id: 'b1', code: 'BATCH-2026-0041', supplierId: 's1', purchaseDate: daysAgo(30).slice(0, 10), invoiceRef: 'NR-88213', totalCost: 640, notes: 'Mixed small kitchen appliances pallet', createdBy: 'manager', createdAt: daysAgo(30)},
    {id: 'b2', code: 'BATCH-2026-0042', supplierId: 's2', purchaseDate: daysAgo(12).slice(0, 10), invoiceRef: 'CD-10044', totalCost: 318, notes: 'Home storage clearance', createdBy: 'manager', createdAt: daysAgo(12)}
  ];

  const products: Product[] = [
    demoProduct({
      id: '1', sku: 'HZ-AF-000124', barcode: 'HZ-AF-000124',
      title: 'Black Dual Basket Air Fryer', internalTitle: 'Air fryer dual basket black',
      description: 'Dual basket digital air fryer, customer return, untested.',
      category: 'Kitchen Appliances', subcategory: 'Air Fryer', brand: 'Unbranded', model: 'AF-8000', colour: 'Black', material: 'Plastic',
      condition: 'Customer Return', conditionNotes: 'Box opened, accessories not checked.', testStatus: 'Not Tested', completeness: 'Unknown',
      image: IMG.airfryer, images: [IMG.airfryer],
      physical: 10, reserved: 2, cost: 18, targetPrice: 39.99,
      supplierId: 's1', batchId: 'b1', receivedAt: daysAgo(30),
      rack: 'A', bay: '03', level: '01',
      ebayListingId: '145522118833', ebayStatus: 'Listed', ebayPrice: 39.99,
      vintedRef: 'VN-8812', vintedStatus: 'Listed', vintedPrice: 35,
      lowStockThreshold: 2, createdBy: 'manager', createdAt: daysAgo(30), updatedBy: 'manager', updatedAt: daysAgo(3)
    }),
    demoProduct({
      id: '2', sku: 'HZ-VC-000125', barcode: 'HZ-VC-000125',
      title: 'Cordless Vacuum Cleaner', internalTitle: 'Cordless vac grey',
      description: 'Cordless stick vacuum, open box, charger present.',
      category: 'Home Appliances', subcategory: 'Vacuum Cleaner', brand: 'Unbranded', model: 'VC-220', colour: 'Grey', material: 'Plastic',
      condition: 'Open Box', conditionNotes: 'Opened, looks unused.', testStatus: 'Tested Working', completeness: 'Complete',
      image: IMG.vacuum, images: [IMG.vacuum],
      physical: 5, reserved: 1, cost: 24, targetPrice: 54.99,
      supplierId: 's2', batchId: 'b2', receivedAt: daysAgo(12),
      rack: 'B', bay: '02', level: '02',
      ebayListingId: '145522119001', ebayStatus: 'Listed', ebayPrice: 54.99,
      vintedStatus: 'Not listed',
      lowStockThreshold: 2, createdBy: 'manager', createdAt: daysAgo(12), updatedBy: 'manager', updatedAt: daysAgo(2)
    }),
    demoProduct({
      id: '3', sku: 'HZ-KT-000126', barcode: 'HZ-KT-000126',
      title: '3 Tier Black Utility Trolley', internalTitle: 'Trolley 3 tier black',
      description: 'Three tier utility trolley on castors.',
      category: 'Home Storage', subcategory: 'Trolley', brand: 'Unbranded', model: 'UT-3', colour: 'Black', material: 'Steel',
      condition: 'New Other', conditionNotes: 'Flat packed, box tatty.', testStatus: 'Unknown', completeness: 'Complete',
      image: IMG.trolley, images: [IMG.trolley],
      physical: 14, reserved: 0, cost: 9.5, targetPrice: 24.99,
      supplierId: 's2', batchId: 'b2', receivedAt: daysAgo(12),
      rack: 'C', bay: '01', level: '01',
      ebayStatus: 'Not listed',
      vintedRef: 'VN-9004', vintedStatus: 'Listed', vintedPrice: 22,
      lowStockThreshold: 3, createdBy: 'manager', createdAt: daysAgo(12), updatedBy: 'manager', updatedAt: daysAgo(1)
    })
  ];

  // completed sales spread over the year so the period table is not empty
  const sales: Array<[string, number, number, number, Channel, Fulfilment]> = [
    ['1', 1, 39.99, 0, 'eBay', 'Delivery'],
    ['3', 2, 24.99, 1, 'Vinted', 'Delivery'],
    ['2', 1, 54.99, 3, 'eBay', 'Delivery'],
    ['3', 1, 24.99, 5, 'Warehouse', 'Collection'],
    ['1', 1, 39.99, 9, 'Facebook', 'Collection'],
    ['3', 3, 22.00, 18, 'Vinted', 'Delivery'],
    ['2', 1, 54.99, 40, 'eBay', 'Delivery'],
    ['1', 2, 37.50, 75, 'eBay', 'Delivery'],
    ['3', 4, 23.00, 140, 'Website', 'Delivery'],
    ['2', 1, 52.00, 210, 'eBay', 'Delivery']
  ];

  let orderSeq = 1000;
  const orders: Order[] = sales.map(([pid, qty, price, ago, channel, fulfilment]) => {
    const p = products.find(x => x.id === pid)!;
    orderSeq += 1;
    return {
      id: 'o-' + orderSeq,
      orderNumber: 'HZ-ORD-' + orderSeq,
      channel,
      marketplaceOrderId: channel === 'eBay' ? '07-' + (12000 + orderSeq) + '-33' : '',
      customerRef: '',
      productId: p.id, sku: p.sku, title: p.title,
      qty, unitPrice: price,
      shippingCost: fulfilment === 'Delivery' ? 3.5 : 0,
      marketplaceFee: channel === 'eBay' || channel === 'Vinted' ? Number((price * qty * 0.11).toFixed(2)) : 0,
      otherCosts: 0,
      total: Number((price * qty).toFixed(2)),
      status: fulfilment,
      fulfilment,
      notes: '',
      createdAt: daysAgo(ago, 10),
      completedAt: daysAgo(ago, 12)
    };
  });

  // two still open, so the picking workflow has something in it
  orderSeq += 1;
  orders.unshift({
    id: 'o-' + orderSeq, orderNumber: 'HZ-ORD-' + orderSeq, channel: 'eBay',
    marketplaceOrderId: '07-14822-91', customerRef: 'A. Patel',
    productId: '1', sku: 'HZ-AF-000124', title: 'Black Dual Basket Air Fryer',
    qty: 1, unitPrice: 39.99, shippingCost: 3.5, marketplaceFee: 4.4, otherCosts: 0,
    total: 39.99, status: 'Picking', fulfilment: null, notes: '',
    createdAt: daysAgo(0, 9), completedAt: null
  });
  orderSeq += 1;
  orders.unshift({
    id: 'o-' + orderSeq, orderNumber: 'HZ-ORD-' + orderSeq, channel: 'Vinted',
    marketplaceOrderId: '', customerRef: 'J. Owusu',
    productId: '3', sku: 'HZ-KT-000126', title: '3 Tier Black Utility Trolley',
    qty: 1, unitPrice: 24.99, shippingCost: 0, marketplaceFee: 2.75, otherCosts: 0,
    total: 24.99, status: 'Paid', fulfilment: null, notes: '',
    createdAt: daysAgo(0, 8), completedAt: null
  });

  // reserved counts on the demo products already reflect these two open orders
  return {
    products, orders, suppliers, batches,
    movements: [],
    audit: [],
    aiUsage: [],
    settings: {
      company: 'Hizli', skuPrefix: 'HZ', currency: 'GBP', timezone: 'Europe/London',
      lowStockDefault: 2, aiEnabled: true, aiDailyLimit: 100
    },
    seq: 126, orderSeq, batchSeq: 42
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

function persist(next: State) {
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    throw new Error('Storage is full. Remove some product photos, or reset the demo data in Settings.');
  }
  listeners.forEach(fn => fn());
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function currencySymbol(s: State = getState()) {
  return CURRENCIES[s.settings.currency] ?? s.settings.currency + ' ';
}

export function money(amount: number, s: State = getState()) {
  return currencySymbol(s) + Number(amount).toFixed(2);
}

function audit(actor: string, action: string, entityType: string, entityId: string, detail: string): AuditEntry {
  return {id: uid('au'), actor, action, entityType, entityId, detail, createdAt: now()};
}

type MovementInput = {
  product: Product; type: MovementType; quantity: number;
  previousQty: number; newQty: number; reason: string;
  actor: string; reference?: string | null;
  fromLocation?: string | null; toLocation?: string | null;
};

function movement(m: MovementInput): Movement {
  return {
    id: uid('mv'), productId: m.product.id, sku: m.product.sku, type: m.type,
    quantity: m.quantity, previousQty: m.previousQty, newQty: m.newQty,
    fromLocation: m.fromLocation ?? null, toLocation: m.toLocation ?? null,
    reason: m.reason, reference: m.reference ?? null, actor: m.actor, createdAt: now()
  };
}

/* --------------------------------- products -------------------------------- */

export type NewProduct = {
  title: string; internalTitle?: string; description?: string;
  category: string; subcategory?: string; brand?: string; model?: string;
  colour?: string; material?: string;
  condition: Condition; conditionNotes?: string;
  testStatus?: Product['testStatus']; completeness?: Product['completeness'];
  image: string; images?: string[];
  physical: number; cost: number; targetPrice: number;
  supplierId?: string | null; batchId?: string | null;
  rack: string; bay: string; level: string; bin?: string;
  lowStockThreshold?: number; notes?: string;
  ebayStatus?: Product['ebayStatus']; vintedStatus?: Product['vintedStatus'];
  ai?: AiAnalysis | null;
};

export function addProduct(input: NewProduct, actor: string): Product {
  const s = getState();
  const seq = s.seq + 1;
  const sku = `${s.settings.skuPrefix}-${categoryCode(input.subcategory || input.category)}-${String(seq).padStart(6, '0')}`;

  const product = demoProduct({
    id: 'p-' + seq,
    sku, barcode: sku,
    title: input.title.trim(),
    internalTitle: (input.internalTitle || input.title).trim(),
    description: input.description ?? '',
    category: input.category, subcategory: input.subcategory ?? '',
    brand: input.brand ?? '', model: input.model ?? '',
    colour: input.colour ?? '', material: input.material ?? '',
    condition: input.condition, conditionNotes: input.conditionNotes ?? '',
    testStatus: input.testStatus ?? 'Not Tested',
    completeness: input.completeness ?? 'Unknown',
    image: input.image, images: input.images ?? [input.image],
    physical: input.physical, cost: input.cost, targetPrice: input.targetPrice,
    supplierId: input.supplierId ?? null, batchId: input.batchId ?? null,
    receivedAt: now(),
    rack: input.rack.toUpperCase(), bay: input.bay, level: input.level, bin: input.bin ?? '',
    lowStockThreshold: input.lowStockThreshold ?? s.settings.lowStockDefault,
    notes: input.notes ?? '',
    ebayStatus: input.ebayStatus ?? 'Not listed',
    vintedStatus: input.vintedStatus ?? 'Not listed',
    ai: input.ai ?? null,
    createdBy: actor, createdAt: now(), updatedBy: actor, updatedAt: now()
  });

  persist({
    ...s,
    seq,
    products: [product, ...s.products],
    movements: [movement({
      product, type: 'receive', quantity: input.physical,
      previousQty: 0, newQty: input.physical,
      toLocation: locationOf(product), reason: 'Initial stock received', actor
    }), ...s.movements],
    audit: [audit(actor, 'product.created', 'product', product.id, `${sku} — ${product.title}`), ...s.audit]
  });
  return product;
}

export function updateProduct(id: string, patch: Partial<Product>, actor: string) {
  const s = getState();
  const p = s.products.find(x => x.id === id);
  if (!p) throw new Error('Product not found');
  // stock columns are movement-only, never a direct edit (spec §61)
  const blocked: Array<keyof Product> = ['physical', 'reserved', 'damaged', 'quarantine', 'sold', 'returned'];
  for (const key of blocked) {
    if (key in patch && patch[key] !== p[key]) {
      throw new Error('Stock quantities change through stock movements, not by editing the product.');
    }
  }
  const changed = Object.keys(patch).filter(k => (p as Record<string, unknown>)[k] !== (patch as Record<string, unknown>)[k]);
  persist({
    ...s,
    products: s.products.map(x => x.id === id ? {...x, ...patch, updatedBy: actor, updatedAt: now()} : x),
    audit: [audit(actor, 'product.updated', 'product', id, changed.join(', ') || 'no change'), ...s.audit]
  });
}

export function archiveProduct(id: string, actor: string, archived = true) {
  const s = getState();
  const p = s.products.find(x => x.id === id);
  if (!p) throw new Error('Product not found');
  if (archived && s.orders.some(o => o.productId === id && (o.status === 'Picking' || o.status === 'Paid'))) {
    throw new Error('This product is on an open order. Complete or cancel that order first.');
  }
  persist({
    ...s,
    products: s.products.map(x => x.id === id ? {...x, archived, updatedBy: actor, updatedAt: now()} : x),
    audit: [audit(actor, archived ? 'product.archived' : 'product.restored', 'product', id, p.sku), ...s.audit]
  });
}

/* ---------------------------------- stock ---------------------------------- */

export type StockInInput = {
  productId: string; qty: number; unitCost: number;
  supplierId: string | null; batchId: string | null; reason: string;
};

export function stockIn(input: StockInInput, actor: string) {
  const s = getState();
  const p = s.products.find(x => x.id === input.productId);
  if (!p) throw new Error('Product not found');
  if (!Number.isInteger(input.qty) || input.qty <= 0) throw new Error('Quantity must be a whole number above zero');
  if (input.reason.trim().length < 2) throw new Error('Give a reason for this stock receipt');

  const newQty = p.physical + input.qty;
  // weighted average cost — historical batch cost is never overwritten (spec §33)
  const cost = p.physical + input.qty > 0
    ? Number((((p.cost * p.physical) + (input.unitCost * input.qty)) / newQty).toFixed(2))
    : p.cost;

  persist({
    ...s,
    products: s.products.map(x => x.id === p.id
      ? {...x, physical: newQty, cost, supplierId: input.supplierId ?? x.supplierId, batchId: input.batchId ?? x.batchId, updatedBy: actor, updatedAt: now()}
      : x),
    movements: [movement({
      product: p, type: 'receive', quantity: input.qty,
      previousQty: p.physical, newQty, toLocation: locationOf(p),
      reason: input.reason.trim(), actor
    }), ...s.movements],
    audit: [audit(actor, 'stock.received', 'product', p.id, `${input.qty} × ${p.sku} @ ${input.unitCost}`), ...s.audit]
  });
}

export const STOCK_OUT_REASONS = ['Damaged', 'Missing', 'Supplier Return', 'Used Internally', 'Manual Correction', 'Other'] as const;
export type StockOutReason = typeof STOCK_OUT_REASONS[number];

export function stockOut(
  input: {productId: string; qty: number; reason: StockOutReason; notes: string},
  actor: string
) {
  const s = getState();
  const p = s.products.find(x => x.id === input.productId);
  if (!p) throw new Error('Product not found');
  if (!Number.isInteger(input.qty) || input.qty <= 0) throw new Error('Quantity must be a whole number above zero');
  if (input.notes.trim().length < 2) throw new Error('Add a note explaining this stock removal');

  const newQty = p.physical - input.qty;
  if (newQty < 0) throw new Error(`${p.sku} only has ${p.physical} in stock`);
  if (newQty < p.reserved) {
    throw new Error(`${p.reserved} unit(s) are reserved for open orders, so stock cannot drop below that.`);
  }

  const typeMap: Record<StockOutReason, MovementType> = {
    'Damaged': 'damage', 'Missing': 'missing', 'Supplier Return': 'supplier_return',
    'Used Internally': 'adjustment', 'Manual Correction': 'adjustment', 'Other': 'adjustment'
  };

  persist({
    ...s,
    products: s.products.map(x => x.id === p.id
      ? {...x, physical: newQty, damaged: input.reason === 'Damaged' ? x.damaged + input.qty : x.damaged, updatedBy: actor, updatedAt: now()}
      : x),
    movements: [movement({
      product: p, type: typeMap[input.reason], quantity: input.qty,
      previousQty: p.physical, newQty, fromLocation: locationOf(p),
      reason: `${input.reason} — ${input.notes.trim()}`, actor
    }), ...s.movements],
    audit: [audit(actor, 'stock.removed', 'product', p.id, `${input.qty} × ${p.sku} (${input.reason})`), ...s.audit]
  });
}

export function moveStock(
  input: {productId: string; rack: string; bay: string; level: string; bin: string; notes: string},
  actor: string
) {
  const s = getState();
  const p = s.products.find(x => x.id === input.productId);
  if (!p) throw new Error('Product not found');
  const from = locationOf(p);
  const moved = {...p, rack: input.rack.toUpperCase(), bay: input.bay, level: input.level, bin: input.bin};
  const to = locationOf(moved);
  if (from === to) throw new Error('That is the location it is already in');

  persist({
    ...s,
    products: s.products.map(x => x.id === p.id ? {...moved, updatedBy: actor, updatedAt: now()} : x),
    movements: [movement({
      product: p, type: 'move', quantity: p.physical,
      previousQty: p.physical, newQty: p.physical,
      fromLocation: from, toLocation: to,
      reason: input.notes.trim() || 'Location change', actor
    }), ...s.movements],
    audit: [audit(actor, 'stock.moved', 'product', p.id, `${p.sku}: ${from} → ${to}`), ...s.audit]
  });
}

/* ---------------------------------- orders --------------------------------- */

export type SaleInput = {
  productId: string; qty: number; channel: Channel; unitPrice: number;
  shippingCost: number; marketplaceFee: number; customerRef: string;
  marketplaceOrderId: string;
};

/** Reserves stock and opens the order — the reserve_stock half of the schema. */
export function recordSale(input: SaleInput, actor: string): Order {
  const s = getState();
  const p = s.products.find(x => x.id === input.productId);
  if (!p) throw new Error('Product not found');
  if (!Number.isInteger(input.qty) || input.qty <= 0) throw new Error('Quantity must be a whole number above zero');
  if (available(p) < input.qty) {
    throw new Error(`Only ${available(p)} available for ${p.sku}. Reduce the quantity or receive more stock first.`);
  }

  const orderSeq = s.orderSeq + 1;
  const order: Order = {
    id: 'o-' + orderSeq,
    orderNumber: `${s.settings.skuPrefix}-ORD-${orderSeq}`,
    channel: input.channel,
    marketplaceOrderId: input.marketplaceOrderId,
    customerRef: input.customerRef,
    productId: p.id, sku: p.sku, title: p.title,
    qty: input.qty, unitPrice: input.unitPrice,
    shippingCost: input.shippingCost, marketplaceFee: input.marketplaceFee, otherCosts: 0,
    total: Number((input.unitPrice * input.qty).toFixed(2)),
    status: 'Picking', fulfilment: null, notes: '',
    createdAt: now(), completedAt: null
  };

  persist({
    ...s,
    orderSeq,
    orders: [order, ...s.orders],
    products: s.products.map(x => x.id === p.id ? {...x, reserved: x.reserved + input.qty, updatedBy: actor, updatedAt: now()} : x),
    movements: [movement({
      product: p, type: 'reserve', quantity: input.qty,
      previousQty: p.reserved, newQty: p.reserved + input.qty,
      reason: `Reserved for ${order.orderNumber}`, reference: order.orderNumber, actor
    }), ...s.movements],
    audit: [audit(actor, 'order.created', 'order', order.id, `${order.orderNumber} — ${input.qty} × ${p.sku}`), ...s.audit]
  });
  return order;
}

/** Completes an order as Delivery or Collection — the dispatch half. */
export function completeOrder(orderId: string, fulfilment: Fulfilment, actor: string) {
  const s = getState();
  const order = s.orders.find(o => o.id === orderId);
  if (!order) throw new Error('Order not found');
  if (order.status === 'Cancelled') throw new Error('That order was cancelled');
  if (order.status === 'Delivery' || order.status === 'Collection') throw new Error('That order is already completed');

  const p = s.products.find(x => x.id === order.productId);
  if (!p) throw new Error('The product on this order no longer exists');
  if (p.physical < order.qty || p.reserved < order.qty) {
    throw new Error(`Stock for ${order.sku} does not cover this order. Check the stock record first.`);
  }

  persist({
    ...s,
    orders: s.orders.map(o => o.id === orderId
      ? {...o, status: fulfilment, fulfilment, completedAt: now()}
      : o),
    products: s.products.map(x => x.id === p.id
      ? {...x, physical: x.physical - order.qty, reserved: x.reserved - order.qty, sold: x.sold + order.qty, lastSoldAt: now(), updatedBy: actor, updatedAt: now()}
      : x),
    movements: [movement({
      product: p, type: 'sale', quantity: order.qty,
      previousQty: p.physical, newQty: p.physical - order.qty,
      fromLocation: locationOf(p),
      reason: `${fulfilment} — ${order.orderNumber} (${order.channel})`,
      reference: order.orderNumber, actor
    }), ...s.movements],
    audit: [audit(actor, 'order.completed', 'order', order.id, `${order.orderNumber} as ${fulfilment}`), ...s.audit]
  });
}

export function cancelOrder(orderId: string, actor: string) {
  const s = getState();
  const order = s.orders.find(o => o.id === orderId);
  if (!order) throw new Error('Order not found');
  if (order.status === 'Cancelled') return;

  const holding = order.status === 'Picking' || order.status === 'Paid';
  const p = s.products.find(x => x.id === order.productId);

  persist({
    ...s,
    orders: s.orders.map(o => o.id === orderId ? {...o, status: 'Cancelled' as OrderStatus, completedAt: now()} : o),
    products: holding && p
      ? s.products.map(x => x.id === p.id ? {...x, reserved: Math.max(0, x.reserved - order.qty), updatedBy: actor, updatedAt: now()} : x)
      : s.products,
    movements: holding && p
      ? [movement({
          product: p, type: 'release', quantity: order.qty,
          previousQty: p.reserved, newQty: Math.max(0, p.reserved - order.qty),
          reason: `Cancelled ${order.orderNumber}`, reference: order.orderNumber, actor
        }), ...s.movements]
      : s.movements,
    audit: [audit(actor, 'order.cancelled', 'order', order.id, order.orderNumber), ...s.audit]
  });
}

export function setOrderPaid(orderId: string, actor: string) {
  const s = getState();
  const order = s.orders.find(o => o.id === orderId);
  if (!order || order.status !== 'Picking') return;
  persist({
    ...s,
    orders: s.orders.map(o => o.id === orderId ? {...o, status: 'Paid' as OrderStatus} : o),
    audit: [audit(actor, 'order.paid', 'order', order.id, order.orderNumber), ...s.audit]
  });
}

/* -------------------------------- suppliers -------------------------------- */

export function addSupplier(input: Omit<Supplier, 'id' | 'createdAt'>, actor: string): Supplier {
  const s = getState();
  if (input.name.trim().length < 2) throw new Error('Supplier name is required');
  const supplier: Supplier = {...input, name: input.name.trim(), id: uid('sup'), createdAt: now()};
  persist({
    ...s,
    suppliers: [supplier, ...s.suppliers],
    audit: [audit(actor, 'supplier.created', 'supplier', supplier.id, supplier.name), ...s.audit]
  });
  return supplier;
}

export function addBatch(
  input: {supplierId: string | null; purchaseDate: string; invoiceRef: string; totalCost: number; notes: string},
  actor: string
): PurchaseBatch {
  const s = getState();
  const batchSeq = s.batchSeq + 1;
  const batch: PurchaseBatch = {
    id: uid('bat'),
    code: `BATCH-${new Date().getFullYear()}-${String(batchSeq).padStart(4, '0')}`,
    supplierId: input.supplierId, purchaseDate: input.purchaseDate,
    invoiceRef: input.invoiceRef, totalCost: input.totalCost, notes: input.notes,
    createdBy: actor, createdAt: now()
  };
  persist({
    ...s, batchSeq,
    batches: [batch, ...s.batches],
    audit: [audit(actor, 'batch.created', 'batch', batch.id, batch.code), ...s.audit]
  });
  return batch;
}

/* --------------------------------- AI usage -------------------------------- */

export function recordAiUsage(actor: string, images: number, provider: string) {
  const s = getState();
  persist({
    ...s,
    aiUsage: [{id: uid('ai'), actor, images, provider, createdAt: now()}, ...s.aiUsage],
    audit: [audit(actor, 'ai.analysis', 'product', '-', `${images} image(s) via ${provider}`), ...s.audit]
  });
}

export function aiUsedToday(s: State = getState()) {
  const today = new Date().toDateString();
  return s.aiUsage.filter(u => new Date(u.createdAt).toDateString() === today).length;
}

/* -------------------------------- settings --------------------------------- */

export function saveSettings(next: Settings, actor: string) {
  const s = getState();
  if (!next.company.trim()) throw new Error('Company name cannot be empty');
  if (!/^[A-Za-z0-9]{1,6}$/.test(next.skuPrefix)) throw new Error('SKU prefix must be 1-6 letters or digits');
  if (!Number.isInteger(next.lowStockDefault) || next.lowStockDefault < 0) throw new Error('Low stock default must be zero or more');
  persist({
    ...s,
    settings: {...next, skuPrefix: next.skuPrefix.toUpperCase()},
    audit: [audit(actor, 'settings.updated', 'settings', '-', `${next.company} / ${next.currency}`), ...s.audit]
  });
}

export function resetDemoData() {
  persist(seed());
}
