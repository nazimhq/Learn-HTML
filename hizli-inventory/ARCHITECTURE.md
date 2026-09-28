# Hizli Inventory — architecture

Covers the fourteen points asked for in the brief (§86), and says plainly what
is built and what is not.

## 1. System architecture

```
Browser (Next.js App Router, TypeScript, client components)
   │
   ├── lib/store.ts     every mutation; the only place stock changes
   ├── lib/sales.ts     sales, profit and period aggregation (read-only)
   ├── lib/auth.ts      session + permission matrix
   └── lib/ai.ts        AI provider behind one interface
   │
   ├── /api/ai-analyze  server route — holds the AI key (Node build only)
   └── /api/stock       server route — zod-validated movement endpoint
   │
Supabase (target): Postgres + Auth + Storage + RLS + Realtime
```

Two build targets from one codebase:

| Target | Command | Gets |
|---|---|---|
| Static (cPanel) | `npm run build:static` | Everything except the API routes. Data in `localStorage`. |
| Node (Vercel, cPanel Node) | `npm run build && npm start` | The same UI plus the API routes. |

`lib/store.ts` is the seam. Swapping its function bodies for Supabase calls
moves the whole app to a real database without touching a single page.

## 2. Database schema

`supabase/schema.sql` holds the Postgres schema. The TypeScript mirror is
`lib/types.ts`, so the two stay in step.

Tables: `profiles`, `categories`, `warehouses`, `warehouse_locations`,
`products`, `product_images`, `inventory_stock`, `inventory_movements`,
`suppliers`, `purchase_batches`, `sales_channels`, `marketplace_listings`,
`orders`, `order_items`, `ai_product_analyses`, `audit_logs`.

Money is `numeric(12,2)` — never floating point. Timestamps are `timestamptz`
stored UTC and displayed Europe/London.

## 3. Relationships

```
suppliers ──< purchase_batches ──< products >── categories
products ──< product_images
products ──< inventory_stock >── warehouse_locations >── warehouses
products ──< inventory_movements >── profiles
products ──< marketplace_listings >── sales_channels
orders ──< order_items >── products
products ──< ai_product_analyses >── profiles (approved_by)
profiles ──< audit_logs
```

## 4. Inventory quantity logic

```
available = physical − reserved − quarantine
```

| Event | physical | reserved | movement written |
|---|---|---|---|
| Stock received | +n | — | `receive` |
| Sale taken | — | +n | `reserve` |
| Confirmed Delivery/Collection | −n | −n | `sale` |
| Order cancelled | — | −n | `release` |
| Damaged / missing | −n | — | `damage` / `missing` |
| Location change | — | — | `move` |

Three rules the store enforces, not the UI:

1. `available` never goes below zero.
2. Physical stock can never drop below what is reserved.
3. No quantity changes without a movement row **and** an audit row.

`updateProduct()` rejects any patch touching a stock column, so a stock change
cannot slip in through a product edit.

## 5. Role permission matrix

| | Admin | Manager | Warehouse | Listing |
|---|---|---|---|---|
| Add / edit products | ✓ | ✓ | add only | edit only |
| Receive / remove / move stock | ✓ | ✓ | ✓ | — |
| Take a sale | ✓ | ✓ | — | — |
| Confirm delivery / collection | ✓ | ✓ | ✓ | — |
| See cost and profit | ✓ | ✓ | — | — |
| Suppliers and purchases | ✓ | ✓ | — | — |
| Marketplace listings | ✓ | ✓ | — | ✓ |
| Reports | ✓ | ✓ | — | — |
| Audit log | ✓ | — | — | — |
| Settings | ✓ | — | — | — |

Enforced in `lib/auth.ts` by `can(session, permission)`, checked both for the
nav item and inside each page.

## 6. Folder structure

```
app/            routes (dashboard, inventory, stock, ecommerce, product,
                suppliers, reports, audit, settings) + api routes
components/     Shell, dialogs, Tabs, StatTile, Counter, Toast, Modal
lib/            types, store, sales, auth, ai, csv, image, hooks
supabase/       schema.sql
scripts/        build-static.mjs
```

No file does two jobs, and nothing is one giant file.

## 7. Pages

Dashboard · Inventory (card + table, bulk actions, edit) · Import (CSV with
preview) · Stock (In / Out) · Orders (orders, today, picking list, by
marketplace) · Returns (+ quarantine) · Product (6 tabs) · Suppliers
(+ batches) · HR & Compliance (staff, right to work, training, action list) ·
Reports (5 reports, all CSV) · Audit (actions, movements, AI usage) · Settings.

