<?php
require __DIR__ . '/inc/bootstrap.php';

$featured = db_all(product_select() . ' WHERE p.active = 1 AND p.featured = 1 ORDER BY p.sort_order, p.id DESC LIMIT 4');
$latest = db_all(product_select() . ' WHERE p.active = 1 ORDER BY p.created_at DESC, p.id DESC LIMIT 8');
$categories = db_all(
    'SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.active = 1) AS n,
       (SELECT i.path FROM product_images i JOIN products p2 ON p2.id = i.product_id
         WHERE p2.category_id = c.id AND p2.active = 1 ORDER BY p2.featured DESC, i.sort_order, i.id LIMIT 1) AS image
     FROM categories c ORDER BY c.sort_order, c.name'
);
$heroProducts = array_slice($featured ?: $latest, 0, 4);
$zones = delivery_zones();
$freeMin = (int)setting('free_delivery_min');
$methods = enabled_payment_methods();

store_header('', ['canonical' => abs_url('')]);
?>
<section class="relative overflow-hidden">
  <div class="hero-glow pointer-events-none absolute inset-0" aria-hidden="true"></div>
  <div class="hero-grid pointer-events-none absolute inset-0" aria-hidden="true"></div>
  <div class="relative mx-auto grid max-w-site items-center gap-12 px-4 pb-16 pt-12 sm:px-6 md:pb-24 md:pt-20 lg:grid-cols-[1.1fr_0.9fr]">
    <div>
      <?php if (setting('hero_eyebrow') !== ''): ?>
      <p class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-accent-soft">
        <span class="h-1.5 w-1.5 rounded-full bg-accent-2 shadow-[0_0_10px_rgba(168,85,247,1)]" aria-hidden="true"></span><?= e(setting('hero_eyebrow')) ?>
      </p>
      <?php endif; ?>
      <h1 class="text-gradient mt-6 font-display text-[2.4rem] font-semibold leading-[1.06] tracking-tight sm:text-5xl lg:text-[3.5rem]"><?= e(setting('hero_title')) ?></h1>
      <p class="mt-6 max-w-xl text-lg leading-relaxed text-muted"><?= e(setting('hero_text')) ?></p>
      <div class="mt-9 flex flex-col gap-3 sm:flex-row">
        <a href="<?= e(url('shop.php')) ?>" class="btn-primary inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 font-medium"><?= icon('cart', 'h-4 w-4') ?>Shop now</a>
        <?php if (whatsapp_ready()): ?>
        <a href="<?= e(wa_link('Hello ' . setting('store_name') . ', I would like to place an order.')) ?>" target="_blank" rel="noopener" class="btn-ghost inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 font-medium text-white"><?= icon('message', 'h-4 w-4') ?>Order on WhatsApp</a>
        <?php endif; ?>
      </div>
    </div>

    <?php if ($heroProducts): ?>
    <div class="grid grid-cols-2 gap-3 sm:gap-4" aria-label="Featured products">
      <?php foreach ($heroProducts as $i => $p): ?>
      <a href="<?= e(url('product.php?p=' . rawurlencode($p['slug']))) ?>" class="card group relative block overflow-hidden rounded-2xl <?= $i % 2 ? 'translate-y-6' : '' ?>">
        <div class="relative aspect-[4/5] overflow-hidden bg-[#121217]">
          <?php if ($p['image']): ?>
          <img src="<?= e(image_url($p['image'])) ?>" alt="<?= e($p['name']) ?>" class="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" <?= $i > 1 ? 'loading="lazy"' : '' ?>>
          <?php else: ?><?= product_placeholder($p['name']) ?><?php endif; ?>
          <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3 pt-10 sm:p-4 sm:pt-12">
            <p class="truncate text-sm font-medium text-white"><?= e($p['name']) ?></p>
            <p class="mt-0.5 text-sm text-accent-soft" style="font-variant-numeric:tabular-nums"><?= e(money($p['price'])) ?></p>
          </div>
        </div>
      </a>
      <?php endforeach; ?>
    </div>
    <?php endif; ?>
  </div>
</section>

