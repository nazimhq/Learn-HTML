/* ----------------------------------------------------------------------------
   Domain types for Hizli Inventory.
   Kept separate from the store so a Supabase-backed implementation can reuse
   them unchanged.
---------------------------------------------------------------------------- */

export type Role = 'admin' | 'manager' | 'warehouse' | 'listing';

export const CONDITIONS = [
  'New', 'New Other', 'Open Box', 'Used', 'Customer Return',
  'Untested', 'Damaged', 'Faulty', 'Incomplete', 'For Parts'
] as const;
export type Condition = typeof CONDITIONS[number];

export const TEST_STATUSES = ['Not Tested', 'Tested Working', 'Tested Faulty', 'Partial Test', 'Unknown'] as const;
export type TestStatus = typeof TEST_STATUSES[number];

export const COMPLETENESS = ['Complete', 'Possibly Incomplete', 'Missing Accessories', 'Unknown'] as const;
export type Completeness = typeof COMPLETENESS[number];

export const CHANNELS = ['eBay', 'Vinted', 'Warehouse', 'Facebook', 'Website', 'Manual'] as const;
export type Channel = typeof CHANNELS[number];

/** Delivery and Collection are the two ways an order is completed. */
export const ORDER_STATUSES = ['Picking', 'Paid', 'Delivery', 'Collection', 'Cancelled', 'Returned'] as const;
export type OrderStatus = typeof ORDER_STATUSES[number];

export type Fulfilment = 'Delivery' | 'Collection';

export type MovementType =
  | 'receive' | 'sale' | 'reserve' | 'release' | 'move'
  | 'damage' | 'missing' | 'supplier_return' | 'customer_return'
  | 'quarantine' | 'adjustment';

export type AiSuggestion = {
  field: string;
  value: string;
  confidence: number;
};

/** AI output is kept apart from confirmed product data and is never official
 *  until a person approves it (spec §21, §80). */
export type AiAnalysis = {
  suggestions: AiSuggestion[];
  description: string;
  tags: string[];
  modelUsed: string;
  analysedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
};

export type Product = {
  id: string;
  sku: string;
  barcode: string;
  title: string;
  internalTitle: string;
  description: string;
  category: string;
  subcategory: string;
  brand: string;
  model: string;
  colour: string;
  material: string;
  condition: Condition;
  conditionNotes: string;
  testStatus: TestStatus;
  completeness: Completeness;
  image: string;
  images: string[];
  physical: number;
  reserved: number;
  damaged: number;
  quarantine: number;
  quarantineReason: QuarantineReason | null;
  sold: number;
  returned: number;
  cost: number;
  targetPrice: number;
  supplierId: string | null;
  batchId: string | null;
  receivedAt: string;
  warehouse: string;
  rack: string;
  bay: string;
  level: string;
  bin: string;
  weightKg: number | null;
  dimensions: string;
  ebayListingId: string;
  ebayStatus: 'Listed' | 'Not listed';
  ebayPrice: number | null;
  vintedRef: string;
  vintedStatus: 'Listed' | 'Not listed';
  vintedPrice: number | null;
  lowStockThreshold: number;
  notes: string;
  archived: boolean;
  lastSoldAt: string | null;
  ai: AiAnalysis | null;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
};

export type Order = {
  id: string;
  orderNumber: string;
  channel: Channel;
  marketplaceOrderId: string;
  customerRef: string;
  productId: string;
  sku: string;
  title: string;
  qty: number;
  unitPrice: number;
  shippingCost: number;
  marketplaceFee: number;
  otherCosts: number;
  total: number;
  status: OrderStatus;
  pickState: PickState;
  fulfilment: Fulfilment | null;
  notes: string;
  createdAt: string;
  completedAt: string | null;
};

export type Movement = {
  id: string;
  productId: string;
  sku: string;
  type: MovementType;
  quantity: number;
  previousQty: number;
  newQty: number;
  fromLocation: string | null;
  toLocation: string | null;
  reason: string;
  reference: string | null;
  actor: string;
  createdAt: string;
};

export type Supplier = {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  active: boolean;
  createdAt: string;
};

export type PurchaseBatch = {
  id: string;
  code: string;
  supplierId: string | null;
  purchaseDate: string;
  invoiceRef: string;
  totalCost: number;
  notes: string;
  createdBy: string;
  createdAt: string;
};

export type AuditEntry = {
  id: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  detail: string;
  createdAt: string;
};

export type Settings = {
  company: string;
  legalName: string;
  location: string;
  openingHours: string;
  whatsapp: string;
  skuPrefix: string;
  currency: string;
  timezone: string;
  lowStockDefault: number;
  aiEnabled: boolean;
  aiDailyLimit: number;
};

export type AiUsage = {
  id: string;
  actor: string;
  images: number;
  provider: string;
  createdAt: string;
};


export const RETURN_TYPES = ['Customer Return', 'Marketplace Return', 'Supplier Return'] as const;
export type ReturnType = typeof RETURN_TYPES[number];

export const RETURN_OUTCOMES = ['Restock', 'Quarantine', 'Damaged', 'Return to supplier'] as const;
export type ReturnOutcome = typeof RETURN_OUTCOMES[number];

export type ProductReturn = {
  id: string;
  reference: string;
  type: ReturnType;
  orderId: string | null;
  orderNumber: string;
  productId: string;
  sku: string;
  title: string;
  qty: number;
  reason: string;
  conditionAfter: Condition;
  outcome: ReturnOutcome;
  refundAmount: number;
  notes: string;
  actor: string;
  createdAt: string;
};

export const QUARANTINE_REASONS = [
  'Needs Testing', 'Needs Inspection', 'Possible Damage', 'Return Awaiting Decision'
] as const;
export type QuarantineReason = typeof QUARANTINE_REASONS[number];

export type NotificationKind = 'low_stock' | 'out_of_stock' | 'needs_testing' | 'awaiting_dispatch' | 'large_adjustment' | 'duplicate';

export type Notification = {
  id: string;
  kind: NotificationKind;
  title: string;
  detail: string;
  href: string | null;
  createdAt: string;
  readAt: string | null;
};

export type Warehouse = {
  id: string;
  name: string;
  address: string;
  active: boolean;
};

export const PICK_STATES = ['Picking', 'Picked', 'Packed'] as const;
export type PickState = typeof PICK_STATES[number];

export type State = {
  products: Product[];
  orders: Order[];
  movements: Movement[];
  suppliers: Supplier[];
  batches: PurchaseBatch[];
  returns: ProductReturn[];
  warehouses: Warehouse[];
  notifications: Notification[];
  audit: AuditEntry[];
  aiUsage: AiUsage[];
  settings: Settings;
  seq: number;
  orderSeq: number;
  batchSeq: number;
  returnSeq: number;
};

export const CURRENCIES: Record<string, string> = {GBP: '£', USD: '$', EUR: '€', BDT: '৳'};

export const available = (p: Product) => p.physical - p.reserved - p.quarantine;

/** Everything on the shelf that is not sellable right now. */
export const blocked = (p: Product) => p.reserved + p.quarantine;

export const locationOf = (p: Product) =>
  [p.rack, p.bay, p.level].filter(Boolean).join('-') + (p.bin ? '-' + p.bin : '');