The interface is a dark top-navigation layout: brand, horizontal nav, alert
bell, role with change-password and sign-out, a WhatsApp button, and a
company strip carrying the trading name, location and opening hours.

## 8. User workflow

**Receiving** — photo → *Analyse with AI* → review suggestions → quantity, cost,
condition, location → Save → SKU and barcode generated → print label.

**Selling** — New sale → stock reserved, order opens at *Picking* → *Confirm* →
choose **Delivery** or **Collection** → stock leaves, movement + audit written.

**Cancelling** releases the reservation instead.

## 8b. Find a product by photo

`lib/imagehash.ts` shrinks a photo to 9×8 greyscale and records whether each
pixel is brighter than the one to its right — a 64-bit difference hash. Two
photos are compared by Hamming distance.

It runs on a canvas in the browser: no API, no key, nothing uploaded. It
survives resizing and re-compression, and it is fast enough to compare a photo
against the whole catalogue while the person waits.

Its limit is honest and stated in the dialog: it compares **how pictures look**,
not what the item is, so two black air fryers photographed alike will score
highly. The result is a ranked shortlist for a person, never a decision.
Barcode scanning (`components/ScannerDialog.tsx`, via the browser's
`BarcodeDetector` with typed-SKU fallback) is the exact route when one exists.

## 9. AI architecture

`lib/ai.ts` exposes `analyseProduct`, `generateEbayListing`,
`generateVintedListing`, `confidenceBand`. It calls `/api/ai-analyze`, which
holds the key server-side; the key never reaches the browser.

- AI runs **only** when a person presses the button — never automatically.
- Every suggestion carries a confidence score and a band (High / Medium /
  Needs verification).
- Suggestions live in `ai_product_analyses`, separate from the product record,
  and become official only when someone approves them.
- A customer return can never be saved as *Tested Working* from the add form.
- Daily usage limit and a usage log, so the cost is visible.

Without a key the app falls back to a clearly-labelled low-confidence draft
built from the typed title, rather than pretending to have read the photo.

## 10. eBay integration

Version 1 works without the API. The data model already stores account,
listing ID, listing price, status and marketplace order ID, with **SKU as the
matching key**. Adding the official API later means writing a sync service —
no schema change.

## 11. Security

Today: a sign-in gate with roles, an audit trail, and server-side validation on
the API routes. The account list ships in the bundle, so **it is not
security** — it organises the app.

For production: Supabase Auth, RLS keyed on `profiles.role`, service keys
server-side only, and 2FA.

## 12. Development phases

1. **Core** — products, photos, SKU, barcode, locations, stock in/out,
   movements, visual inventory, search, audit, CSV import, bulk actions,
   returns, quarantine, picking, HR & compliance ✅
2. **AI** — image analysis, confidence, human approval ✅ (needs a key for the
   real vision call)
3. **Sales** — orders, marketplaces, reservation, delivery/collection ✅
4. **Finance** — cost, fees, shipping, profit, reports, valuation ✅
5. **eBay API** — auth, listing import, order import, stock sync ⛔ not built
6. **Advanced AI** — find by photo ✅ (perceptual hash, offline), duplicate
   detection ✅ (barcode / listing ID / model / title). Embedding-based visual
   similarity and AI price suggestion ⛔ not built — see HANDOVER-PROMPT.md

## 13. Risks

- **localStorage is per browser.** Two staff see two different stocks. This is
  the single thing that makes the current build unsuitable as the real system.
  Supabase fixes it.
- **Concurrency.** Overselling is prevented within one browser, but a real
  guarantee needs a database transaction with row locking. The schema's
  `reserve_stock()` already does this; the client store cannot.
- **No backups** while data is in a browser.
- **Photos in localStorage** hit the ~5MB quota quickly; images are downscaled
  to 800px to delay it. Supabase Storage is the fix.
- **AI cost** grows with usage — hence the daily limit and usage log.

## 14. Recommendations

1. Connect Supabase next. It removes the four biggest risks at once.
2. Keep every stock change inside a database transaction with `SELECT … FOR
   UPDATE`, exactly as `reserve_stock()` and `dispatch_reserved_stock()` do.
3. Move photos to Supabase Storage and keep only the URL.
4. Deploy the Node build (Vercel), not the static bundle, once there is a
   database — the static build cannot run the API routes.
5. Leave AI as an assistant. Nothing it produces should reach a listing or a
   stock figure without a person approving it.
