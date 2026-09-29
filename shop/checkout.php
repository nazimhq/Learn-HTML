<?php
require __DIR__ . '/inc/bootstrap.php';

$cart = cart_lines();
if (!$cart['lines']) {
    flash('info', 'Your cart is empty.');
    redirect('cart.php');
}

$methods = enabled_payment_methods();
$zones = delivery_zones();
$errors = [];
$old = [
    'name' => '', 'phone' => '', 'email' => '', 'address' => '', 'note' => '',
    'zone' => 'inside', 'payment_method' => array_key_first($methods) ?? '',
];

if (is_post()) {
    csrf_check();
    foreach ($old as $k => $_) {
        $old[$k] = input($k, $old[$k]);
    }
    $phone = normalize_bd_phone($old['phone']);

    if (mb_strlen($old['name']) < 2 || mb_strlen($old['name']) > 120) {
        $errors['name'] = 'Please enter your name.';
    }
    if ($phone === '') {
        $errors['phone'] = 'Please enter a valid mobile number, like 01712345678.';
    }
    if ($old['email'] !== '' && !filter_var($old['email'], FILTER_VALIDATE_EMAIL)) {
        $errors['email'] = 'This email address doesn\'t look right.';
    }
    if (mb_strlen($old['address']) < 8 || mb_strlen($old['address']) > 500) {
        $errors['address'] = 'Please enter your full delivery address.';
    }
    if (mb_strlen($old['note']) > 500) {
        $errors['note'] = 'Please keep the note under 500 characters.';
    }
    if (!isset($zones[$old['zone']])) {
        $errors['zone'] = 'Please choose a delivery area.';
    }
    if (!isset($methods[$old['payment_method']])) {
        $errors['payment_method'] = 'Please choose how you want to pay.';
    }

    if (!$errors) {
        try {
            $order = place_order([
                'name' => $old['name'],
                'phone' => $phone,
                'email' => $old['email'],
                'address' => $old['address'],
                'note' => $old['note'],
            ], $old['zone'], $old['payment_method']);
        } catch (RuntimeException $ex) {
            flash('error', $ex->getMessage());
            redirect('cart.php');
        }

        $_SESSION['my_orders'][] = $order['code'];

        if ($order['payment_method'] === 'online') {
            $pay = ssl_start_payment($order);
            if ($pay['ok']) {
                redirect($pay['url']);
            }
            flash('error', $pay['error']);
        } elseif ($order['payment_method'] === 'whatsapp') {
            flash('success', 'Order saved. Tap the button below to send it to us on WhatsApp.');
        } else {
            flash('success', 'Thank you! Your order has been placed.');
        }
        redirect(order_url($order));
    }
    $cart = cart_lines();
}

$freeMin = (int)setting('free_delivery_min');

function field_error(array $errors, string $k): string
{
    return isset($errors[$k]) ? '<p class="mt-1.5 text-sm text-red-300" id="err-' . e($k) . '">' . e($errors[$k]) . '</p>' : '';
}
function invalid(array $errors, string $k): string
{
    return isset($errors[$k]) ? ' aria-invalid="true" aria-describedby="err-' . e($k) . '" style="border-color:rgba(248,113,113,.6)"' : '';
}

