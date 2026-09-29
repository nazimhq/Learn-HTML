<?php
/* SSLCommerz sends the customer back here after paying. The payment is verified with SSLCommerz before it counts. */
require dirname(__DIR__) . '/inc/bootstrap.php';

$order = is_post() ? ssl_confirm_payment($_POST) : null;
if ($order) {
    flash('success', 'Payment received. Thank you! Your order is confirmed.');
    redirect(order_url($order));
}
$pending = db_one('SELECT * FROM orders WHERE tran_id = ?', [(string)($_POST['tran_id'] ?? '')]);
if ($pending) {
    flash('error', 'We could not verify your payment yet. If money was taken, contact us with your order number.');
    redirect(order_url($pending));
}
redirect('');
