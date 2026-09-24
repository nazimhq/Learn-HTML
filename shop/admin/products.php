<?php
require dirname(__DIR__) . '/inc/admin.php';
require_admin();

if (is_post()) {
    csrf_check();
    $id = (int)input('id');
    $p = db_one('SELECT * FROM products WHERE id = ?', [$id]);
    if ($p) {
        switch (input('action')) {
            case 'toggle':
                db_exec('UPDATE products SET active = ?, updated_at = ? WHERE id = ?', [(int)$p['active'] ? 0 : 1, now(), $id]);
                flash('success', '"' . $p['name'] . '" is now ' . ((int)$p['active'] ? 'hidden from' : 'visible in') . ' the shop.');
                break;
            case 'delete':
                $imgs = db_all('SELECT path FROM product_images WHERE product_id = ?', [$id]);
                db_exec('DELETE FROM products WHERE id = ?', [$id]);
                foreach ($imgs as $im) {
                    delete_image_file($im['path']);
                }
                flash('success', '"' . $p['name'] . '" was deleted. Past orders keep their item names.');
                break;
        }
    }
    redirect('admin/products.php' . ($_SERVER['QUERY_STRING'] ? '?' . $_SERVER['QUERY_STRING'] : ''));
}

$q = query('q');
$cat = (int)query('category');
$where = [];
$params = [];
if ($q !== '') {
    $where[] = "p.name LIKE ? ESCAPE '!'";
    $params[] = '%' . str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $q) . '%';
}
if ($cat > 0) {
    $where[] = 'p.category_id = ?';
    $params[] = $cat;
}
$products = db_all(product_select() . ($where ? ' WHERE ' . implode(' AND ', $where) : '') . ' ORDER BY p.created_at DESC, p.id DESC', $params);
$categories = db_all('SELECT id, name FROM categories ORDER BY sort_order, name');

admin_header('Products', 'products');
echo admin_page_title('Products', count($products) . ' shown', '<a href="' . e(url('admin/product-edit.php')) . '" class="btn-primary inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium">' . icon('plus', 'h-4 w-4') . 'Add product</a>');
?>
<form method="get" class="mb-5 flex flex-col gap-2 sm:flex-row">
  <label class="relative flex-1">
    <span class="sr-only">Search products</span>
    <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"><?= icon('search', 'h-4 w-4') ?></span>
    <input type="search" name="q" value="<?= e($q) ?>" placeholder="Search by name" class="field h-11 w-full rounded-xl pl-9 pr-3 text-sm">
  </label>
  <label class="sr-only" for="category">Category</label>
  <select id="category" name="category" class="field h-11 rounded-xl pl-4 text-sm sm:w-56">
    <option value="0">All categories</option>
    <?php foreach ($categories as $c): ?><option value="<?= (int)$c['id'] ?>" <?= $cat === (int)$c['id'] ? 'selected' : '' ?>><?= e($c['name']) ?></option><?php endforeach; ?>
  </select>
  <button class="btn-ghost h-11 rounded-xl px-5 text-sm text-white">Filter</button>
</form>

<?php if (!$products): ?>
<div class="panel rounded-2xl p-10 text-center">
  <p class="font-display text-lg font-semibold text-white">No products yet</p>
  <p class="mt-2 text-sm text-muted">Add your first product with a photo, price and stock.</p>
  <a href="<?= e(url('admin/product-edit.php')) ?>" class="btn-primary mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium"><?= icon('plus', 'h-4 w-4') ?>Add product</a>
</div>
<?php else: ?>
<div class="panel table-wrap rounded-2xl">
  <table class="w-full text-left text-sm">
    <thead class="border-b border-white/[0.06] text-xs uppercase tracking-wider text-zinc-500">
      <tr><th class="px-4 py-3 font-medium">Product</th><th class="px-4 py-3 font-medium">Price</th><th class="px-4 py-3 font-medium">Stock</th><th class="px-4 py-3 font-medium">Status</th><th class="px-4 py-3"><span class="sr-only">Actions</span></th></tr>
    </thead>
    <tbody class="divide-y divide-white/[0.06]">
      <?php foreach ($products as $p): ?>
      <tr class="<?= (int)$p['active'] ? '' : 'opacity-60' ?>">
        <td class="px-4 py-3">
          <a href="<?= e(url('admin/product-edit.php?id=' . (int)$p['id'])) ?>" class="flex items-center gap-3">
            <span class="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#121217]"><?php if ($p['image']): ?><img src="<?= e(image_url($p['image'])) ?>" alt="" loading="lazy" class="absolute inset-0 h-full w-full object-cover"><?php else: ?><?= product_placeholder($p['name']) ?><?php endif; ?></span>
            <span class="min-w-0">
              <span class="block truncate font-medium text-white hover:text-accent-soft"><?= e($p['name']) ?><?= (int)$p['featured'] ? ' <span class="ml-1 rounded bg-accent/20 px-1.5 py-0.5 text-[0.65rem] uppercase text-accent-soft">Featured</span>' : '' ?></span>
              <span class="block text-xs text-zinc-500"><?= e($p['category_name'] ?? 'No category') ?></span>
            </span>
          </a>
        </td>
        <td class="whitespace-nowrap px-4 py-3 text-white" style="font-variant-numeric:tabular-nums"><?= e(money($p['price'])) ?></td>
        <td class="whitespace-nowrap px-4 py-3"><?php if ($p['stock'] === null): ?><span class="text-zinc-400">Unlimited</span><?php elseif ((int)$p['stock'] <= 0): ?><span class="text-red-300">Sold out</span><?php else: ?><span class="<?= (int)$p['stock'] <= 3 ? 'text-amber-200' : 'text-zinc-200' ?>"><?= (int)$p['stock'] ?></span><?php endif; ?></td>
        <td class="px-4 py-3"><?= (int)$p['active'] ? '<span class="text-emerald-300">Visible</span>' : '<span class="text-zinc-400">Hidden</span>' ?></td>
        <td class="px-4 py-3">
          <div class="flex justify-end gap-1.5">
            <a href="<?= e(url('admin/product-edit.php?id=' . (int)$p['id'])) ?>" class="btn-ghost inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs text-white"><?= icon('edit', 'h-3.5 w-3.5') ?>Edit</a>
            <form method="post"><?= csrf_field() ?><input type="hidden" name="action" value="toggle"><input type="hidden" name="id" value="<?= (int)$p['id'] ?>">
              <button class="btn-ghost inline-flex h-9 items-center rounded-lg px-3 text-xs text-white"><?= (int)$p['active'] ? 'Hide' : 'Show' ?></button></form>
            <form method="post" data-confirm="Delete &quot;<?= e($p['name']) ?>&quot;? This cannot be undone."><?= csrf_field() ?><input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="<?= (int)$p['id'] ?>">
              <button class="btn-danger inline-flex h-9 items-center rounded-lg px-3 text-xs" aria-label="Delete <?= e($p['name']) ?>"><?= icon('trash', 'h-3.5 w-3.5') ?></button></form>
          </div>
        </td>
      </tr>
      <?php endforeach; ?>
    </tbody>
  </table>
</div>
<?php endif; ?>
<?php admin_footer();
