# Shop template (PHP + MySQL)

An online shop in the same dark NEXAWEB design, with an admin panel for managing products, orders and settings from the browser. It runs on Hostinger shared hosting with no extra software.

Everything is in English. Currency is shown as `BDT 1,200`, and you can change the label in Settings.

## What it does

**Customers can**
- browse products by category, search and sort
- open a product page with photos, price, old price, stock and description
- add products to a cart and change quantities
- check out with name, phone, address, delivery area and a note
- pay by **cash on delivery**, **online through SSLCommerz** (bKash, Nagad, Rocket, cards), or **confirm the order on WhatsApp**
- see an order page and track the order later with its order number and phone

**You (admin) can**
- add, edit, hide and delete products, with multiple photos each (large photos are resized automatically)
- set price, old price, stock (or unlimited), category, and choose featured products for the home page
- create and sort categories
- see all orders, filter by status, search by order number, phone or name
- change order status (Pending → Confirmed → Out for delivery → Delivered, or Cancelled) and mark payments as paid
- cancelling an order puts its items back in stock
- call or WhatsApp a customer from the order page, and print an order
- edit shop name, home page text, contact details, delivery charges, free-delivery amount, payment methods and SSLCommerz keys in **Settings**
- change the admin username and password

## Install on Hostinger

1. **Create a database.** In hPanel go to **Databases → MySQL Databases**. Create a database and a user, and note the database name, username and password.
2. **Upload the files.** Open **File Manager**. Upload everything inside the `shop` folder into `public_html` (or into a subfolder such as `public_html/shop`).
3. **Run the installer.** Visit your site, for example `https://yourshop.com/`. You'll be sent to `install.php`. Enter the database details, your shop name, and an admin username and password. Leave "Add sample products" ticked if you want demo products.
4. **Delete `install.php`** in File Manager. The dashboard reminds you until you do.
5. **Log in** at `https://yourshop.com/admin/`. Go to **Settings** and add your WhatsApp number, phone and delivery charges. Then replace the sample products with real ones.

## Online payment (SSLCommerz)

1. Apply for a merchant account at sslcommerz.com. You'll get a **Store ID** and a **Store password**, first for testing (sandbox), then for live payments.
2. In **Admin → Settings → Payments**, enter the Store ID and password, and switch on "Online payment".
3. Keep "Test mode (sandbox)" on while testing, and switch it off once you have live credentials.
4. In the SSLCommerz merchant panel, set the IPN URL to the one shown in Settings (`https://yourshop.com/pay/ipn.php`).

A payment counts as paid only after SSLCommerz's own validation service confirms the transaction ID, the amount and the currency. If a payment fails, the order stays open and the customer can try again from the order page.

## Security built in

- Admin passwords are hashed. Login is locked for 15 minutes after 5 failed tries.
- All forms have CSRF protection, and every database query uses prepared statements.
- Prices are always taken from the database at checkout, never from the browser.
- Stock is reserved inside a database transaction, so two people can't buy the last item.
- Uploads must be real images and are re-saved. `.htaccess` stops scripts from running in `uploads/`.
- `config.php`, `inc/` and `data/` cannot be opened from the web.

## Files

| Path | What it is |
|---|---|
| `index.php`, `shop.php`, `product.php` | Home, product listing, product page |
| `cart.php`, `checkout.php`, `order.php`, `track.php` | Cart, checkout, order confirmation, order tracking |
| `pay/` | SSLCommerz payment start, return pages and IPN |
| `admin/` | Admin panel |
| `inc/` | Shared code (database, cart, layout, payments) |
| `assets/` | Stylesheet and JavaScript |
| `uploads/products/` | Product photos you upload |
| `install.php` | One-time installer (delete after use) |
| `config.php` | Created by the installer. Holds database details. Never share it. |

## Using it for another client

Upload a fresh copy to the client's hosting and run the installer with their database and shop name. Everything else (name, text, contact details, delivery charges, payment keys, products) is set in the admin panel. The footer credit "Website by NEXAWEB" can be changed or removed in Settings.

## Requirements

PHP 8.1 or newer with PDO MySQL, GD, fileinfo and cURL. Hostinger shared hosting has all of these by default. SQLite is supported for local testing only.
