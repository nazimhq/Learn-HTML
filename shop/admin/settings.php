<?php
require dirname(__DIR__) . '/inc/admin.php';
require_admin();

/* Each field: key => [label, type, help] */
$groups = [
    'Store' => [
        'store_name' => ['Shop name', 'text', ''],
        'tagline' => ['Tagline', 'text', 'Shown in the footer and browser tab.'],
        'meta_description' => ['Search engine description', 'textarea', 'One or two sentences Google shows under your shop name.'],
        'announcement' => ['Announcement bar', 'text', 'A short line at the very top of every page. Leave empty to hide.'],
    ],
    'Home page' => [
        'hero_eyebrow' => ['Small label above the headline', 'text', ''],
        'hero_title' => ['Headline', 'text', ''],
        'hero_text' => ['Text under the headline', 'textarea', ''],
    ],
    'Contact' => [
        'whatsapp_number' => ['WhatsApp number', 'text', 'Like 01712345678. Used for every WhatsApp button.'],
        'phone' => ['Phone number', 'text', ''],
        'email' => ['Email', 'text', ''],
        'address' => ['Address', 'text', ''],
        'facebook_url' => ['Facebook page link', 'text', ''],
    ],
    'Delivery' => [
        'delivery_inside_label' => ['Area 1 name', 'text', ''],
        'delivery_inside_fee' => ['Area 1 delivery charge', 'number', ''],
        'delivery_outside_label' => ['Area 2 name', 'text', ''],
        'delivery_outside_fee' => ['Area 2 delivery charge', 'number', ''],
        'free_delivery_min' => ['Free delivery over', 'number', 'Order total that gets free delivery. 0 = never free.'],
        'currency_label' => ['Currency label', 'text', 'Shown before every price, like BDT or Tk.'],
    ],
    'Payments' => [
        'cod_enabled' => ['Cash on delivery', 'toggle', ''],
        'whatsapp_enabled' => ['Confirm order on WhatsApp', 'toggle', 'Needs a WhatsApp number above.'],
        'online_enabled' => ['Online payment (SSLCommerz)', 'toggle', 'Needs your SSLCommerz Store ID and password below.'],
        'ssl_store_id' => ['SSLCommerz Store ID', 'text', ''],
        'ssl_store_password' => ['SSLCommerz Store password', 'secret', 'Leave empty to keep the saved password.'],
        'ssl_sandbox' => ['Test mode (sandbox)', 'toggle', 'Turn off when SSLCommerz gives you live credentials.'],
    ],
    'Footer' => [
        'footer_credit' => ['Credit text', 'text', 'Leave empty to hide.'],
        'footer_credit_url' => ['Credit link', 'text', ''],
    ],
];

$errors = [];
if (is_post()) {
    csrf_check();
    $save = [];
    foreach ($groups as $fields) {
        foreach ($fields as $k => [$label, $type]) {
            if ($type === 'toggle') {
                $save[$k] = isset($_POST[$k]) ? '1' : '0';
            } elseif ($type === 'secret') {
                if (input($k) !== '') {
                    $save[$k] = input($k);
                }
            } elseif ($type === 'number') {
                $val = input($k, '0');
                if (!preg_match('/^\d{1,7}$/', $val)) {
                    $errors[$k] = $label . ' must be a whole number.';
                }
                $save[$k] = $val;
            } else {
                $save[$k] = mb_substr(input($k), 0, 1000);
            }
        }
    }
    if ($save['store_name'] === '') {
        $errors['store_name'] = 'Shop name cannot be empty.';
    }
    foreach (['facebook_url', 'footer_credit_url'] as $u) {
        if ($save[$u] !== '' && !preg_match('#^https?://#i', $save[$u])) {
            $errors[$u] = 'Links must start with https://';
        }
    }
    if ($save['email'] !== '' && !filter_var($save['email'], FILTER_VALIDATE_EMAIL)) {
        $errors['email'] = 'This email address doesn\'t look right.';
    }
    if ($save['cod_enabled'] === '0' && $save['whatsapp_enabled'] === '0' && $save['online_enabled'] === '0') {
        $errors['cod_enabled'] = 'Keep at least one payment method switched on.';
    }
    if (!$errors) {
        save_settings($save);
        flash('success', 'Settings saved.');
        redirect('admin/settings.php');
    }
    flash('error', 'Settings were not saved. Please fix the fields marked below.');
}

admin_header('Settings', 'settings');
echo admin_page_title('Settings', 'Everything customers see about your shop.');
?>
<form method="post" class="flex flex-col gap-6">
  <?= csrf_field() ?>
  <?php foreach ($groups as $group => $fields): ?>
  <section class="panel rounded-2xl p-5 sm:p-6">
    <h2 class="font-display font-semibold text-white"><?= e($group) ?></h2>
    <?php if ($group === 'Payments'): ?>
    <p class="mt-1 text-sm text-muted">Online payment URLs to give SSLCommerz: IPN <code class="rounded bg-white/5 px-1.5 py-0.5 text-xs text-accent-soft"><?= e(abs_url('pay/ipn.php')) ?></code></p>
    <?php endif; ?>
    <div class="mt-5 grid gap-5 md:grid-cols-2">
      <?php foreach ($fields as $k => [$label, $type, $help]):
        $val = is_post() && $type !== 'secret' ? (string)($_POST[$k] ?? '') : setting($k);
        $err = $errors[$k] ?? ''; ?>
      <div class="<?= $type === 'textarea' ? 'md:col-span-2' : '' ?>">
        <?php if ($type === 'toggle'): ?>
        <label class="flex items-start gap-3 rounded-xl border border-white/10 p-4">
          <input type="checkbox" name="<?= e($k) ?>" value="1" <?= (is_post() ? isset($_POST[$k]) : $val === '1') ? 'checked' : '' ?> class="mt-0.5 h-4 w-4">
          <span><span class="block text-sm font-medium text-white"><?= e($label) ?></span><?php if ($help): ?><span class="mt-0.5 block text-xs text-zinc-500"><?= e($help) ?></span><?php endif; ?></span>
        </label>
        <?php else: ?>
        <label for="f-<?= e($k) ?>" class="text-sm font-medium text-zinc-200"><?= e($label) ?></label>
        <?php if ($type === 'textarea'): ?>
        <textarea id="f-<?= e($k) ?>" name="<?= e($k) ?>" rows="2" class="field mt-2 w-full rounded-xl px-4 py-3"><?= e($val) ?></textarea>
        <?php else: ?>
        <input id="f-<?= e($k) ?>" name="<?= e($k) ?>" type="<?= $type === 'secret' ? 'password' : 'text' ?>" value="<?= $type === 'secret' ? '' : e($val) ?>" <?= $type === 'number' ? 'inputmode="numeric"' : '' ?> <?= $type === 'secret' ? 'autocomplete="new-password" placeholder="' . (setting($k) !== '' ? 'Saved (hidden)' : 'Not set') . '"' : '' ?> class="field mt-2 h-11 w-full rounded-xl px-4">
        <?php endif; ?>
        <?php if ($help): ?><p class="mt-1.5 text-xs text-zinc-500"><?= e($help) ?></p><?php endif; ?>
        <?php endif; ?>
        <?php if ($err): ?><p class="mt-1.5 text-sm text-red-300"><?= e($err) ?></p><?php endif; ?>
      </div>
      <?php endforeach; ?>
    </div>
  </section>
  <?php endforeach; ?>
  <div class="sticky bottom-4 flex justify-end">
    <button class="btn-primary rounded-full px-8 py-3 font-medium">Save settings</button>
  </div>
</form>
<?php admin_footer();
