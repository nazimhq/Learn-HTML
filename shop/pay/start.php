<?php
/* Retry an online payment for an existing order (button on the order page). */
require dirname(__DIR__) . '/inc/bootstrap.php';

if (!is_post()) {
    redirect('');
}
csrf_check();
$order = db_one('SELECT * FROM orders WHERE code = ?', [input('c')]);
if (!$order || !hash_equals($order['token'], input('t'))) {
    redirect('track.php');
}
if ($order['payment_method'] !== 'online' || $order['payment_status'] === 'paid' || $order['status'] === 'cancelled') {
    redirect(order_url($order));
}
$pay = ssl_start_payment($order);
if ($pay['ok']) {
    redirect($pay['url']);
}
flash('error', $pay['error']);
redirect(order_url($order));
