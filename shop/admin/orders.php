<?php
require dirname(__DIR__) . '/inc/admin.php';
require_admin();

const ORDERS_PER_PAGE = 25;

$status = query('status');
$q = query('q');
$page = max(1, (int)query('page', '1'));
$where = [];
$params = [];
if (isset(order_statuses()[$status])) {
    $where[] = 'status = ?';
    $params[] = $status;
}
if ($q !== '') {
    $where[] = "(code LIKE ? ESCAPE '!' OR phone LIKE ? ESCAPE '!' OR customer_name LIKE ? ESCAPE '!')";
    $like = '%' . str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $q) . '%';
    array_push($params, $like, $like, $like);
}
$w = $where ? ' WHERE ' . implode(' AND ', $where) : '';
$total = (int)db_val('SELECT COUNT(*) FROM orders' . $w, $params);
$pages = max(1, (int)ceil($total / ORDERS_PER_PAGE));
$page = min($page, $pages);
$orders = db_all('SELECT * FROM orders' . $w . ' ORDER BY created_at DESC, id DESC LIMIT ' . ORDERS_PER_PAGE . ' OFFSET ' . (($page - 1) * ORDERS_PER_PAGE), $params);
$counts = [];
foreach (db_all('SELECT status, COUNT(*) AS n FROM orders GROUP BY status') as $r) {
    $counts[$r['status']] = (int)$r['n'];
}

function orders_link(array $c): string
{
    $p = array_filter(array_merge(['status' => query('status'), 'q' => query('q')], $c), fn($v) => $v !== '' && $v !== 1);
    return url('admin/orders.php' . ($p ? '?' . http_build_query($p) : ''));
}

admin_header('Orders', 'orders');
echo admin_page_title('Orders', $total . ' ' . ($total === 1 ? 'order' : 'orders'));
?>
<div class="mb-4 flex gap-2 overflow-x-auto pb-1">
  <a href="<?= e(orders_link(['status' => '', 'page' => 1])) ?>" class="shrink-0 rounded-full border px-4 py-2 text-sm <?= $status === '' ? 'border-accent/60 bg-accent/15 text-white' : 'border-white/10 text-zinc-300' ?>">All <span class="text-zinc-500"><?= array_sum($counts) ?></span></a>
  <?php foreach (order_statuses() as $k => $label): ?>
  <a href="<?= e(orders_link(['status' => $k, 'page' => 1])) ?>" class="shrink-0 rounded-full border px-4 py-2 text-sm <?= $status === $k ? 'border-accent/60 bg-accent/15 text-white' : 'border-white/10 text-zinc-300' ?>"><?= e($label) ?> <span class="text-zinc-500"><?= $counts[$k] ?? 0 ?></span></a>
  <?php endforeach; ?>
</div>
<form method="get" class="mb-5 flex gap-2">
  <?php if ($status): ?><input type="hidden" name="status" value="<?= e($status) ?>"><?php endif; ?>
  <label class="relative flex-1">
    <span class="sr-only">Search orders</span>
    <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"><?= icon('search', 'h-4 w-4') ?></span>
    <input type="search" name="q" value="<?= e($q) ?>" placeholder="Order number, phone or name" class="field h-11 w-full rounded-xl pl-9 pr-3 text-sm">
  </label>
  <button class="btn-ghost h-11 rounded-xl px-5 text-sm text-white">Search</button>
</form>

<?php if (!$orders): ?>
<div class="panel rounded-2xl p-10 text-center text-sm text-muted">No orders found.</div>
<?php else: ?>
<div class="panel table-wrap rounded-2xl">
  <table class="w-full text-left text-sm">
    <thead class="border-b border-white/[0.06] text-xs uppercase tracking-wider text-zinc-500">
      <tr><th class="px-4 py-3 font-medium">Order</th><th class="px-4 py-3 font-medium">Customer</th><th class="px-4 py-3 font-medium">Total</th><th class="px-4 py-3 font-medium">Payment</th><th class="px-4 py-3 font-medium">Status</th></tr>
    </thead>
    <tbody class="divide-y divide-white/[0.06]">
      <?php foreach ($orders as $o): ?>
      <tr class="hover:bg-white/[0.02]">
        <td class="px-4 py-3"><a href="<?= e(url('admin/order.php?id=' . (int)$o['id'])) ?>" class="font-mono text-white hover:text-accent-soft"><?= e($o['code']) ?></a><div class="text-xs text-zinc-500"><?= e(date('j M, g:i A', strtotime($o['created_at']))) ?></div></td>
        <td class="px-4 py-3"><div class="text-zinc-200"><?= e($o['customer_name']) ?></div><div class="text-xs text-zinc-500"><?= e($o['phone']) ?></div></td>
        <td class="whitespace-nowrap px-4 py-3 text-white" style="font-variant-numeric:tabular-nums"><?= e(money($o['total'])) ?></td>
        <td class="px-4 py-3"><div class="text-xs text-zinc-400"><?= e(payment_methods()[$o['payment_method']] ?? $o['payment_method']) ?></div><?= status_pill($o['payment_status']) ?></td>
        <td class="px-4 py-3"><?= status_pill($o['status']) ?></td>
      </tr>
      <?php endforeach; ?>
    </tbody>
  </table>
</div>
<?php if ($pages > 1): ?>
<nav class="mt-6 flex flex-wrap justify-center gap-2" aria-label="Pages">
  <?php for ($i = 1; $i <= $pages; $i++): ?>
  <a href="<?= e(orders_link(['page' => $i])) ?>" class="inline-flex h-9 min-w-9 items-center justify-center rounded-full border px-3 text-sm <?= $i === $page ? 'border-accent/60 bg-accent/15 text-white' : 'border-white/10 text-zinc-400' ?>"><?= $i ?></a>
  <?php endfor; ?>
</nav>
<?php endif; ?>
<?php endif; ?>
<?php admin_footer();
