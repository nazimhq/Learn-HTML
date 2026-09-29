<?php
require __DIR__ . '/inc/bootstrap.php';

if (is_post()) {
    csrf_check();
    $action = input('action');
    $message = '';
    $ok = true;

    if ($action === 'add') {
        $id = (int)input('product_id');
        $qty = max(1, min(CART_MAX_QTY, (int)input('qty', '1')));
        $p = db_one('SELECT id, name, stock FROM products WHERE id = ? AND active = 1', [$id]);
        if (!$p) {
            $ok = false;
            $message = 'That product is no longer available.';
        } else {
            $inCart = cart_raw()[$id] ?? 0;
            if ($p['stock'] !== null && $inCart + $qty > (int)$p['stock']) {
                $qty = (int)$p['stock'] - $inCart;
            }
            if ($qty <= 0) {
                $ok = false;
                $message = 'No more "' . $p['name'] . '" in stock.';
            } else {
                cart_add($id, $qty);
                $message = 'Added "' . $p['name'] . '" to your cart';
            }
        }
    } elseif ($action === 'update') {
        foreach ((array)($_POST['qty'] ?? []) as $id => $qty) {
            cart_set((int)$id, max(0, min(CART_MAX_QTY, (int)$qty)));
        }
        $message = 'Cart updated';
    } elseif ($action === 'remove') {
        cart_set((int)input('product_id'), 0);
        $message = 'Removed from cart';
    }

    if (is_ajax()) {
        json_out(['ok' => $ok, 'message' => $message, 'count' => cart_count()]);
    }
    flash($ok ? 'success' : 'error', $message);
    redirect('cart.php');
}

$cart = cart_lines();
if ($cart['changed']) {
    flash('info', 'Some items changed because of stock updates. Please check your cart.');
}
$zones = delivery_zones();
$freeMin = (int)setting('free_delivery_min');

