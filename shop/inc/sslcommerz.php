<?php
declare(strict_types=1);

/* SSLCommerz (v4 API) integration.
   Store ID and password are set in Admin > Settings > Payments.
   A payment is only marked "paid" after the SSLCommerz validation API confirms it. */

function ssl_base(): string
{
    return setting('ssl_sandbox') === '1' ? 'https://sandbox.sslcommerz.com' : 'https://securepay.sslcommerz.com';
}

function ssl_http(string $method, string $url, array $fields = []): ?array
{
    if (function_exists('curl_init')) {
        $ch = curl_init($method === 'GET' && $fields ? $url . '?' . http_build_query($fields) : $url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);
        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $fields);
        }
        $body = curl_exec($ch);
        $err = curl_error($ch);
        curl_close($ch);
        if ($body === false) {
            error_log('[shop] SSLCommerz request failed: ' . $err);
            return null;
        }
    } else {
        $ctx = stream_context_create(['http' => [
            'method' => $method,
            'header' => 'Content-Type: application/x-www-form-urlencoded',
            'content' => $method === 'POST' ? http_build_query($fields) : '',
            'timeout' => 30,
        ]]);
        $body = @file_get_contents($method === 'GET' && $fields ? $url . '?' . http_build_query($fields) : $url, false, $ctx);
        if ($body === false) {
            error_log('[shop] SSLCommerz request failed (no curl)');
            return null;
        }
    }
    $data = json_decode((string)$body, true);
    return is_array($data) ? $data : null;
}

/**
 * Start a payment session. Returns ['ok' => true, 'url' => gateway URL] or ['ok' => false, 'error' => message].
 * Each attempt gets its own transaction ID so a customer can retry after a failed payment.
 */
function ssl_start_payment(array $order): array
{
    if (!online_payment_ready()) {
        return ['ok' => false, 'error' => 'Online payment is not available right now.'];
    }
    $tranId = $order['code'] . '-' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 5));
    db_exec('UPDATE orders SET tran_id = ?, updated_at = ? WHERE id = ?', [$tranId, now(), $order['id']]);

    $items = order_items((int)$order['id']);
    $names = implode(', ', array_map(fn($i) => $i['name'], $items));
    $email = $order['email'] !== '' ? $order['email'] : (setting('email') !== '' ? setting('email') : 'customer@example.com');

    $res = ssl_http('POST', ssl_base() . '/gwprocess/v4/api.php', [
        'store_id' => setting('ssl_store_id'),
        'store_passwd' => setting('ssl_store_password'),
        'total_amount' => number_format((float)$order['total'], 2, '.', ''),
        'currency' => 'BDT',
        'tran_id' => $tranId,
        'success_url' => abs_url('pay/success.php'),
        'fail_url' => abs_url('pay/fail.php'),
        'cancel_url' => abs_url('pay/cancel.php'),
        'ipn_url' => abs_url('pay/ipn.php'),
        'cus_name' => $order['customer_name'],
        'cus_email' => $email,
        'cus_add1' => mb_substr((string)$order['address'], 0, 200),
        'cus_city' => 'Mymensingh',
        'cus_country' => 'Bangladesh',
        'cus_phone' => $order['phone'],
        'shipping_method' => 'Courier',
        'ship_name' => $order['customer_name'],
        'ship_add1' => mb_substr((string)$order['address'], 0, 200),
        'ship_city' => 'Mymensingh',
        'ship_postcode' => '2200',
        'ship_country' => 'Bangladesh',
        'num_of_item' => (string)array_sum(array_column($items, 'qty')),
        'product_name' => mb_substr($names, 0, 250) ?: 'Order ' . $order['code'],
        'product_category' => 'General',
        'product_profile' => 'physical-goods',
        'value_a' => $order['code'],
    ]);

    if ($res && ($res['status'] ?? '') === 'SUCCESS' && !empty($res['GatewayPageURL'])) {
        return ['ok' => true, 'url' => $res['GatewayPageURL']];
    }
    error_log('[shop] SSLCommerz init failed: ' . json_encode($res));
    return ['ok' => false, 'error' => 'We could not start the online payment. Please try again, or choose cash on delivery.'];
}

/**
 * Confirm a payment from the success page or IPN.
 * Returns the order if the payment is verified and recorded, otherwise null.
 */
function ssl_confirm_payment(array $post): ?array
{
    $valId = (string)($post['val_id'] ?? '');
    $tranId = (string)($post['tran_id'] ?? '');
    if ($valId === '' || $tranId === '') {
        return null;
    }
    $order = db_one('SELECT * FROM orders WHERE tran_id = ?', [$tranId]);
    if (!$order) {
        return null;
    }
    if ($order['payment_status'] === 'paid') {
        return $order; // already confirmed (success page and IPN both arrive)
    }

    $v = ssl_http('GET', ssl_base() . '/validator/api/validationserverAPI.php', [
        'val_id' => $valId,
        'store_id' => setting('ssl_store_id'),
        'store_passwd' => setting('ssl_store_password'),
        'format' => 'json',
        'v' => '1',
    ]);
    $status = $v['status'] ?? '';
    $valid = in_array($status, ['VALID', 'VALIDATED'], true)
        && ($v['tran_id'] ?? '') === $tranId
        && strtoupper((string)($v['currency_type'] ?? $v['currency'] ?? '')) === 'BDT'
        && abs((float)($v['currency_amount'] ?? $v['amount'] ?? 0) - (float)$order['total']) < 0.01;

    if (!$valid) {
        error_log('[shop] SSLCommerz validation failed for ' . $tranId . ': ' . json_encode($v));
        return null;
    }

    db_exec(
        "UPDATE orders SET payment_status = 'paid', status = CASE WHEN status = 'pending' THEN 'confirmed' ELSE status END,
           val_id = ?, bank_tran_id = ?, updated_at = ? WHERE id = ?",
        [$valId, (string)($v['bank_tran_id'] ?? ''), now(), $order['id']]
    );
    return db_one('SELECT * FROM orders WHERE id = ?', [$order['id']]);
}