<!-- How buying works: facts from the shop's own settings -->
<section class="border-y border-white/[0.06] bg-white/[0.015]">
  <div class="mx-auto grid max-w-site gap-6 px-4 py-8 sm:grid-cols-3 sm:px-6">
    <div class="flex items-start gap-3">
      <span class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-accent-soft"><?= icon('truck') ?></span>
      <div>
        <p class="font-medium text-white">Home delivery</p>
        <p class="mt-1 text-sm text-muted"><?= e($zones['inside']['label']) ?>: <?= e(money($zones['inside']['fee'])) ?><?= $freeMin > 0 ? ' · Free over ' . e(money($freeMin)) : '' ?></p>
      </div>
    </div>
    <div class="flex items-start gap-3">
      <span class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-accent-soft"><?= icon('cash') ?></span>
      <div>
        <p class="font-medium text-white">Easy payment</p>
        <p class="mt-1 text-sm text-muted"><?= e($methods ? implode(', ', array_map(fn($m) => $m === 'Confirm on WhatsApp' ? 'WhatsApp' : $m, array_values($methods))) : 'Contact us to order') ?></p>
      </div>
    </div>
    <div class="flex items-start gap-3">
      <span class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-accent-soft"><?= icon('message') ?></span>
      <div>
        <p class="font-medium text-white">Talk to a real person</p>
        <p class="mt-1 text-sm text-muted">Questions about an order? Message us and we'll reply.</p>
      </div>
    </div>
  </div>
</section>

<?php if ($categories): ?>
<section class="mx-auto max-w-site px-4 pt-20 sm:px-6">
  <div class="flex items-end justify-between gap-4">
    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-accent-soft">Categories</p>
      <h2 class="mt-3 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">Shop by category</h2>
    </div>
  </div>
  <div class="mt-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
    <?php foreach ($categories as $c): ?>
    <a href="<?= e(url('shop.php?category=' . rawurlencode($c['slug']))) ?>" class="card group relative block overflow-hidden rounded-2xl" data-reveal>
      <div class="relative aspect-[4/3] overflow-hidden">
        <?php if ($c['image']): ?>
        <img src="<?= e(image_url($c['image'])) ?>" alt="" loading="lazy" class="absolute inset-0 h-full w-full object-cover opacity-70 transition-transform duration-500 group-hover:scale-[1.04]">
        <?php else: ?><?= product_placeholder($c['name'], 'opacity-80') ?><?php endif; ?>
        <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent"></div>
        <div class="absolute inset-x-0 bottom-0 p-4">
          <p class="font-display text-lg font-semibold text-white"><?= e($c['name']) ?></p>
          <p class="text-xs text-zinc-400"><?= (int)$c['n'] ?> <?= (int)$c['n'] === 1 ? 'product' : 'products' ?></p>
        </div>
      </div>
    </a>
    <?php endforeach; ?>
  </div>
</section>
<?php endif; ?>

<?php foreach ([['Featured', 'Our picks', $featured], ['New in', 'Latest products', $latest]] as [$eyebrow, $heading, $list]): ?>
  <?php if (!$list) { continue; } ?>
<section class="mx-auto max-w-site px-4 pt-20 sm:px-6">
  <div class="flex items-end justify-between gap-4">
    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-accent-soft"><?= e($eyebrow) ?></p>
      <h2 class="mt-3 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl"><?= e($heading) ?></h2>
    </div>
    <a href="<?= e(url('shop.php')) ?>" class="hidden shrink-0 items-center gap-1.5 text-sm text-muted hover:text-white sm:inline-flex">View all<?= icon('arrow', 'h-4 w-4') ?></a>
  </div>
  <div class="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
    <?php foreach ($list as $p): ?><?= product_card($p) ?><?php endforeach; ?>
  </div>
</section>
<?php endforeach; ?>

<?php if (!$latest): ?>
<section class="mx-auto max-w-site px-4 pt-20 text-center sm:px-6">
  <div class="panel mx-auto max-w-lg rounded-3xl p-10">
    <span class="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent-soft"><?= icon('box', 'h-6 w-6') ?></span>
    <h2 class="mt-5 font-display text-2xl font-semibold text-white">Products coming soon</h2>
    <p class="mt-3 text-muted">We're adding products right now. Please check back shortly.</p>
  </div>
</section>
<?php endif; ?>

<?php if (whatsapp_ready()): ?>
<section class="mx-auto max-w-site px-4 pt-24 sm:px-6">
  <div class="relative overflow-hidden rounded-3xl border border-accent/40 bg-panel px-6 py-12 text-center sm:px-12 md:py-16" data-reveal>
    <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_100%,rgba(139,92,246,0.28),transparent_70%)]" aria-hidden="true"></div>
    <div class="relative">
      <h2 class="mx-auto max-w-2xl font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">Can't find what you want?</h2>
      <p class="mx-auto mt-4 max-w-xl text-lg text-muted">Send us a message. We take custom orders and answer questions about any product.</p>
      <a href="<?= e(wa_link('Hello ' . setting('store_name') . ', I am looking for something specific.')) ?>" target="_blank" rel="noopener" class="btn-primary mt-8 inline-flex items-center gap-2 rounded-full px-7 py-3.5 font-medium"><?= icon('message', 'h-4 w-4') ?>Message us on WhatsApp</a>
    </div>
  </div>
</section>
<?php endif; ?>
<?php store_footer();
