<?php
require __DIR__ . '/inc/bootstrap.php';

const PER_PAGE = 12;

$catSlug = query('category');
$q = mb_substr(query('q'), 0, 80);
$sort = query('sort', 'new');
$page = max(1, (int)query('page', '1'));

$category = $catSlug !== '' ? db_one('SELECT * FROM categories WHERE slug = ?', [$catSlug]) : null;
$categories = db_all('SELECT name, slug FROM categories ORDER BY sort_order, name');

$where = ['p.active = 1'];
$params = [];
if ($category) {
    $where[] = 'p.category_id = ?';
    $params[] = $category['id'];
}
if ($q !== '') {
    $where[] = "(p.name LIKE ? ESCAPE '!' OR p.short_desc LIKE ? ESCAPE '!')";
    $like = '%' . str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $q) . '%';
    $params[] = $like;
    $params[] = $like;
}
$orderBy = match ($sort) {
    'price_asc' => 'p.price ASC, p.id DESC',
    'price_desc' => 'p.price DESC, p.id DESC',
    'name' => 'p.name ASC',
    default => 'p.created_at DESC, p.id DESC',
};
$whereSql = ' WHERE ' . implode(' AND ', $where);
$total = (int)db_val('SELECT COUNT(*) FROM products p' . $whereSql, $params);
$pages = max(1, (int)ceil($total / PER_PAGE));
$page = min($page, $pages);
$products = db_all(product_select() . $whereSql . ' ORDER BY ' . $orderBy . ' LIMIT ' . PER_PAGE . ' OFFSET ' . (($page - 1) * PER_PAGE), $params);

function shop_link(array $changes): string
{
    $params = array_filter(array_merge([
        'category' => query('category'),
        'q' => query('q'),
        'sort' => query('sort'),
    ], $changes), fn($v) => $v !== '' && $v !== null && $v !== 'new' && $v !== 1);
    return url('shop.php' . ($params ? '?' . http_build_query($params) : ''));
}

$title = $category ? $category['name'] : ($q !== '' ? 'Search: ' . $q : 'Shop all');
store_header($title, ['canonical' => abs_url($category ? 'shop.php?category=' . rawurlencode($category['slug']) : 'shop.php'), 'noindex' => $q !== '']);
?>
<section class="mx-auto max-w-site px-4 pt-10 sm:px-6 md:pt-14">
  <nav class="text-sm text-zinc-500" aria-label="Breadcrumb">
    <a href="<?= e(url('')) ?>" class="hover:text-white">Home</a> <span aria-hidden="true">/</span>
    <span class="text-zinc-300"><?= e($category ? $category['name'] : 'Shop') ?></span>
  </nav>
  <h1 class="mt-4 font-display text-3xl font-semibold tracking-tight text-white sm:text-5xl"><?= e($title) ?></h1>
  <p class="mt-3 text-muted"><?= $total ?> <?= $total === 1 ? 'product' : 'products' ?></p>

  <div class="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
    <div class="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="list">
      <a role="listitem" href="<?= e(shop_link(['category' => '', 'page' => 1])) ?>" class="shrink-0 rounded-full border px-4 py-2 text-sm <?= !$category ? 'border-accent/60 bg-accent/15 text-white' : 'border-white/10 text-zinc-300 hover:border-white/25' ?>">All</a>
      <?php foreach ($categories as $c): ?>
      <a role="listitem" href="<?= e(shop_link(['category' => $c['slug'], 'page' => 1])) ?>" class="shrink-0 rounded-full border px-4 py-2 text-sm <?= $category && $category['slug'] === $c['slug'] ? 'border-accent/60 bg-accent/15 text-white' : 'border-white/10 text-zinc-300 hover:border-white/25' ?>"><?= e($c['name']) ?></a>
      <?php endforeach; ?>
    </div>
    <form method="get" action="<?= e(url('shop.php')) ?>" class="flex gap-2">
      <?php if ($category): ?><input type="hidden" name="category" value="<?= e($category['slug']) ?>"><?php endif; ?>
      <label class="relative flex-1 lg:w-60">
        <span class="sr-only">Search</span>
        <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"><?= icon('search', 'h-4 w-4') ?></span>
        <input type="search" name="q" value="<?= e($q) ?>" placeholder="Search" class="field h-10 w-full rounded-full pl-9 pr-3 text-sm">
      </label>
      <label class="sr-only" for="sort">Sort by</label>
      <select id="sort" name="sort" class="field h-10 rounded-full pl-4 text-sm" onchange="this.form.submit()">
        <option value="new" <?= $sort === 'new' ? 'selected' : '' ?>>Newest</option>
        <option value="price_asc" <?= $sort === 'price_asc' ? 'selected' : '' ?>>Price: low to high</option>
        <option value="price_desc" <?= $sort === 'price_desc' ? 'selected' : '' ?>>Price: high to low</option>
        <option value="name" <?= $sort === 'name' ? 'selected' : '' ?>>Name</option>
      </select>
      <noscript><button class="btn-ghost rounded-full px-4 text-sm">Go</button></noscript>
    </form>
  </div>

  <?php if ($products): ?>
  <div class="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
    <?php foreach ($products as $p): ?><?= product_card($p) ?><?php endforeach; ?>
  </div>
  <?php if ($pages > 1): ?>
  <nav class="mt-12 flex items-center justify-center gap-2" aria-label="Pages">
    <?php for ($i = 1; $i <= $pages; $i++): ?>
    <a href="<?= e(shop_link(['page' => $i])) ?>" class="inline-flex h-10 min-w-10 items-center justify-center rounded-full border px-3 text-sm <?= $i === $page ? 'border-accent/60 bg-accent/15 text-white' : 'border-white/10 text-zinc-400 hover:text-white' ?>" <?= $i === $page ? 'aria-current="page"' : '' ?>><?= $i ?></a>
    <?php endfor; ?>
  </nav>
  <?php endif; ?>
  <?php else: ?>
  <div class="panel mt-8 rounded-3xl p-10 text-center">
    <p class="font-display text-xl font-semibold text-white">No products found</p>
    <p class="mt-2 text-muted">Try a different search or category.</p>
    <a href="<?= e(url('shop.php')) ?>" class="btn-ghost mt-6 inline-flex rounded-full px-5 py-2.5 text-sm text-white">See all products</a>
  </div>
  <?php endif; ?>
</section>
<?php store_footer();
