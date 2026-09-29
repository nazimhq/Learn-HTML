<?php
require dirname(__DIR__) . '/inc/admin.php';

if (current_admin()) {
    redirect('admin/index.php');
}

$error = '';
$username = '';
if (is_post()) {
    csrf_check();
    $username = input('username');
    if (login_blocked()) {
        $error = 'Too many failed attempts. Please wait ' . LOGIN_WINDOW_MINUTES . ' minutes and try again.';
    } else {
        $admin = db_one('SELECT * FROM admins WHERE username = ?', [$username]);
        if ($admin && password_verify((string)($_POST['password'] ?? ''), $admin['password_hash'])) {
            session_regenerate_id(true);
            $_SESSION['admin_id'] = (int)$admin['id'];
            if (password_needs_rehash($admin['password_hash'], PASSWORD_DEFAULT)) {
                db_exec('UPDATE admins SET password_hash = ? WHERE id = ?', [password_hash((string)$_POST['password'], PASSWORD_DEFAULT), $admin['id']]);
            }
            redirect('admin/index.php');
        }
        record_failed_login();
        $error = 'Wrong username or password.';
    }
}

admin_header('Log in');
?>
<div class="flex min-h-screen items-center justify-center py-12">
  <div class="w-full max-w-sm">
    <div class="flex items-center justify-center gap-2.5 font-display text-lg font-bold text-white">
      <span class="inline-block h-2.5 w-2.5 rounded-sm bg-accent shadow-[0_0_14px_rgba(139,92,246,0.9)]" aria-hidden="true"></span><?= e(setting('store_name')) ?>
    </div>
    <form method="post" class="panel mt-8 flex flex-col gap-5 rounded-3xl p-7">
      <?= csrf_field() ?>
      <div>
        <h1 class="font-display text-xl font-semibold text-white">Admin login</h1>
        <p class="mt-1 text-sm text-muted">Manage products, orders and settings.</p>
      </div>
      <?php if ($error): ?><p class="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200" role="alert"><?= e($error) ?></p><?php endif; ?>
      <div>
        <label for="username" class="text-sm font-medium text-zinc-200">Username</label>
        <input id="username" name="username" value="<?= e($username) ?>" required autocomplete="username" autofocus class="field mt-2 h-12 w-full rounded-xl px-4">
      </div>
      <div>
        <label for="password" class="text-sm font-medium text-zinc-200">Password</label>
        <input id="password" name="password" type="password" required autocomplete="current-password" class="field mt-2 h-12 w-full rounded-xl px-4">
      </div>
      <button class="btn-primary rounded-full px-6 py-3.5 font-medium">Log in</button>
    </form>
    <p class="mt-6 text-center text-sm"><a href="<?= e(url('')) ?>" class="text-zinc-500 hover:text-white">← Back to shop</a></p>
  </div>
</div>
<?php admin_footer();
