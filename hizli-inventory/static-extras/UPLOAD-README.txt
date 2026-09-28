HIZLI INVENTORY — static bundle
================================

UPLOAD TO cPANEL
  1. cPanel -> File Manager -> public_html
  2. Upload the zip -> right-click -> Extract -> delete the zip
  3. Upload the CONTENTS of this folder, not the folder itself.
     public_html/index.html must exist.
  4. .htaccess is hidden: File Manager -> Settings -> Show Hidden Files.
  5. Open your domain.

SIGNING IN
  admin     / Hizli@2026      everything
  manager   / Manager@2026    everything except Audit and Settings
  warehouse / Store@2026      stock, orders, returns — NO cost or profit
  listing   / Listing@2026    products and marketplace listings only

  Each person can change their own password from the header. Passwords are
  stored in that browser only.

  The accounts are in lib/auth.ts and ship inside the JavaScript bundle.
  Anyone can read them with browser devtools. The sign-in organises the app;
  it does NOT secure it. Do not put real business data behind it.

SECTIONS
  Dashboard        today / yesterday / 7 days / month / year, pieces and
                   money, profit, sales by marketplace, stock position
  Inventory        card + table view, filters, search, bulk move / archive /
                   low-stock level, edit, multiple photos,
                   FIND BY PHOTO (compares photos on the device) and
                   SCAN (barcode / QR, with typed-SKU fallback)
  Import           CSV import with a row-by-row preview and duplicate warnings
  Stock            Stock In (what you have) / Stock Out (what has run out),
                   receive, remove with a reason, move.
                   An admin can force a negative-stock correction; it is
                   marked as an override in the movement and the audit log.
  E-Commerce       orders, today's orders, picking list, by marketplace.
                   Confirm as DELIVERY or COLLECTION, or Cancel
  Returns          customer / marketplace / supplier returns + quarantine
  Suppliers        suppliers and purchase batches
  HR & Compliance  staff, right-to-work checks, training expiry, action list
  Reports          sales, valuation, low stock, dead stock, movements — CSV
  Audit            every action, every stock movement, AI usage
  Settings         company, trading name, location, hours, WhatsApp, users,
                   roles, warehouses, AI limits, exports

FIND BY PHOTO — how it works
  The photo is shrunk to a tiny greyscale grid and turned into a 64-bit
  fingerprint, then compared with every product photo. It runs in the browser:
  nothing is uploaded and no API key is needed.
  It compares how the pictures LOOK, not what the item is, so two similar
  black appliances can both score highly. It gives a ranked shortlist —
  always confirm the SKU. Use SCAN when there is a label.

WHAT DOES NOT WORK IN THIS BUNDLE
  The API routes (/api/stock, /api/ai-analyze) are NOT here — a static host
  cannot run them. "Analyse with AI" therefore falls back to a clearly
  labelled low-confidence draft instead of reading the photo.

  DATA IS PER BROWSER. It lives in localStorage, not on the server. Two
  members of staff see two different stock levels. Fine for trying the system
  out; NOT multi-user stock control.

WHAT IS LEFT TO BUILD
  HANDOVER-PROMPT.md in this folder has a ready-to-paste prompt for each
  remaining job: Supabase, eBay API, Vinted, product variants, documents,
  embedding-based visual similarity, AI pricing, warehouse map, 2FA.

TO MAKE IT REAL
  Connect Supabase (schema in supabase/schema.sql) and deploy the Node build:
    npm install && npm run build && npm start
  See ARCHITECTURE.md.

REBUILDING
  npm install
  npm run build:static      -> regenerates ./out
