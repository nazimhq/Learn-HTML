<?php
declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MINUTES = 15;

function current_admin(): ?array
{
    $id = (int)($_SESSION['admin_id'] ?? 0);
    if (!$id) {
        return null;
    }
    static $admin = null;
    return $admin ??= db_one('SELECT id, username FROM admins WHERE id = ?', [$id]);
}

function require_admin(): array
{
    $a = current_admin();
    if (!$a) {
        redirect('admin/login.php');
    }
    header('Cache-Control: no-store');
    return $a;
}

function login_blocked(): bool
{
    $since = date('Y-m-d H:i:s', time() - LOGIN_WINDOW_MINUTES * 60);
    return (int)db_val('SELECT COUNT(*) FROM login_attempts WHERE ip = ? AND attempted_at > ?', [client_ip(), $since]) >= LOGIN_MAX_ATTEMPTS;
}

function record_failed_login(): void
{
    db_insert('login_attempts', ['ip' => client_ip(), 'attempted_at' => now()]);
    db_exec('DELETE FROM login_attempts WHERE attempted_at < ?', [date('Y-m-d H:i:s', time() - 86400)]);
}

function status_pill(string $status): string
{
    $map = [
        'pending' => 'border-amber-400/40 bg-amber-400/10 text-amber-200',
        'confirmed' => 'border-sky-400/40 bg-sky-400/10 text-sky-200',
        'shipped' => 'border-accent/50 bg-accent/15 text-accent-soft',
        'delivered' => 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200',
        'cancelled' => 'border-red-400/40 bg-red-400/10 text-red-200',
        'paid' => 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200',
        'unpaid' => 'border-white/15 bg-white/5 text-zinc-300',
        'failed' => 'border-red-400/40 bg-red-400/10 text-red-200',
        'refunded' => 'border-white/15 bg-white/5 text-zinc-300',
    ];
    $label = order_statuses()[$status] ?? payment_statuses()[$status] ?? ucfirst($status);
    return '<span class="inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ' . ($map[$status] ?? $map['unpaid']) . '">' . e($label) . '</span>';
}

