# Hizli Inventory

Photo-first inventory and warehouse management starter for Hizli UK.

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
