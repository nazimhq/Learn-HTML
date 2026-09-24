<?php
require dirname(__DIR__) . '/inc/admin.php';
$admin = require_admin();

$errors = [];
if (is_post()) {
    csrf_check();
    $row = db_one('SELECT * FROM admins WHERE id = ?', [$admin['id']]);
    $current = (string)($_POST['current'] ?? '');
    $new = (string)($_POST['new'] ?? '');
    $confirm = (string)($_POST['confirm'] ?? '');
    $username = input('username');
    if (!password_verify($current, $row['password_hash'])) {
        $errors[] = 'Your current password is wrong.';
    }
    if (!preg_match('/^[A-Za-z0-9_.-]{3,60}$/', $username)) {
        $errors[] = 'Username must be 3–60 letters, numbers, dots, dashes or underscores.';
    } elseif ((int)db_val('SELECT COUNT(*) FROM admins WHERE username = ? AND id <> ?', [$username, $admin['id']]) > 0) {
        $errors[] = 'That username is taken.';
    }
    if ($new !== '' && strlen($new) < 8) {
        $errors[] = 'New password must be at least 8 characters.';
    }
    if ($new !== $confirm) {
        $errors[] = 'The new passwords do not match.';
    }
    if (!$errors) {
        db_exec('UPDATE admins SET username = ? WHERE id = ?', [$username, $admin['id']]);
        if ($new !== '') {
            db_exec('UPDATE admins SET password_hash = ? WHERE id = ?', [password_hash($new, PASSWORD_DEFAULT), $admin['id']]);
            session_regenerate_id(true);
        }
        flash('success', 'Account updated.');
        redirect('admin/account.php');
    }
}

admin_header('Account', 'account');
echo admin_page_title('Account', 'Change your login details.');
?>
<form method="post" class="panel max-w-lg rounded-2xl p-5 sm:p-6">
  <?= csrf_field() ?>
  <?php foreach ($errors as $err): ?><p class="mb-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm text-red-200" role="alert"><?= e($err) ?></p><?php endforeach; ?>
  <label for="username" class="text-sm font-medium text-zinc-200">Username</label>
  <input id="username" name="username" value="<?= e(is_post() ? input('username') : $admin['username']) ?>" required autocomplete="username" class="field mt-2 h-11 w-full rounded-xl px-4">
  <label for="new" class="mt-5 block text-sm font-medium text-zinc-200">New password <span class="font-normal text-zinc-500">(leave empty to keep it)</span></label>
  <input id="new" name="new" type="password" autocomplete="new-password" minlength="8" class="field mt-2 h-11 w-full rounded-xl px-4">
  <label for="confirm" class="mt-5 block text-sm font-medium text-zinc-200">Repeat new password</label>
  <input id="confirm" name="confirm" type="password" autocomplete="new-password" class="field mt-2 h-11 w-full rounded-xl px-4">
  <label for="current" class="mt-5 block text-sm font-medium text-zinc-200">Current password</label>
  <input id="current" name="current" type="password" required autocomplete="current-password" class="field mt-2 h-11 w-full rounded-xl px-4">
  <button class="btn-primary mt-6 rounded-full px-6 py-3 text-sm font-medium">Save</button>
</form>
<?php admin_footer();
