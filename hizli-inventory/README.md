# Hizli Inventory

Photo-first inventory, warehouse and e-commerce management for Hizli UK.

See **[ARCHITECTURE.md](ARCHITECTURE.md)** for the system design, database
schema, quantity logic, role matrix, AI architecture and the honest list of
what is and is not built.

## Signing in

| Username | Password | Role | Can |
|---|---|---|---|
| `admin` | `Hizli@2026` | Admin | everything |
| `manager` | `Manager@2026` | Manager | everything except Audit log and Settings |
| `warehouse` | `Store@2026` | Warehouse | stock, orders, returns — **no cost or profit** |
| `listing` | `Listing@2026` | Listing | products and marketplace listings only |

Everyone can change their own password from the header; the change is kept in
that browser.

Accounts are in `lib/auth.ts` and ship inside the browser bundle, so this is a
UI gate, not security. Real accounts need Supabase Auth and the RLS policies.

## Where data lives

`lib/store.ts` keeps everything in the browser's `localStorage`. It is **per
browser** — not shared between staff or devices. That one file is the seam to
swap for Supabase queries; no page touches storage directly.

## Sections

- **Dashboard** — today / yesterday / 7 days / month / year, pieces and money,
  profit, sales by marketplace, stock position
- **Inventory** — card and table view, search across every field, filters
- **Stock** — *Stock In* (what you have) and *Stock Out* (what has run out)
- **E-Commerce** — Orders, Today's orders, Picking list, By marketplace.
  Confirm an order as **Delivery** or **Collection**, or cancel it
- **Suppliers** — suppliers and purchase batches
- **Reports** — sales, valuation, low stock, dead stock, movements; all CSV
- **Audit log** — actions, stock movements, AI usage
- **Find by photo** — photograph an item and the app ranks the products whose
  photos look like it, entirely on the device
- **Scan** — barcode / QR to open a product, with typed-SKU fallback
- **Import** — CSV import with a row-by-row preview and duplicate warnings
- **Returns** — customer, marketplace and supplier returns, plus quarantine
- **HR & Compliance** — staff, right-to-work checks, training expiry, action list
- **Settings** — company and trading details, WhatsApp, users and roles,
  integrations, data export

## Included
- Dashboard
- Visual inventory cards + search
- Product detail with QR code
- Warehouse location view
- Orders / quick-sale starting point
- Role-ready PostgreSQL schema
- Transaction-safe reserve/dispatch database functions
- Audit log tables
- Supplier / purchase / marketplace tables
- AI image-analysis API endpoint
- eBay/Vinted integration-ready data model

## Run locally
1. Install Node.js 20+
2. `npm install`
3. Copy `.env.example` to `.env.local`
4. Optional: add `OPENAI_API_KEY` for AI product-image analysis
5. `npm run dev`
6. Open http://localhost:3000

## Supabase production setup
1. Create a Supabase project.
2. Run `supabase/schema.sql` in Supabase SQL Editor.
3. Create a `product-images` Storage bucket.
4. Add Supabase URL/keys to `.env.local`.
5. Replace `lib/demo.ts` reads with Supabase queries.

## Important
This ZIP is a runnable MVP/starter, not a completed audited ERP. Live eBay OAuth/order sync, Vinted API sync, production RLS policies, image-upload UI, printer-specific labels and production deployment require your service credentials and environment details.

The schema intentionally keeps AI suggestions separate from official product data and never treats image analysis as proof that a customer-return item works.

## Deploying

### Static host (cPanel, Netlify, S3)
```
npm install
npm run build:static
```
Upload the **contents** of `out/` into `public_html`. The bundle includes an
`.htaccess` with the 404 page, clean URLs and cache headers.

The two API routes are excluded from this build — a static host cannot run
them. `scripts/build-static.mjs` moves `app/api` aside for the export and puts
it back afterwards, so `npm run build` keeps working.

The bundle assumes it is served from the domain root. For a subfolder, set
`basePath` in `next.config.mjs` and rebuild.

### Node host (full app, API routes included)
```
npm install && npm run build && npm start
```
Works on Vercel, or on cPanel plans that offer "Setup Node.js App".


## What is left

See **[HANDOVER-PROMPT.md](HANDOVER-PROMPT.md)** — a ready-to-paste prompt per
remaining piece of work (Supabase, eBay, Vinted, variants, documents, embedding
similarity, AI pricing, warehouse map, 2FA).