function admin_header(string $title, string $active = ''): void
{
    $admin = current_admin();
    $pending = $admin ? (int)db_val("SELECT COUNT(*) FROM orders WHERE status = 'pending'") : 0;
    $nav = [
        'dashboard' => ['Dashboard', 'admin/index.php', 'home'],
        'orders' => ['Orders', 'admin/orders.php', 'receipt'],
        'products' => ['Products', 'admin/products.php', 'box'],
        'categories' => ['Categories', 'admin/categories.php', 'grid'],
        'settings' => ['Settings', 'admin/settings.php', 'settings'],
        'account' => ['Account', 'admin/account.php', 'user'],
    ];
    ?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="robots" content="noindex, nofollow">
  <title><?= e($title) ?> | <?= e(setting('store_name')) ?> Admin</title>
<?= head_assets() ?>
</head>
<body>
<?php if ($admin): ?>
  <div class="lg:grid lg:min-h-screen lg:grid-cols-[240px_1fr]">
    <aside class="border-b border-white/[0.06] bg-panel lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
      <div class="flex h-16 items-center justify-between gap-3 px-4 lg:px-5">
        <a href="<?= e(url('admin/index.php')) ?>" class="flex min-w-0 items-center gap-2.5 font-display font-bold text-white">
          <span class="inline-block h-2.5 w-2.5 shrink-0 rounded-sm bg-accent shadow-[0_0_14px_rgba(139,92,246,0.9)]" aria-hidden="true"></span>
          <span class="truncate"><?= e(setting('store_name')) ?></span>
        </a>
        <a href="<?= e(url('')) ?>" target="_blank" rel="noopener" class="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:text-white">View shop<?= icon('external', 'h-3.5 w-3.5') ?></a>
      </div>
      <nav class="-mt-1 flex gap-1 overflow-x-auto px-3 pb-3 lg:mt-2 lg:flex-col lg:overflow-visible lg:px-3" aria-label="Admin">
        <?php foreach ($nav as $key => [$label, $href, $ic]): ?>
        <a href="<?= e(url($href)) ?>" class="flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm <?= $active === $key ? 'bg-accent/15 text-white' : 'text-zinc-400 hover:bg-white/[0.04] hover:text-white' ?>" <?= $active === $key ? 'aria-current="page"' : '' ?>>
          <?= icon($ic, 'h-[18px] w-[18px]') ?><span><?= e($label) ?></span>
          <?php if ($key === 'orders' && $pending): ?><span class="ml-auto rounded-full bg-accent px-2 text-[0.7rem] font-semibold text-white"><?= $pending ?></span><?php endif; ?>
        </a>
        <?php endforeach; ?>
        <form method="post" action="<?= e(url('admin/logout.php')) ?>" class="shrink-0 lg:mt-4 lg:border-t lg:border-white/[0.06] lg:pt-4">
          <?= csrf_field() ?>
          <button class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-400 hover:bg-white/[0.04] hover:text-white"><?= icon('logout', 'h-[18px] w-[18px]') ?>Log out</button>
        </form>
      </nav>
    </aside>
    <main id="main" class="min-w-0 px-4 py-8 sm:px-8 lg:py-10">
      <div class="mx-auto max-w-6xl">
        <?php foreach (take_flashes() as $f):
            $cls = $f['type'] === 'error' ? 'border-red-500/40 bg-red-500/10 text-red-200' : ($f['type'] === 'success' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-accent/40 bg-accent/10 text-accent-soft'); ?>
        <div class="mb-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm <?= $cls ?>" role="status"><?= icon($f['type'] === 'error' ? 'alert' : 'check', 'mt-0.5 h-4 w-4 shrink-0') ?><span><?= e($f['message']) ?></span></div>
        <?php endforeach; ?>
<?php else: ?>
  <main id="main" class="px-4">
<?php endif;
}

function admin_footer(): void
{
    if (current_admin()) {
        echo "      </div>\n    </main>\n  </div>\n";
    } else {
        echo "  </main>\n";
    }
    echo '  <script src="' . e(url('assets/store.js')) . '"></script>' . "\n</body>\n</html>\n";
}

function admin_page_title(string $title, string $subtitle = '', string $actions = ''): string
{
    return '<div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div>'
        . '<h1 class="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">' . e($title) . '</h1>'
        . ($subtitle !== '' ? '<p class="mt-1.5 text-sm text-muted">' . e($subtitle) . '</p>' : '')
        . '</div>' . ($actions !== '' ? '<div class="flex flex-wrap gap-2">' . $actions . '</div>' : '') . '</div>';
}

/* ---------- Image uploads ---------- */

const UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
const UPLOAD_MAX_SIDE = 1600;

/** Normalise $_FILES['x'] with multiple files into a list. */
function uploaded_files(string $field): array
{
    $f = $_FILES[$field] ?? null;
    if (!$f || !is_array($f['name'])) {
        return $f && $f['error'] !== UPLOAD_ERR_NO_FILE ? [$f] : [];
    }
    $out = [];
    foreach ($f['name'] as $i => $_) {
        if ($f['error'][$i] === UPLOAD_ERR_NO_FILE) {
            continue;
        }
        $out[] = ['name' => $f['name'][$i], 'tmp_name' => $f['tmp_name'][$i], 'error' => $f['error'][$i], 'size' => $f['size'][$i]];
    }
    return $out;
}

/**
 * Validate and store one uploaded image. Returns the path relative to /uploads, or throws RuntimeException.
 * Images are re-saved with GD when available: this strips hidden data and shrinks large photos.
 */
function store_image(array $file): string
{
    if ($file['error'] !== UPLOAD_ERR_OK) {
        throw new RuntimeException('"' . $file['name'] . '" did not upload. It may be larger than the server allows.');
    }
    if ($file['size'] > UPLOAD_MAX_BYTES) {
        throw new RuntimeException('"' . $file['name'] . '" is larger than 5 MB.');
    }
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
    $ext = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif'][$mime] ?? null;
    if (!$ext || @getimagesize($file['tmp_name']) === false) {
        throw new RuntimeException('"' . $file['name'] . '" is not a JPG, PNG, WebP or GIF image.');
    }

    $dir = APP_ROOT . '/uploads/products';
    if (!is_dir($dir) && !mkdir($dir, 0755, true)) {
        throw new RuntimeException('The uploads folder is not writable.');
    }
    $name = bin2hex(random_bytes(12)) . '.' . $ext;
    $dest = $dir . '/' . $name;

    if ($ext !== 'gif' && function_exists('imagecreatefromstring')) {
        $src = @imagecreatefromstring((string)file_get_contents($file['tmp_name']));
        if ($src === false) {
            throw new RuntimeException('"' . $file['name'] . '" could not be read as an image.');
        }
        $w = imagesx($src);
        $h = imagesy($src);
        $scale = min(1, UPLOAD_MAX_SIDE / max($w, $h));
        if ($scale < 1) {
            $nw = (int)round($w * $scale);
            $nh = (int)round($h * $scale);
            $dst = imagecreatetruecolor($nw, $nh);
            imagealphablending($dst, false);
            imagesavealpha($dst, true);
            imagecopyresampled($dst, $src, 0, 0, 0, 0, $nw, $nh, $w, $h);
            imagedestroy($src);
            $src = $dst;
        }
        $ok = match ($ext) {
            'jpg' => imagejpeg($src, $dest, 85),
            'png' => imagepng($src, $dest, 7),
            'webp' => function_exists('imagewebp') ? imagewebp($src, $dest, 85) : false,
        };
        imagedestroy($src);
        if (!$ok) {
            throw new RuntimeException('"' . $file['name'] . '" could not be saved.');
        }
    } elseif (!move_uploaded_file($file['tmp_name'], $dest)) {
        throw new RuntimeException('"' . $file['name'] . '" could not be saved.');
    }
    return 'products/' . $name;
}

function delete_image_file(string $path): void
{
    $full = realpath(APP_ROOT . '/uploads/' . $path);
    $root = realpath(APP_ROOT . '/uploads');
    if ($full && $root && str_starts_with($full, $root . DIRECTORY_SEPARATOR) && is_file($full)) {
        @unlink($full);
    }
}
