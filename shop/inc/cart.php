<?php
declare(strict_types=1);

/* The cart lives in the PHP session as [product_id => quantity].
   Prices are always read fresh from the database, never from the browser. */

const CART_MAX_QTY = 99;

function cart_raw(): array
{
    $c = $_SESSION['cart'] ?? [];
    return is_array($c) ? $c : [];
}

function cart_set(int $productId, int $qty): void
{
    $cart = cart_raw();
    if ($qty <= 0) {
        unset($cart[$productId]);
    } else {
        $cart[$productId] = min($qty, CART_MAX_QTY);
    }
    $_SESSION['cart'] = $cart;
}

function cart_add(int $productId, int $qty): void
{
    cart_set($productId, (cart_raw()[$productId] ?? 0) + max(1, $qty));
}

function cart_clear(): void
{
    $_SESSION['cart'] = [];
}

function cart_count(): int
{
    return array_sum(cart_raw());
}

/**
 * Current cart with live product data.
 * Drops products that were deleted or hidden, and caps quantities at the available stock.
 */
function cart_lines(): array
{
    $cart = cart_raw();
    if (!$cart) {
        return ['lines' => [], 'subtotal' => 0, 'count' => 0, 'changed' => false];
    }
    $ids = array_map('intval', array_keys($cart));
    $marks = implode(',', array_fill(0, count($ids), '?'));
    $rows = db_all(
        "SELECT p.*, (SELECT path FROM product_images i WHERE i.product_id = p.id ORDER BY i.sort_order, i.id LIMIT 1) AS image
         FROM products p WHERE p.active = 1 AND p.id IN ($marks)",
        $ids
    );
    $byId = [];
    foreach ($rows as $r) {
        $byId[(int)$r['id']] = $r;
    }

    $lines = [];
    $subtotal = 0;
    $changed = false;
    foreach ($cart as $id => $qty) {
        $p = $byId[(int)$id] ?? null;
        if (!$p) {
            cart_set((int)$id, 0);
            $changed = true;
            continue;
        }
        if ($p['stock'] !== null && $qty > (int)$p['stock']) {
            $qty = max(0, (int)$p['stock']);
            cart_set((int)$id, $qty);
            $changed = true;
            if ($qty === 0) {
                continue;
            }
        }
        $line = (int)$p['price'] * $qty;
        $subtotal += $line;
        $lines[] = ['product' => $p, 'qty' => $qty, 'line_total' => $line];
    }
    return ['lines' => $lines, 'subtotal' => $subtotal, 'count' => array_sum(array_column($lines, 'qty')), 'changed' => $changed];
}

/* ---------- Orders ---------- */

function new_order_code(): string
{
    $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    do {
        $code = 'ORD-';
        for ($i = 0; $i < 6; $i++) {
            $code .= $alphabet[random_int(0, strlen($alphabet) - 1)];
        }
    } while (db_val('SELECT COUNT(*) FROM orders WHERE code = ?', [$code]) > 0);
    return $code;
}

/**
 * Create an order from the current cart inside one transaction.
 * Stock is reserved with a conditional UPDATE so two customers can't buy the last item twice.
 * Returns the order row, or throws RuntimeException with a customer-facing message.
 */
function place_order(array $customer, string $zone, string $method): array
{
    $cart = cart_lines();
    if (!$cart['lines']) {
        throw new RuntimeException('Your cart is empty.');
    }
    $subtotal = $cart['subtotal'];
    $fee = delivery_fee($zone, $subtotal);
    $pdo = db();
    $pdo->beginTransaction();
    try {
        foreach ($cart['lines'] as $l) {
            $p = $l['product'];
            $ok = db_exec(
                'UPDATE products SET stock = stock - ? WHERE id = ? AND active = 1 AND (stock IS NULL OR stock >= ?)',
                [$l['qty'], $p['id'], $l['qty']]
            );
            if ($ok !== 1) {
                throw new RuntimeException('Sorry, "' . $p['name'] . '" just sold out or has fewer items left. Please check your cart.');
            }
        }
        $ts = now();
        $code = new_order_code();
        $orderId = db_insert('orders', [
            'code' => $code,
            'token' => bin2hex(random_bytes(16)),
            'customer_name' => $customer['name'],
            'phone' => $customer['phone'],
            'email' => $customer['email'],
            'address' => $customer['address'],
            'zone' => $zone,
            'note' => $customer['note'],
            'subtotal' => $subtotal,
            'delivery_fee' => $fee,
            'total' => $subtotal + $fee,
            'payment_method' => $method,
            'payment_status' => 'unpaid',
            'status' => 'pending',
            'created_at' => $ts,
            'updated_at' => $ts,
        ]);
        foreach ($cart['lines'] as $l) {
            db_insert('order_items', [
                'order_id' => $orderId,
                'product_id' => $l['product']['id'],
                'name' => $l['product']['name'],
                'price' => (int)$l['product']['price'],
                'qty' => $l['qty'],
                'line_total' => $l['line_total'],
            ]);
        }
        $pdo->commit();
    } catch (Throwable $ex) {
        $pdo->rollBack();
        throw $ex;
    }
    cart_clear();
    return db_one('SELECT * FROM orders WHERE id = ?', [$orderId]);
}

function order_items(int $orderId): array
{
    return db_all('SELECT * FROM order_items WHERE order_id = ? ORDER BY id', [$orderId]);
}

function order_url(array $order): string
{
    return 'order.php?c=' . rawurlencode($order['code']) . '&t=' . rawurlencode($order['token']);
}

/** Put reserved stock back (used when an order is cancelled). Runs at most once per order. */
function restore_stock(array $order): void
{
    if ((int)$order['stock_restored'] === 1) {
        return;
    }
    foreach (order_items((int)$order['id']) as $it) {
        if ($it['product_id'] !== null) {
            db_exec('UPDATE products SET stock = stock + ? WHERE id = ? AND stock IS NOT NULL', [$it['qty'], $it['product_id']]);
        }
    }
    db_exec('UPDATE orders SET stock_restored = 1 WHERE id = ?', [$order['id']]);
}

/** Take stock again when a cancelled order is re-opened. */
function reserve_stock_again(array $order): void
{
    if ((int)$order['stock_restored'] !== 1) {
        return;
    }
    foreach (order_items((int)$order['id']) as $it) {
        if ($it['product_id'] !== null) {
            db_exec('UPDATE products SET stock = stock - ? WHERE id = ? AND stock IS NOT NULL', [$it['qty'], $it['product_id']]);
        }
    }
    db_exec('UPDATE orders SET stock_restored = 0 WHERE id = ?', [$order['id']]);
}

function order_whatsapp_message(array $order): string
{
    $lines = ['Hello ' . setting('store_name') . ', I placed an order on your website.', '', 'Order: ' . $order['code']];
    foreach (order_items((int)$order['id']) as $it) {
        $lines[] = '- ' . $it['qty'] . ' x ' . $it['name'] . ' = ' . money($it['line_total']);
    }
    $lines[] = 'Delivery: ' . money($order['delivery_fee']);
    $lines[] = 'Total: ' . money($order['total']);
    $lines[] = 'Payment: ' . (payment_methods()[$order['payment_method']] ?? $order['payment_method']);
    $lines[] = '';
    $lines[] = 'Name: ' . $order['customer_name'];
    $lines[] = 'Phone: ' . $order['phone'];
    $lines[] = 'Address: ' . preg_replace('/\s+/', ' ', (string)$order['address']);
    return implode("\n", $lines);
}
