<?php
require __DIR__ . '/inc/bootstrap.php';

$p = db_one(product_select() . ' WHERE p.slug = ? AND p.active = 1', [query('p')]);
if (!$p) {
    http_response_code(404);
    store_header('Product not found', ['noindex' => true]);
    echo '<section class="mx-auto max-w-site px-4 py-24 text-center sm:px-6"><h1 class="font-display text-3xl font-semibold text-white">Product not found</h1>'
        . '<p class="mt-3 text-muted">It may have been removed or renamed.</p>'
        . '<a href="' . e(url('shop.php')) . '" class="btn-primary mt-8 inline-flex rounded-full px-6 py-3 font-medium">Back to shop</a></section>';
    store_footer();
    exit;
}

$images = db_all('SELECT path FROM product_images WHERE product_id = ? ORDER BY sort_order, id', [$p['id']]);
$related = db_all(
    product_select() . ' WHERE p.active = 1 AND p.id <> ? AND (p.category_id = ? OR ? IS NULL) ORDER BY p.featured DESC, p.id DESC LIMIT 4',
    [$p['id'], $p['category_id'], $p['category_id']]
);
$soldOut = $p['stock'] !== null && (int)$p['stock'] <= 0;
$maxQty = $p['stock'] === null ? CART_MAX_QTY : max(1, min(CART_MAX_QTY, (int)$p['stock']));
$productUrl = abs_url('product.php?p=' . rawurlencode($p['slug']));
$waMsg = 'Hello ' . setting('store_name') . ", I'd like to order:\n" . $p['name'] . ' (' . money($p['price']) . ")\n" . $productUrl;

