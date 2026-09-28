# What is left to build — prompt for the next session

Copy the section you want into a new Claude Code session. Each one is written
to stand alone: it says what exists now, what to build, and how to know it
works.

Repository: `nazimhq/Learn-HTML`, branch
`claude/ai-tai-ki-ki-future-ase-setap-j8odmi`, project folder `hizli-inventory/`.

Read `ARCHITECTURE.md` first. The one rule that matters: **stock only changes
through `lib/store.ts`, and every change writes a movement row and an audit
row.** Nothing in the UI may write a quantity directly.

---

## 1. Connect Supabase — do this one first

> In `hizli-inventory/`, replace the localStorage store with Supabase.
>
> `supabase/schema.sql` already has the tables and the `reserve_stock()` and
> `dispatch_reserved_stock()` functions. `lib/store.ts` is the only file that
> writes state, and `lib/types.ts` mirrors the schema — keep both shapes.
>
> Do this:
> - create the Supabase client in `lib/supabase/` (browser + server helpers
>   from `@supabase/ssr`, which is already a dependency)
> - move every mutation in `lib/store.ts` to a server action that calls the
>   database inside a transaction, so two staff cannot oversell the last unit
> - `recordSale`, `completeOrder`, `stockIn`, `stockOut` and `recordReturn`
>   must use `SELECT … FOR UPDATE` on the stock row
> - replace `useStore()` with Supabase Realtime, so a change on one device
>   shows up on the others
> - move product photos to Supabase Storage and keep only the URL in the row
> - write the RLS policies from `profiles.role`, matching the permission
>   matrix in `lib/auth.ts`
> - swap the sign-in for Supabase Auth and delete the bundled account list
>
> Deploy the Node build (Vercel), not the static bundle — the static build
> cannot run server actions.
>
> Done when: two browsers signed in as different people see the same stock, and
> selling the last unit from both at once succeeds exactly once.

## 2. eBay API integration

> Build the eBay sync for `hizli-inventory/`. The data model already stores
> `ebayListingId`, `ebayStatus`, `ebayPrice` and `marketplaceOrderId`, and SKU
> is the matching key.
>
> Build, in `lib/marketplaces/ebay.ts`:
> - OAuth (Authorization Code flow), tokens stored server-side only
> - import existing listings and match them to products by SKU
> - import orders, creating an order and reserving stock through the existing
>   `recordSale` path — never by writing quantities
> - push a quantity update when stock changes
> - a manual "Sync now" button plus a scheduled sync
>
> Needs: eBay developer account, App ID / Cert ID / Dev ID, and a redirect URL.
> Put them in environment variables; they must never reach the browser.
>
> Done when: an eBay order appears as an order in Hizli with stock reserved,
> and dispatching it in Hizli lowers the eBay quantity.

## 3. Vinted

> Same as the eBay task but for Vinted, in `lib/marketplaces/vinted.ts`.
> Vinted has no public API, so either drive it from their partner API if you
> have access, or build a CSV/manual reconciliation screen that matches Vinted
> sales to products by reference and records them through `recordSale`.

## 4. Product variants

> Add variants to `hizli-inventory/` — one product with several colours or
> sizes, each with its own SKU, barcode, photo and stock.
>
> Add a `variants` table (parent product id, attribute name/value, sku,
> barcode, image) and keep stock on the variant, not the parent. Inventory
> should show one card per parent with a variant count; the product page gets a
> Variants tab. `recordSale` and every stock function take a variant id.
>
> Done when: a Tool Trolley in black, red and blue is one product with three
> independent stock figures.

## 5. Documents

> Add document attachments to products, suppliers and purchase batches in
> `hizli-inventory/` — supplier invoices, manifests, manuals.
>
> Use Supabase Storage (do this after task 1; localStorage cannot hold files).
> A `documents` table with entity type, entity id, filename, media type, size,
> uploaded by and URL. Upload, list, download and delete, with the delete
> writing an audit row.

## 6. Visual similarity with a real model

> `lib/imagehash.ts` finds products by photo using a 64-bit difference hash. It
> works offline and is honest about being a picture comparison, but it cannot
> tell two different black air fryers apart.
>
> Replace the scoring with image embeddings: send the photo to a vision model
> server-side, store the embedding on the product, and rank by cosine
> similarity. Keep the existing dHash as the offline fallback, keep the
> shortlist-for-a-person framing, and keep the confidence band.
>
> Needs: an API key, held server-side.

## 7. AI pricing and reorder suggestions

> Using the sales history already in the store, add to `lib/ai.ts`:
> - a suggested price per product, from what similar items actually sold for
> - a reorder suggestion from the sell-through rate against days of cover
> - a dead-stock recommendation (discount, bundle, or return to supplier)
>
> Every suggestion must show its reasoning and stay a suggestion — the rule in
> `ARCHITECTURE.md` is that AI never changes stock, cost or a listing on its
> own.

## 8. Warehouse map

> `warehouses`, rack, bay, level and bin are already stored. Build a simple
> visual map at `/warehouse-map`: racks as blocks, colour by how full each bay
> is, click a bay to see what is in it. Read-only first; drag-to-move later.

## 9. Two-factor authentication and login history

> After task 1. Add TOTP 2FA through Supabase Auth, a login history table
> (user, time, IP, device), and a screen for an admin to see active sessions
> and sign a device out.

---

## Things that are deliberately not on this list

- **Turning off the "not real security" warnings.** They stay until Supabase
  Auth replaces the bundled accounts.
- **Letting AI publish a listing or change stock by itself.** The brief rules
  that out, and so does `ARCHITECTURE.md`.
- **Marking a customer return as tested working automatically.** A person has
  to test it.