store_header('Checkout', ['noindex' => true]);
?>
<section class="mx-auto max-w-site px-4 pt-10 sm:px-6 md:pt-14">
  <a href="<?= e(url('cart.php')) ?>" class="inline-flex items-center gap-2 text-sm text-muted hover:text-white"><?= icon('arrow-left', 'h-4 w-4') ?>Back to cart</a>
  <h1 class="mt-4 font-display text-3xl font-semibold tracking-tight text-white sm:text-5xl">Checkout</h1>

  <?php if ($errors): ?>
  <div class="mt-6 flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200" role="alert">
    <?= icon('alert', 'mt-0.5 h-4 w-4 shrink-0') ?><span>Please fix the highlighted fields below.</span>
  </div>
  <?php endif; ?>

  <?php if (!$methods): ?>
  <div class="panel mt-8 rounded-3xl p-8 text-center">
    <p class="font-display text-xl font-semibold text-white">Online ordering is paused</p>
    <p class="mt-2 text-muted">Please contact the shop to place your order<?= setting('phone') ? ': ' . e(setting('phone')) : '' ?>.</p>
  </div>
  <?php else: ?>
  <form id="checkoutForm" method="post" action="<?= e(url('checkout.php')) ?>" class="mt-8 grid gap-8 lg:grid-cols-[1fr_400px]" novalidate>
    <?= csrf_field() ?>
    <div class="flex flex-col gap-8">
      <fieldset class="panel rounded-3xl p-6 sm:p-8">
        <legend class="sr-only">Your details</legend>
        <h2 class="font-display text-lg font-semibold text-white">1. Your details</h2>
        <div class="mt-6 grid gap-5 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <label for="name" class="text-sm font-medium text-zinc-200">Full name</label>
            <input id="name" name="name" value="<?= e($old['name']) ?>" required autocomplete="name" class="field mt-2 h-12 w-full rounded-xl px-4"<?= invalid($errors, 'name') ?>>
            <?= field_error($errors, 'name') ?>
          </div>
          <div>
            <label for="phone" class="text-sm font-medium text-zinc-200">Mobile number</label>
            <input id="phone" name="phone" type="tel" value="<?= e($old['phone']) ?>" required autocomplete="tel" inputmode="tel" placeholder="01XXXXXXXXX" class="field mt-2 h-12 w-full rounded-xl px-4"<?= invalid($errors, 'phone') ?>>
            <?= field_error($errors, 'phone') ?>
          </div>
          <div>
            <label for="email" class="text-sm font-medium text-zinc-200">Email <span class="font-normal text-zinc-500">(optional)</span></label>
            <input id="email" name="email" type="email" value="<?= e($old['email']) ?>" autocomplete="email" class="field mt-2 h-12 w-full rounded-xl px-4"<?= invalid($errors, 'email') ?>>
            <?= field_error($errors, 'email') ?>
          </div>
          <div class="sm:col-span-2">
            <label for="address" class="text-sm font-medium text-zinc-200">Delivery address</label>
            <textarea id="address" name="address" rows="3" required autocomplete="street-address" placeholder="House, road, area, landmark" class="field mt-2 w-full rounded-xl px-4 py-3"<?= invalid($errors, 'address') ?>><?= e($old['address']) ?></textarea>
            <?= field_error($errors, 'address') ?>
          </div>
          <div class="sm:col-span-2">
            <label for="note" class="text-sm font-medium text-zinc-200">Note for the shop <span class="font-normal text-zinc-500">(optional)</span></label>
            <textarea id="note" name="note" rows="2" placeholder="Delivery time, message on a cake, anything else" class="field mt-2 w-full rounded-xl px-4 py-3"<?= invalid($errors, 'note') ?>><?= e($old['note']) ?></textarea>
            <?= field_error($errors, 'note') ?>
          </div>
        </div>
      </fieldset>

      <fieldset class="panel rounded-3xl p-6 sm:p-8">
        <legend class="sr-only">Delivery area</legend>
        <h2 class="font-display text-lg font-semibold text-white">2. Delivery area</h2>
        <div class="mt-6 grid gap-3 sm:grid-cols-2">
          <?php foreach ($zones as $key => $z): ?>
          <label class="choice flex cursor-pointer items-center justify-between gap-3 rounded-2xl p-4">
            <span class="flex items-center gap-3">
              <input type="radio" name="zone" value="<?= e($key) ?>" data-fee="<?= (int)$z['fee'] ?>" <?= $old['zone'] === $key ? 'checked' : '' ?> class="h-4 w-4">
              <span class="text-sm font-medium text-white"><?= e($z['label']) ?></span>
            </span>
            <span class="text-sm text-muted"><?= e(money($z['fee'])) ?></span>
          </label>
          <?php endforeach; ?>
        </div>
        <?= field_error($errors, 'zone') ?>
        <?php if ($freeMin > 0): ?><p class="mt-3 text-sm text-zinc-500">Free delivery on orders over <?= e(money($freeMin)) ?>.</p><?php endif; ?>
      </fieldset>

      <fieldset class="panel rounded-3xl p-6 sm:p-8">
        <legend class="sr-only">Payment</legend>
        <h2 class="font-display text-lg font-semibold text-white">3. Payment</h2>
        <div class="mt-6 grid gap-3">
          <?php
          $help = [
              'cod' => ['cash', 'Pay in cash when your order arrives.'],
              'online' => ['card', 'Pay now with bKash, Nagad, Rocket or card through SSLCommerz.'],
              'whatsapp' => ['message', 'We save your order and open WhatsApp so you can confirm it with us.'],
          ];
          foreach ($methods as $key => $label): ?>
          <label class="choice flex cursor-pointer items-start gap-4 rounded-2xl p-4">
            <input type="radio" name="payment_method" value="<?= e($key) ?>" <?= $old['payment_method'] === $key ? 'checked' : '' ?> class="mt-1 h-4 w-4">
            <span class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent-soft"><?= icon($help[$key][0], 'h-[18px] w-[18px]') ?></span>
            <span>
              <span class="block text-sm font-medium text-white"><?= e($label) ?></span>
              <span class="mt-0.5 block text-sm text-muted"><?= e($help[$key][1]) ?></span>
            </span>
          </label>
          <?php endforeach; ?>
        </div>
        <?= field_error($errors, 'payment_method') ?>
      </fieldset>
    </div>

    <aside id="checkoutSummary" class="panel h-fit rounded-3xl p-6 lg:sticky lg:top-24"
      data-subtotal="<?= (int)$cart['subtotal'] ?>" data-free-min="<?= $freeMin ?>" data-currency="<?= e(setting('currency_label', 'BDT')) ?>">
      <h2 class="font-display text-lg font-semibold text-white">Your order</h2>
      <ul class="mt-5 flex flex-col gap-4">
        <?php foreach ($cart['lines'] as $l): $p = $l['product']; ?>
        <li class="flex items-center gap-3">
          <span class="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[#121217]">
            <?php if ($p['image']): ?><img src="<?= e(image_url($p['image'])) ?>" alt="" class="absolute inset-0 h-full w-full object-cover"><?php else: ?><?= product_placeholder($p['name']) ?><?php endif; ?>
            <span class="absolute -right-0 -top-0 inline-flex h-5 min-w-5 items-center justify-center rounded-bl-lg bg-accent px-1 text-[0.7rem] font-semibold text-white"><?= (int)$l['qty'] ?></span>
          </span>
          <span class="min-w-0 flex-1 truncate text-sm text-zinc-200"><?= e($p['name']) ?></span>
          <span class="text-sm text-white" style="font-variant-numeric:tabular-nums"><?= e(money($l['line_total'])) ?></span>
        </li>
        <?php endforeach; ?>
      </ul>
      <dl class="mt-6 flex flex-col gap-3 border-t border-white/[0.08] pt-5 text-sm">
        <div class="flex justify-between"><dt class="text-muted">Subtotal</dt><dd class="text-white" style="font-variant-numeric:tabular-nums"><?= e(money($cart['subtotal'])) ?></dd></div>
        <div class="flex justify-between"><dt class="text-muted">Delivery</dt><dd id="sumDelivery" class="text-white" style="font-variant-numeric:tabular-nums"><?= e(money(delivery_fee($old['zone'], $cart['subtotal']))) ?></dd></div>
        <div class="flex justify-between border-t border-white/[0.08] pt-3 text-base"><dt class="font-medium text-white">Total</dt><dd id="sumTotal" class="font-display font-semibold text-white" style="font-variant-numeric:tabular-nums"><?= e(money($cart['subtotal'] + delivery_fee($old['zone'], $cart['subtotal']))) ?></dd></div>
      </dl>
      <button id="placeOrderBtn" type="submit" class="btn-primary mt-6 flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 font-medium"
        data-label-cod="Place order" data-label-online="Continue to payment" data-label-whatsapp="Place order &amp; open WhatsApp">
        <?= icon('check', 'h-4 w-4') ?><span>Place order</span>
      </button>
      <p class="mt-3 text-center text-xs text-zinc-500">We'll call or message you to confirm delivery.</p>
    </aside>
  </form>
  <?php endif; ?>
</section>
<?php store_footer();
