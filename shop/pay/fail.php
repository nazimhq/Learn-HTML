<?php
/* SSLCommerz sends the customer here when a payment fails. The order stays open so they can try again. */
require dirname(__DIR__) . '/inc/bootstrap.php';

$order = db_one('SELECT * FROM orders WHERE tran_id = ?', [(string)($_POST['tran_id'] ?? '')]);
if (!$order) {
    redirect('');
}
if ($order['payment_status'] === 'unpaid') {
    db_exec("UPDATE orders SET payment_status = 'failed', updated_at = ? WHERE id = ?", [now(), $order['id']]);
}
flash('error', defined('PAY_CANCELLED') ? 'Payment cancelled. Your order is saved. You can pay now or contact us.' : 'The payment did not go through. Your order is saved, so you can try again.');
redirect(order_url($order));