store_header($p['name'], [
    'description' => $p['short_desc'] !== '' ? $p['short_desc'] : mb_substr(trim(preg_replace('/\s+/', ' ', (string)$p['description'])), 0, 160),
    'canonical' => $productUrl,
    'image' => $images ? abs_url('uploads/' . $images[0]['path']) : '',
    'og_type' => 'product',
]);
?>
<section class="mx-auto max-w-site px-4 pt-8 sm:px-6 md:pt-12">
  <nav class="text-sm text-zinc-500" aria-label="Breadcrumb">
    <a href="<?= e(url('')) ?>" class="hover:text-white">Home</a> <span aria-hidden="true">/</span>
    <?php if ($p['category_slug']): ?>
    <a href="<?= e(url('shop.php?category=' . rawurlencode($p['category_slug']))) ?>" class="hover:text-white"><?= e($p['category_name']) ?></a> <span aria-hidden="true">/</span>
    <?php endif; ?>
    <span class="text-zinc-300"><?= e($p['name']) ?></span>
  </nav>

  <div class="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-14">
    <div>
      <div class="card relative aspect-square overflow-hidden rounded-3xl bg-[#121217]">
        <?php if ($images): ?>
        <img id="galleryMain" src="<?= e(image_url($images[0]['path'])) ?>" alt="<?= e($p['name']) ?>" class="absolute inset-0 h-full w-full object-cover">
        <?php else: ?><?= product_placeholder($p['name']) ?><?php endif; ?>
        <?php if ($b = stock_badge($p)): ?><span class="absolute left-4 top-4"><?= $b ?></span><?php endif; ?>
      </div>
      <?php if (count($images) > 1): ?>
      <div class="mt-3 grid grid-cols-5 gap-2">
        <?php foreach ($images as $i => $img): ?>
        <button type="button" data-gallery-thumb data-src="<?= e(image_url($img['path'])) ?>" aria-current="<?= $i === 0 ? 'true' : 'false' ?>" class="relative aspect-square overflow-hidden rounded-xl border border-white/10 aria-[current=true]:border-accent" aria-label="Show image <?= $i + 1 ?>">
          <img src="<?= e(image_url($img['path'])) ?>" alt="" loading="lazy" class="absolute inset-0 h-full w-full object-cover">
        </button>
        <?php endforeach; ?>
      </div>
      <?php endif; ?>
    </div>

    <div class="lg:pt-4">
      <?php if ($p['category_name']): ?><p class="text-xs font-semibold uppercase tracking-[0.18em] text-accent-soft"><?= e($p['category_name']) ?></p><?php endif; ?>
      <h1 class="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight text-white sm:text-[2.6rem]"><?= e($p['name']) ?></h1>
      <p class="mt-5 flex items-baseline gap-3"><?= price_html($p, 'text-3xl') ?></p>
      <?php if ($p['short_desc'] !== ''): ?><p class="mt-5 text-lg leading-relaxed text-muted"><?= e($p['short_desc']) ?></p><?php endif; ?>

      <p class="mt-5 inline-flex items-center gap-2 text-sm <?= $soldOut ? 'text-red-300' : 'text-emerald-300' ?>">
        <span class="h-2 w-2 rounded-full <?= $soldOut ? 'bg-red-400' : 'bg-emerald-400' ?>" aria-hidden="true"></span>
        <?php if ($soldOut): ?>Sold out<?php elseif ($p['stock'] !== null && (int)$p['stock'] <= 5): ?>Only <?= (int)$p['stock'] ?> left<?php else: ?>In stock<?php endif; ?>
      </p>

      <?php if (!$soldOut): ?>
      <form method="post" action="<?= e(url('cart.php')) ?>" data-add-to-cart class="mt-8 flex gap-3">
        <?= csrf_field() ?>
        <input type="hidden" name="action" value="add">
        <input type="hidden" name="product_id" value="<?= (int)$p['id'] ?>">
        <div data-qty class="inline-flex h-12 shrink-0 items-center rounded-full border border-white/15">
          <button type="button" data-step="-1" class="inline-flex h-12 w-12 items-center justify-center text-zinc-300 hover:text-white" aria-label="Decrease quantity"><?= icon('minus', 'h-4 w-4') ?></button>
          <label class="sr-only" for="qty">Quantity</label>
          <input id="qty" type="number" name="qty" value="1" min="1" max="<?= $maxQty ?>" inputmode="numeric" class="h-12 w-12 bg-transparent text-center text-white [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none">
          <button type="button" data-step="1" class="inline-flex h-12 w-12 items-center justify-center text-zinc-300 hover:text-white" aria-label="Increase quantity"><?= icon('plus', 'h-4 w-4') ?></button>
        </div>
        <button type="submit" class="btn-primary inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full px-5 font-medium"><?= icon('cart', 'h-4 w-4') ?>Add to cart</button>
      </form>
      <?php endif; ?>
      <div class="mt-3 flex flex-col gap-3 sm:flex-row">
        <a href="<?= e(url('cart.php')) ?>" class="btn-ghost inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-medium text-white sm:flex-1">View cart</a>
        <?php if (whatsapp_ready()): ?>
        <a href="<?= e(wa_link($waMsg)) ?>" target="_blank" rel="noopener" class="btn-ghost inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-medium text-white sm:flex-1"><?= icon('message', 'h-4 w-4') ?>Ask on WhatsApp</a>
        <?php endif; ?>
      </div>

      <ul class="mt-8 grid gap-3 border-t border-white/[0.08] pt-6 text-sm text-muted">
        <?php foreach (delivery_zones() as $z): ?>
        <li class="flex items-center gap-3"><?= icon('truck', 'h-4 w-4 text-accent-soft') ?><?= e($z['label']) ?>: <?= e(money($z['fee'])) ?></li>
        <?php endforeach; ?>
        <?php if ((int)setting('free_delivery_min') > 0): ?><li class="flex items-center gap-3"><?= icon('tag', 'h-4 w-4 text-accent-soft') ?>Free delivery on orders over <?= e(money(setting('free_delivery_min'))) ?></li><?php endif; ?>
        <?php if (setting('cod_enabled') === '1'): ?><li class="flex items-center gap-3"><?= icon('cash', 'h-4 w-4 text-accent-soft') ?>Cash on delivery available</li><?php endif; ?>
      </ul>

      <?php if (trim((string)$p['description']) !== ''): ?>
      <div class="mt-8 border-t border-white/[0.08] pt-6">
        <h2 class="font-display text-lg font-semibold text-white">Details</h2>
        <div class="prose-plain mt-3 leading-relaxed text-muted">
          <?php foreach (preg_split('/\n\s*\n/', trim((string)$p['description'])) as $para): ?><p><?= nl2br(e(trim($para))) ?></p><?php endforeach; ?>
        </div>
      </div>
      <?php endif; ?>
    </div>
  </div>
</section>

<?php if ($related): ?>
<section class="mx-auto max-w-site px-4 pt-24 sm:px-6">
  <h2 class="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">You may also like</h2>
  <div class="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
    <?php foreach ($related as $i => $r): ?><?= product_card($r, count($related) % 2 === 1 && $i === count($related) - 1) ?><?php endforeach; ?>
  </div>
</section>
<?php endif; ?>
<?php store_footer();
