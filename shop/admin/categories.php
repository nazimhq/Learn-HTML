<?php
require dirname(__DIR__) . '/inc/admin.php';
require_admin();

if (is_post()) {
    csrf_check();
    $action = input('action');
    $name = input('name');
    $sort = (int)input('sort_order', '0');
    if ($action === 'add' || $action === 'save') {
        if ($name === '' || mb_strlen($name) > 120) {
            flash('error', 'Enter a category name (up to 120 characters).');
        } elseif ($action === 'add') {
            db_insert('categories', ['name' => $name, 'slug' => unique_slug('categories', slugify($name)), 'sort_order' => $sort, 'created_at' => now()]);
            flash('success', 'Category "' . $name . '" added.');
        } else {
            $id = (int)input('id');
            db_exec('UPDATE categories SET name = ?, slug = ?, sort_order = ? WHERE id = ?', [$name, unique_slug('categories', slugify($name), $id), $sort, $id]);
            flash('success', 'Category saved.');
        }
    } elseif ($action === 'delete') {
        $c = db_one('SELECT * FROM categories WHERE id = ?', [(int)input('id')]);
        if ($c) {
            db_exec('UPDATE products SET category_id = NULL WHERE category_id = ?', [$c['id']]);
            db_exec('DELETE FROM categories WHERE id = ?', [$c['id']]);
            flash('success', 'Category "' . $c['name'] . '" deleted. Its products are now uncategorised.');
        }
    }
    redirect('admin/categories.php');
}

$cats = db_all('SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS n FROM categories c ORDER BY c.sort_order, c.name');

admin_header('Categories', 'categories');
echo admin_page_title('Categories', 'Group products so customers can browse them. The first four show in the shop menu.');
?>
<div class="grid gap-6 lg:grid-cols-[1fr_320px]">
  <section class="panel rounded-2xl">
    <?php if ($cats): ?>
    <ul class="divide-y divide-white/[0.06]">
      <?php foreach ($cats as $c): ?>
      <li class="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
        <form method="post" class="flex flex-1 flex-wrap items-center gap-2">
          <?= csrf_field() ?><input type="hidden" name="action" value="save"><input type="hidden" name="id" value="<?= (int)$c['id'] ?>">
          <label class="sr-only" for="n<?= (int)$c['id'] ?>">Name</label>
          <input id="n<?= (int)$c['id'] ?>" name="name" value="<?= e($c['name']) ?>" class="field h-10 min-w-0 flex-1 rounded-lg px-3 text-sm">
          <label class="sr-only" for="s<?= (int)$c['id'] ?>">Sort order</label>
          <input id="s<?= (int)$c['id'] ?>" name="sort_order" value="<?= (int)$c['sort_order'] ?>" inputmode="numeric" title="Sort order" class="field h-10 w-16 rounded-lg px-3 text-center text-sm">
          <button class="btn-ghost h-10 rounded-lg px-3 text-xs text-white">Save</button>
          <span class="w-full text-xs text-zinc-500 sm:w-auto"><?= (int)$c['n'] ?> products</span>
        </form>
        <form method="post" data-confirm="Delete the category &quot;<?= e($c['name']) ?>&quot;? Its products will stay, without a category.">
          <?= csrf_field() ?><input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="<?= (int)$c['id'] ?>">
          <button class="btn-danger inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-xs"><?= icon('trash', 'h-3.5 w-3.5') ?>Delete</button>
        </form>
      </li>
      <?php endforeach; ?>
    </ul>
    <?php else: ?>
    <p class="px-5 py-10 text-center text-sm text-muted">No categories yet. Add one on the right.</p>
    <?php endif; ?>
  </section>

  <form method="post" class="panel h-fit rounded-2xl p-5">
    <?= csrf_field() ?><input type="hidden" name="action" value="add">
    <h2 class="font-display font-semibold text-white">Add a category</h2>
    <label for="newName" class="mt-4 block text-sm font-medium text-zinc-200">Name</label>
    <input id="newName" name="name" required maxlength="120" placeholder="e.g. Birthday Cakes" class="field mt-2 h-11 w-full rounded-xl px-4">
    <label for="newSort" class="mt-4 block text-sm font-medium text-zinc-200">Sort order</label>
    <input id="newSort" name="sort_order" value="0" inputmode="numeric" class="field mt-2 h-11 w-full rounded-xl px-4">
    <button class="btn-primary mt-5 w-full rounded-full px-5 py-3 text-sm font-medium">Add category</button>
  </form>
</div>
<?php admin_footer();
