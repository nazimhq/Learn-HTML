<?php
require dirname(__DIR__) . '/inc/admin.php';
require_admin();

$today = date('Y-m-d 00:00:00');
$monthStart = date('Y-m-01 00:00:00');
$stats = [
    ['Pending orders', (string)(int)db_val("SELECT COUNT(*) FROM orders WHERE status = 'pending'"), 'Need a call or confirmation', 'receipt', 'admin/orders.php?status=pending'],
    ["Today's orders", (string)(int)db_val("SELECT COUNT(*) FROM orders WHERE created_at >= ? AND status <> 'cancelled'", [$today]), money((int)db_val("SELECT COALESCE(SUM(total),0) FROM orders WHERE created_at >= ? AND status <> 'cancelled'", [$today])), 'cart', 'admin/orders.php'],
    ['This month', money((int)db_val("SELECT COALESCE(SUM(total),0) FROM orders WHERE created_at >= ? AND status <> 'cancelled'", [$monthStart])), (int)db_val("SELECT COUNT(*) FROM orders WHERE created_at >= ? AND status <> 'cancelled'", [$monthStart]) . ' orders, not counting cancelled', 'tag', 'admin/orders.php'],
    ['Products', (string)(int)db_val('SELECT COUNT(*) FROM products WHERE active = 1'), (int)db_val('SELECT COUNT(*) FROM products WHERE active = 0') . ' hidden', 'box', 'admin/products.php'],
];
$recent = db_all('SELECT * FROM orders ORDER BY created_at DESC, id DESC LIMIT 8');
$lowStock = db_all('SELECT id, name, stock FROM products WHERE active = 1 AND stock IS NOT NULL AND stock <= 3 ORDER BY stock, name LIMIT 8');
$warnings = [];
if (!whatsapp_ready() && setting('whatsapp_enabled') === '1') {
    $warnings[] = 'Add your WhatsApp number in Settings so WhatsApp buttons work.';
}
if (setting('online_enabled') === '1' && !online_payment_ready()) {
    $warnings[] = 'Online payment is switched on but the SSLCommerz Store ID or password is missing.';
}
if (is_file(APP_ROOT . '/install.php')) {
    $warnings[] = 'Delete install.php from your hosting file manager. It is no longer needed.';
}

admin_header('Dashboard', 'dashboard');
echo admin_page_title('Dashboard', 'Welcome back, ' . current_admin()['username'] . '.', '<a href="' . e(url('admin/product-edit.php')) . '" class="btn-primary inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium">' . icon('plus', 'h-4 w-4') . 'Add product</a>');
?>
<?php foreach ($warnings as $w): ?>
<div class="mb-3 flex items-start gap-3 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-100"><?= icon('alert', 'mt-0.5 h-4 w-4 shrink-0') ?><span><?= e($w) ?></span></div>
<?php endforeach; ?>

<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
  <?php foreach ($stats as [$label, $value, $sub, $ic, $href]): ?>
  <a href="<?= e(url($href)) ?>" class="card block rounded-2xl p-5">
    <div class="flex items-center justify-between text-sm text-muted"><?= e($label) ?><span class="text-accent-soft"><?= icon($ic, 'h-4 w-4') ?></span></div>
    <p class="mt-3 font-display text-3xl font-semibold text-white" style="font-variant-numeric:tabular-nums"><?= e($value) ?></p>
    <p class="mt-1 text-xs text-zinc-500"><?= e($sub) ?></p>
  </a>
  <?php endforeach; ?>
</div>

<div class="mt-8 grid gap-6 xl:grid-cols-[1fr_320px]">
  <section class="panel rounded-2xl">
    <div class="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
      <h2 class="font-display font-semibold text-white">Recent orders</h2>
      <a href="<?= e(url('admin/orders.php')) ?>" class="text-sm text-muted hover:text-white">View all</a>
    </div>
    <?php if ($recent): ?>
    <ul class="divide-y divide-white/[0.06]">
      <?php foreach ($recent as $o): ?>
      <li>
        <a href="<?= e(url('admin/order.php?id=' . (int)$o['id'])) ?>" class="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5 hover:bg-white/[0.02]">
          <span class="font-mono text-sm text-white"><?= e($o['code']) ?></span>
          <span class="min-w-0 flex-1 truncate text-sm text-zinc-300"><?= e($o['customer_name']) ?></span>
          <span class="text-sm text-white" style="font-variant-numeric:tabular-nums"><?= e(money($o['total'])) ?></span>
          <?= status_pill($o['status']) ?>
        </a>
      </li>
      <?php endforeach; ?>
    </ul>
    <?php else: ?>
    <p class="px-5 py-10 text-center text-sm text-muted">No orders yet. They'll appear here as soon as customers check out.</p>
    <?php endif; ?>
  </section>

  <section class="panel h-fit rounded-2xl">
    <div class="border-b border-white/[0.06] px-5 py-4"><h2 class="font-display font-semibold text-white">Low stock</h2></div>
    <?php if ($lowStock): ?>
    <ul class="divide-y divide-white/[0.06]">
      <?php foreach ($lowStock as $p): ?>
      <li><a href="<?= e(url('admin/product-edit.php?id=' . (int)$p['id'])) ?>" class="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-white/[0.02]">
        <span class="truncate text-zinc-200"><?= e($p['name']) ?></span>
        <span class="shrink-0 rounded-full px-2 py-0.5 text-xs <?= (int)$p['stock'] <= 0 ? 'bg-red-500/15 text-red-200' : 'bg-amber-400/15 text-amber-200' ?>"><?= (int)$p['stock'] <= 0 ? 'Sold out' : (int)$p['stock'] . ' left' ?></span>
      </a></li>
      <?php endforeach; ?>
    </ul>
    <?php else: ?>
    <p class="px-5 py-8 text-center text-sm text-muted">Nothing is running low.</p>
    <?php endif; ?>
  </section>
</div>
<?php admin_footer();