store_header('Your cart', ['noindex' => true]);
?>
<section class="mx-auto max-w-site px-4 pt-10 sm:px-6 md:pt-14">
  <h1 class="font-display text-3xl font-semibold tracking-tight text-white sm:text-5xl">Your cart</h1>

  <?php if (!$cart['lines']): ?>
  <div class="panel mt-8 rounded-3xl p-10 text-center">
    <span class="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent-soft"><?= icon('cart', 'h-6 w-6') ?></span>
    <p class="mt-5 font-display text-xl font-semibold text-white">Your cart is empty</p>
    <p class="mt-2 text-muted">Add a few products and they'll show up here.</p>
    <a href="<?= e(url('shop.php')) ?>" class="btn-primary mt-7 inline-flex items-center gap-2 rounded-full px-6 py-3 font-medium">Browse products<?= icon('arrow', 'h-4 w-4') ?></a>
  </div>
  <?php else: ?>
  <div class="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
    <div>
      <form id="cartForm" method="post" action="<?= e(url('cart.php')) ?>">
        <?= csrf_field() ?>
        <input type="hidden" name="action" value="update">
        <ul class="flex flex-col gap-3">
          <?php foreach ($cart['lines'] as $l): $p = $l['product']; $max = $p['stock'] === null ? CART_MAX_QTY : min(CART_MAX_QTY, (int)$p['stock']); ?>
          <li class="card flex gap-4 rounded-2xl p-3 sm:p-4">
            <a href="<?= e(url('product.php?p=' . rawurlencode($p['slug']))) ?>" class="relative block h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-[#121217] sm:h-28 sm:w-28">
              <?php if ($p['image']): ?><img src="<?= e(image_url($p['image'])) ?>" alt="<?= e($p['name']) ?>" class="absolute inset-0 h-full w-full object-cover"><?php else: ?><?= product_placeholder($p['name']) ?><?php endif; ?>
            </a>
            <div class="flex min-w-0 flex-1 flex-col">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <a href="<?= e(url('product.php?p=' . rawurlencode($p['slug']))) ?>" class="font-display font-semibold text-white hover:text-accent-soft"><?= e($p['name']) ?></a>
                  <p class="mt-1 text-sm text-muted"><?= e(money($p['price'])) ?> each</p>
                </div>
                <p class="shrink-0 font-display font-semibold text-white" style="font-variant-numeric:tabular-nums"><?= e(money($l['line_total'])) ?></p>
              </div>
              <div class="mt-auto flex items-center justify-between gap-3 pt-3">
                <div data-qty class="inline-flex h-10 items-center rounded-full border border-white/15">
                  <button type="button" data-step="-1" class="inline-flex h-10 w-10 items-center justify-center text-zinc-300 hover:text-white" aria-label="Decrease quantity"><?= icon('minus', 'h-4 w-4') ?></button>
                  <label class="sr-only" for="q<?= (int)$p['id'] ?>">Quantity for <?= e($p['name']) ?></label>
                  <input id="q<?= (int)$p['id'] ?>" data-autosubmit type="number" name="qty[<?= (int)$p['id'] ?>]" value="<?= (int)$l['qty'] ?>" min="1" max="<?= $max ?>" inputmode="numeric" class="h-10 w-10 bg-transparent text-center text-white [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none">
                  <button type="button" data-step="1" class="inline-flex h-10 w-10 items-center justify-center text-zinc-300 hover:text-white" aria-label="Increase quantity"><?= icon('plus', 'h-4 w-4') ?></button>
                </div>
                <button type="submit" form="remove<?= (int)$p['id'] ?>" class="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-red-300"><?= icon('trash', 'h-4 w-4') ?>Remove</button>
              </div>
            </div>
          </li>
          <?php endforeach; ?>
        </ul>
        <noscript><button class="btn-ghost mt-4 rounded-full px-5 py-2.5 text-sm text-white">Update cart</button></noscript>
      </form>
      <?php foreach ($cart['lines'] as $l): ?>
      <form id="remove<?= (int)$l['product']['id'] ?>" method="post" action="<?= e(url('cart.php')) ?>" hidden>
        <?= csrf_field() ?><input type="hidden" name="action" value="remove"><input type="hidden" name="product_id" value="<?= (int)$l['product']['id'] ?>">
      </form>
      <?php endforeach; ?>
      <a href="<?= e(url('shop.php')) ?>" class="mt-6 inline-flex items-center gap-2 text-sm text-muted hover:text-white"><?= icon('arrow-left', 'h-4 w-4') ?>Continue shopping</a>
    </div>

    <aside class="panel h-fit rounded-3xl p-6 lg:sticky lg:top-24">
      <h2 class="font-display text-lg font-semibold text-white">Summary</h2>
      <dl class="mt-5 flex flex-col gap-3 text-sm">
        <div class="flex justify-between"><dt class="text-muted">Subtotal (<?= $cart['count'] ?> items)</dt><dd class="text-white" style="font-variant-numeric:tabular-nums"><?= e(money($cart['subtotal'])) ?></dd></div>
        <div class="flex justify-between gap-4"><dt class="text-muted">Delivery</dt><dd class="text-right text-zinc-300"><?= $freeMin > 0 && $cart['subtotal'] >= $freeMin ? 'Free' : 'From ' . e(money(min($zones['inside']['fee'], $zones['outside']['fee']))) ?></dd></div>
      </dl>
      <?php if ($freeMin > 0 && $cart['subtotal'] < $freeMin): ?>
      <p class="mt-4 rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-accent-soft">Add <?= e(money($freeMin - $cart['subtotal'])) ?> more for free delivery.</p>
      <?php endif; ?>
      <a href="<?= e(url('checkout.php')) ?>" class="btn-primary mt-6 flex items-center justify-center gap-2 rounded-full px-6 py-3.5 font-medium">Checkout<?= icon('arrow', 'h-4 w-4') ?></a>
      <p class="mt-3 text-center text-xs text-zinc-500">Delivery charge is shown at checkout.</p>
    </aside>
  </div>
  <?php endif; ?>
</section>
<?php store_footer();
