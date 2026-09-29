<?php
require dirname(__DIR__) . '/inc/admin.php';
require_admin();

$order = db_one('SELECT * FROM orders WHERE id = ?', [(int)query('id')]);
if (!$order) {
    flash('error', 'Order not found.');
    redirect('admin/orders.php');
}

if (is_post()) {
    csrf_check();
    $newStatus = input('status');
    $newPay = input('payment_status');
    if (isset(order_statuses()[$newStatus]) && isset(payment_statuses()[$newPay])) {
        $pdo = db();
        $pdo->beginTransaction();
        if ($newStatus === 'cancelled' && $order['status'] !== 'cancelled') {
            restore_stock($order);
        } elseif ($newStatus !== 'cancelled' && $order['status'] === 'cancelled') {
            reserve_stock_again($order);
        }
        db_exec('UPDATE orders SET status = ?, payment_status = ?, updated_at = ? WHERE id = ?', [$newStatus, $newPay, now(), $order['id']]);
        $pdo->commit();
        flash('success', 'Order updated.');
    }
    redirect('admin/order.php?id=' . (int)$order['id']);
}

$items = order_items((int)$order['id']);
$zones = delivery_zones();
$customerWa = wa_link('Hello ' . $order['customer_name'] . ', this is ' . setting('store_name') . ' about your order ' . $order['code'] . '.', $order['phone']);

admin_header('Order ' . $order['code'], 'orders');
echo admin_page_title(
    'Order ' . $order['code'],
    'Placed ' . date('j M Y, g:i A', strtotime($order['created_at'])),
    '<a href="' . e(url('admin/orders.php')) . '" class="btn-ghost inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-white">' . icon('arrow-left', 'h-4 w-4') . 'All orders</a>'
    . '<button type="button" onclick="window.print()" class="btn-ghost no-print inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-white">Print</button>'
);
?>
<div class="grid gap-6 xl:grid-cols-[1fr_340px]">
  <div class="flex flex-col gap-6">
    <section class="panel rounded-2xl p-5 sm:p-6">
      <div class="flex flex-wrap items-center gap-2"><?= status_pill($order['status']) ?><?= status_pill($order['payment_status']) ?><span class="text-sm text-muted"><?= e(payment_methods()[$order['payment_method']] ?? $order['payment_method']) ?></span></div>
      <ul class="mt-5 divide-y divide-white/[0.06]">
        <?php foreach ($items as $it): ?>
        <li class="flex items-center justify-between gap-4 py-3 text-sm">
          <span class="text-zinc-200"><?= (int)$it['qty'] ?> × <?= $it['product_id'] ? '<a class="hover:text-accent-soft" href="' . e(url('admin/product-edit.php?id=' . (int)$it['product_id'])) . '">' . e($it['name']) . '</a>' : e($it['name']) ?> <span class="text-zinc-500">@ <?= e(money($it['price'])) ?></span></span>
          <span class="text-white" style="font-variant-numeric:tabular-nums"><?= e(money($it['line_total'])) ?></span>
        </li>
        <?php endforeach; ?>
      </ul>
      <dl class="mt-3 flex flex-col gap-2 border-t border-white/[0.08] pt-4 text-sm">
        <div class="flex justify-between"><dt class="text-muted">Subtotal</dt><dd class="text-white"><?= e(money($order['subtotal'])) ?></dd></div>
        <div class="flex justify-between"><dt class="text-muted">Delivery (<?= e($zones[$order['zone']]['label'] ?? $order['zone']) ?>)</dt><dd class="text-white"><?= e(money($order['delivery_fee'])) ?></dd></div>
        <div class="flex justify-between pt-2 text-base"><dt class="font-medium text-white">Total</dt><dd class="font-display font-semibold text-white"><?= e(money($order['total'])) ?></dd></div>
      </dl>
      <?php if ($order['bank_tran_id'] !== '' || $order['tran_id'] !== ''): ?>
      <p class="mt-4 text-xs text-zinc-500">SSLCommerz transaction: <?= e($order['tran_id']) ?><?= $order['bank_tran_id'] !== '' ? ' · Bank ref: ' . e($order['bank_tran_id']) : '' ?></p>
      <?php endif; ?>
    </section>

    <section class="panel rounded-2xl p-5 sm:p-6">
      <h2 class="font-display font-semibold text-white">Customer</h2>
      <dl class="mt-4 grid gap-4 text-sm sm:grid-cols-2">
        <div><dt class="text-zinc-500">Name</dt><dd class="mt-1 text-white"><?= e($order['customer_name']) ?></dd></div>
        <div><dt class="text-zinc-500">Phone</dt><dd class="mt-1 text-white"><?= e($order['phone']) ?></dd></div>
        <?php if ($order['email'] !== ''): ?><div><dt class="text-zinc-500">Email</dt><dd class="mt-1 text-white"><?= e($order['email']) ?></dd></div><?php endif; ?>
        <div class="sm:col-span-2"><dt class="text-zinc-500">Address</dt><dd class="mt-1 text-white"><?= nl2br(e($order['address'])) ?></dd></div>
        <?php if (trim((string)$order['note']) !== ''): ?><div class="sm:col-span-2"><dt class="text-zinc-500">Customer note</dt><dd class="mt-1 rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-accent-soft"><?= nl2br(e($order['note'])) ?></dd></div><?php endif; ?>
      </dl>
      <div class="no-print mt-5 flex flex-wrap gap-2">
        <a href="<?= e(tel_href($order['phone'])) ?>" class="btn-ghost inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-white"><?= icon('phone', 'h-4 w-4') ?>Call</a>
        <a href="<?= e($customerWa) ?>" target="_blank" rel="noopener" class="btn-ghost inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-white"><?= icon('message', 'h-4 w-4') ?>WhatsApp customer</a>
      </div>
    </section>
  </div>

  <form method="post" class="panel no-print h-fit rounded-2xl p-5 sm:p-6">
    <?= csrf_field() ?>
    <h2 class="font-display font-semibold text-white">Update order</h2>
    <label for="status" class="mt-5 block text-sm font-medium text-zinc-200">Order status</label>
    <select id="status" name="status" class="field mt-2 h-11 w-full rounded-xl pl-4">
      <?php foreach (order_statuses() as $k => $label): ?><option value="<?= e($k) ?>" <?= $order['status'] === $k ? 'selected' : '' ?>><?= e($label) ?></option><?php endforeach; ?>
    </select>
    <label for="payment_status" class="mt-4 block text-sm font-medium text-zinc-200">Payment</label>
    <select id="payment_status" name="payment_status" class="field mt-2 h-11 w-full rounded-xl pl-4">
      <?php foreach (payment_statuses() as $k => $label): ?><option value="<?= e($k) ?>" <?= $order['payment_status'] === $k ? 'selected' : '' ?>><?= e($label) ?></option><?php endforeach; ?>
    </select>
    <p class="mt-3 text-xs text-zinc-500">Cancelling puts the items back in stock. For cash on delivery, set payment to "Paid" once you collect the money.</p>
    <button class="btn-primary mt-5 w-full rounded-full px-5 py-3 text-sm font-medium">Save</button>
    <a href="<?= e(url(order_url($order))) ?>" target="_blank" rel="noopener" class="mt-3 flex items-center justify-center gap-1.5 text-xs text-zinc-500 hover:text-white">Customer's order page<?= icon('external', 'h-3.5 w-3.5') ?></a>
  </form>
</div>
<?php admin_footer();
