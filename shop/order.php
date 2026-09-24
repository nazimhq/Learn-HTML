<?php
require __DIR__ . '/inc/bootstrap.php';

$order = db_one('SELECT * FROM orders WHERE code = ?', [query('c')]);
if (!$order || !hash_equals($order['token'], query('t'))) {
    http_response_code(404);
    store_header('Order not found', ['noindex' => true]);
    echo '<section class="mx-auto max-w-site px-4 py-24 text-center sm:px-6"><h1 class="font-display text-3xl font-semibold text-white">Order not found</h1>'
        . '<p class="mt-3 text-muted">Check the link, or look up your order with its number and your phone number.</p>'
        . '<a href="' . e(url('track.php')) . '" class="btn-primary mt-8 inline-flex rounded-full px-6 py-3 font-medium">Track an order</a></section>';
    store_footer();
    exit;
}

$items = order_items((int)$order['id']);
$statuses = order_statuses();
$steps = ['pending', 'confirmed', 'shipped', 'delivered'];
$current = array_search($order['status'], $steps, true);
$cancelled = $order['status'] === 'cancelled';
$canPay = $order['payment_method'] === 'online' && $order['payment_status'] !== 'paid' && !$cancelled && online_payment_ready();
$zones = delivery_zones();

store_header('Order ' . $order['code'], ['noindex' => true]);
?>
<section class="mx-auto max-w-3xl px-4 pt-10 sm:px-6 md:pt-14">
  <div class="text-center">
    <span class="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl <?= $cancelled ? 'bg-red-500/15 text-red-300' : 'bg-accent/15 text-accent-soft' ?>"><?= icon($cancelled ? 'close' : 'receipt', 'h-7 w-7') ?></span>
    <p class="mt-5 text-sm text-muted">Order number</p>
    <h1 class="mt-1 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl"><?= e($order['code']) ?></h1>
    <p class="mt-3 text-muted">Placed on <?= e(date('j M Y, g:i A', strtotime($order['created_at']))) ?></p>
  </div>

  <?php if ($order['payment_method'] === 'whatsapp' && whatsapp_ready() && !$cancelled): ?>
  <div class="mt-8 rounded-3xl border border-accent/40 bg-accent/10 p-6 text-center">
    <p class="font-medium text-white">One more step: send your order to us on WhatsApp.</p>
    <a href="<?= e(wa_link(order_whatsapp_message($order))) ?>" target="_blank" rel="noopener" class="btn-primary mt-4 inline-flex items-center gap-2 rounded-full px-6 py-3.5 font-medium"><?= icon('message', 'h-4 w-4') ?>Send order on WhatsApp</a>
  </div>
  <?php endif; ?>

  <?php if ($canPay): ?>
  <div class="mt-8 rounded-3xl border border-amber-400/40 bg-amber-400/10 p-6 text-center">
    <p class="font-medium text-amber-100"><?= $order['payment_status'] === 'failed' ? 'Your payment did not go through.' : 'This order is waiting for payment.' ?></p>
    <form method="post" action="<?= e(url('pay/start.php')) ?>" class="mt-4">
      <?= csrf_field() ?>
      <input type="hidden" name="c" value="<?= e($order['code']) ?>"><input type="hidden" name="t" value="<?= e($order['token']) ?>">
      <button class="btn-primary inline-flex items-center gap-2 rounded-full px-6 py-3.5 font-medium"><?= icon('card', 'h-4 w-4') ?>Pay <?= e(money($order['total'])) ?> now</button>
    </form>
  </div>
  <?php endif; ?>

  <div class="panel mt-8 rounded-3xl p-6 sm:p-8">
    <h2 class="font-display text-lg font-semibold text-white">Status</h2>
    <?php if ($cancelled): ?>
    <p class="mt-4 text-red-300">This order was cancelled. Contact us if you think this is a mistake.</p>
    <?php else: ?>
    <ol class="mt-6 grid grid-cols-4 gap-2">
      <?php foreach ($steps as $i => $s): $done = $current !== false && $i <= $current; ?>
      <li class="flex flex-col gap-2">
        <span class="h-1.5 rounded-full <?= $done ? 'bg-accent shadow-[0_0_12px_rgba(139,92,246,0.8)]' : 'bg-white/10' ?>"></span>
        <span class="text-xs <?= $done ? 'text-white' : 'text-zinc-500' ?> sm:text-sm"><?= e($statuses[$s]) ?></span>
      </li>
      <?php endforeach; ?>
    </ol>
    <?php endif; ?>
    <dl class="mt-6 grid gap-4 border-t border-white/[0.08] pt-6 text-sm sm:grid-cols-2">
      <div><dt class="text-zinc-500">Payment</dt><dd class="mt-1 text-white"><?= e(payment_methods()[$order['payment_method']] ?? $order['payment_method']) ?> · <?= e(payment_statuses()[$order['payment_status']] ?? $order['payment_status']) ?></dd></div>
      <div><dt class="text-zinc-500">Deliver to</dt><dd class="mt-1 text-white"><?= e($order['customer_name']) ?> · <?= e($order['phone']) ?></dd></div>
      <div class="sm:col-span-2"><dt class="text-zinc-500">Address</dt><dd class="mt-1 text-white"><?= nl2br(e($order['address'])) ?><span class="text-zinc-500"> (<?= e($zones[$order['zone']]['label'] ?? $order['zone']) ?>)</span></dd></div>
      <?php if (trim((string)$order['note']) !== ''): ?><div class="sm:col-span-2"><dt class="text-zinc-500">Note</dt><dd class="mt-1 text-white"><?= nl2br(e($order['note'])) ?></dd></div><?php endif; ?>
    </dl>
  </div>

  <div class="panel mt-6 rounded-3xl p-6 sm:p-8">
    <h2 class="font-display text-lg font-semibold text-white">Items</h2>
    <ul class="mt-5 flex flex-col divide-y divide-white/[0.06]">
      <?php foreach ($items as $it): ?>
      <li class="flex items-center justify-between gap-4 py-3 text-sm">
        <span class="text-zinc-200"><?= (int)$it['qty'] ?> × <?= e($it['name']) ?></span>
        <span class="text-white" style="font-variant-numeric:tabular-nums"><?= e(money($it['line_total'])) ?></span>
      </li>
      <?php endforeach; ?>
    </ul>
    <dl class="mt-4 flex flex-col gap-2 border-t border-white/[0.08] pt-4 text-sm">
      <div class="flex justify-between"><dt class="text-muted">Subtotal</dt><dd class="text-white"><?= e(money($order['subtotal'])) ?></dd></div>
      <div class="flex justify-between"><dt class="text-muted">Delivery</dt><dd class="text-white"><?= (int)$order['delivery_fee'] === 0 ? 'Free' : e(money($order['delivery_fee'])) ?></dd></div>
      <div class="flex justify-between pt-2 text-base"><dt class="font-medium text-white">Total</dt><dd class="font-display font-semibold text-white"><?= e(money($order['total'])) ?></dd></div>
    </dl>
  </div>

  <p class="mt-6 text-center text-sm text-zinc-500">Save this page to check your order later. Questions? <?php if (whatsapp_ready()): ?><a class="text-accent-soft hover:text-white" href="<?= e(wa_link('Hello, I have a question about order ' . $order['code'])) ?>" target="_blank" rel="noopener">Message us on WhatsApp</a><?php elseif (setting('phone')): ?>Call <?= e(setting('phone')) ?><?php endif; ?></p>
  <div class="mt-6 text-center"><a href="<?= e(url('shop.php')) ?>" class="btn-ghost inline-flex rounded-full px-6 py-3 text-sm font-medium text-white">Continue shopping</a></div>
</section>
<?php store_footer();
