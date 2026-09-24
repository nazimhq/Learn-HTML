<?php
require __DIR__ . '/inc/bootstrap.php';

$error = '';
$code = strtoupper(input('code'));
if (is_post()) {
    csrf_check();
    $phone = normalize_bd_phone(input('phone'));
    $order = $code !== '' && $phone !== '' ? db_one('SELECT * FROM orders WHERE code = ? AND phone = ?', [$code, $phone]) : null;
    if ($order) {
        redirect(order_url($order));
    }
    $error = 'We couldn\'t find an order with that number and phone. Please check both and try again.';
}

store_header('Track an order', ['noindex' => true]);
?>
<section class="mx-auto max-w-md px-4 pt-14 sm:px-6">
  <h1 class="font-display text-3xl font-semibold tracking-tight text-white">Track an order</h1>
  <p class="mt-3 text-muted">Enter your order number and the phone number you used at checkout.</p>
  <?php if ($error): ?><p class="mt-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200" role="alert"><?= e($error) ?></p><?php endif; ?>
  <form method="post" class="panel mt-6 flex flex-col gap-5 rounded-3xl p-6">
    <?= csrf_field() ?>
    <div>
      <label for="code" class="text-sm font-medium text-zinc-200">Order number</label>
      <input id="code" name="code" value="<?= e($code) ?>" placeholder="ORD-XXXXXX" required class="field mt-2 h-12 w-full rounded-xl px-4 uppercase">
    </div>
    <div>
      <label for="phone" class="text-sm font-medium text-zinc-200">Mobile number</label>
      <input id="phone" name="phone" type="tel" value="<?= e(input('phone')) ?>" placeholder="01XXXXXXXXX" required class="field mt-2 h-12 w-full rounded-xl px-4">
    </div>
    <button class="btn-primary rounded-full px-6 py-3.5 font-medium">Find my order</button>
  </form>
</section>
<?php store_footer();
