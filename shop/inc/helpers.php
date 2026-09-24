<?php
declare(strict_types=1);

/* ---------- Output ---------- */

function e($value): string
{
    return htmlspecialchars((string)$value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function money($amount): string
{
    return setting('currency_label', 'BDT') . ' ' . number_format((float)$amount);
}

/* ---------- URLs ---------- */

function is_https(): bool
{
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https')
        || (($_SERVER['SERVER_PORT'] ?? '') === '443');
}

/** URL path of the shop folder, e.g. "" when installed at the domain root or "/shop". */
function base_path(): string
{
    static $base = null;
    if ($base !== null) {
        return $base;
    }
    $root = str_replace('\\', '/', realpath(APP_ROOT) ?: APP_ROOT);
    $script = str_replace('\\', '/', realpath($_SERVER['SCRIPT_FILENAME'] ?? '') ?: '');
    $name = $_SERVER['SCRIPT_NAME'] ?? '';
    $rel = str_starts_with($script, $root) ? substr($script, strlen($root)) : '';
    if ($rel !== '' && str_ends_with($name, $rel)) {
        $base = substr($name, 0, -strlen($rel));
    } else {
        $base = rtrim(str_replace('\\', '/', dirname($name)), '/');
    }
    return $base = rtrim($base, '/');
}

function url(string $path = ''): string
{
    return base_path() . '/' . ltrim($path, '/');
}

function abs_url(string $path = ''): string
{
    $site = rtrim((string)($GLOBALS['config']['site_url'] ?? ''), '/');
    if ($site === '') {
        $site = (is_https() ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . base_path();
    }
    return $site . '/' . ltrim($path, '/');
}

function redirect(string $path): never
{
    $target = preg_match('#^https?://#', $path) ? $path : url($path);
    header('Location: ' . $target);
    exit;
}

/** Only allow redirects back to a path inside this site. */
function safe_return(?string $path, string $fallback): string
{
    $path = (string)$path;
    if ($path === '' || !str_starts_with($path, '/') || str_starts_with($path, '//') || str_contains($path, '\\')) {
        return url($fallback);
    }
    return $path;
}

/* ---------- Requests ---------- */

function is_post(): bool
{
    return ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST';
}

function is_ajax(): bool
{
    return ($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') === 'fetch';
}

function input(string $key, string $default = ''): string
{
    $v = $_POST[$key] ?? $default;
    return is_string($v) ? trim($v) : $default;
}

function query(string $key, string $default = ''): string
{
    $v = $_GET[$key] ?? $default;
    return is_string($v) ? trim($v) : $default;
}

function client_ip(): string
{
    return substr((string)($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'), 0, 45);
}

function json_out(array $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data);
    exit;
}

/* ---------- CSRF ---------- */

function csrf_token(): string
{
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf'];
}

function csrf_field(): string
{
    return '<input type="hidden" name="_csrf" value="' . e(csrf_token()) . '">';
}

function csrf_check(): void
{
    $sent = $_POST['_csrf'] ?? '';
    if (!is_string($sent) || !hash_equals(csrf_token(), $sent)) {
        if (is_ajax()) {
            json_out(['ok' => false, 'message' => 'Your session expired. Please refresh the page.'], 400);
        }
        http_response_code(400);
        exit('Your session expired. Please go back, refresh the page and try again.');
    }
}

/* ---------- Flash messages ---------- */

function flash(string $type, string $message): void
{
    $_SESSION['flash'][] = ['type' => $type, 'message' => $message];
}

function take_flashes(): array
{
    $f = $_SESSION['flash'] ?? [];
    unset($_SESSION['flash']);
    return $f;
}

/* ---------- Settings (stored in the database, edited in Admin > Settings) ---------- */

function default_settings(): array
{
    return [
        'store_name' => 'Your Shop Name',
        'tagline' => 'Fresh bakes, delivered across Mymensingh.',
        'meta_description' => 'Order online from Your Shop Name. Home delivery across Mymensingh. Pay cash on delivery or online.',
        'announcement' => 'Cash on delivery available across Mymensingh.',
        'hero_eyebrow' => 'Home delivery in Mymensingh',
        'hero_title' => 'Order online. Pay when it arrives.',
        'hero_text' => 'Browse the shop, add what you like to your cart, and we deliver to your door. Pay cash on delivery or online.',
        'currency_label' => 'BDT',
        'whatsapp_number' => '',
        'phone' => '',
        'email' => '',
        'address' => 'Mymensingh, Bangladesh',
        'facebook_url' => '',
        'delivery_inside_label' => 'Inside Mymensingh city',
        'delivery_inside_fee' => '60',
        'delivery_outside_label' => 'Outside Mymensingh city',
        'delivery_outside_fee' => '120',
        'free_delivery_min' => '0',
        'cod_enabled' => '1',
        'whatsapp_enabled' => '1',
        'online_enabled' => '0',
        'ssl_store_id' => '',
        'ssl_store_password' => '',
        'ssl_sandbox' => '1',
        'footer_credit' => 'Website by NEXAWEB',
        'footer_credit_url' => 'https://nexaweb.io',
    ];
}

function setting(string $key, string $default = ''): string
{
    static $cache = null;
    if ($key === '__reset') {
        $cache = null;
        return '';
    }
    if ($cache === null) {
        $cache = default_settings();
        if (db_available()) {
            foreach (db_all('SELECT k, v FROM settings') as $row) {
                $cache[$row['k']] = (string)$row['v'];
            }
        }
    }
    return array_key_exists($key, $cache) ? $cache[$key] : $default;
}

function save_settings(array $values): void
{
    $pdo = db();
    $pdo->beginTransaction();
    foreach ($values as $k => $v) {
        db_exec('DELETE FROM settings WHERE k = ?', [$k]);
        db_exec('INSERT INTO settings (k, v) VALUES (?, ?)', [$k, (string)$v]);
    }
    $pdo->commit();
    setting('__reset');
}

/* ---------- Shop helpers ---------- */

function slugify(string $text): string
{
    $text = strtolower(trim($text));
    $text = preg_replace('/[^a-z0-9]+/', '-', $text) ?? '';
    $text = trim($text, '-');
    return $text !== '' ? substr($text, 0, 80) : 'item-' . substr(bin2hex(random_bytes(3)), 0, 6);
}

function unique_slug(string $table, string $slug, int $excludeId = 0): string
{
    $base = $slug;
    $i = 2;
    while ((int)db_val("SELECT COUNT(*) FROM {$table} WHERE slug = ? AND id <> ?", [$slug, $excludeId]) > 0) {
        $slug = $base . '-' . $i++;
    }
    return $slug;
}

function digits(string $s): string
{
    return preg_replace('/\D+/', '', $s) ?? '';
}

function tel_href(string $phone): string
{
    $d = digits($phone);
    if ($d === '') {
        return '';
    }
    return 'tel:+' . (str_starts_with($d, '0') ? '88' . $d : $d);
}

function wa_link(string $message, ?string $number = null): string
{
    $n = digits($number ?? setting('whatsapp_number'));
    if (str_starts_with($n, '0')) {
        $n = '88' . $n; // local 01XXXXXXXXX -> 8801XXXXXXXXX
    }
    return 'https://wa.me/' . $n . ($message !== '' ? '?text=' . rawurlencode($message) : '');
}

/** Normalise a Bangladeshi mobile number to 01XXXXXXXXX, or return '' if invalid. */
function normalize_bd_phone(string $raw): string
{
    $d = digits($raw);
    if (str_starts_with($d, '880')) {
        $d = substr($d, 2);
    }
    return preg_match('/^01[3-9]\d{8}$/', $d) ? $d : '';
}

function image_url(?string $path): string
{
    return $path ? url('uploads/' . ltrim($path, '/')) : '';
}

function delivery_zones(): array
{
    return [
        'inside' => ['label' => setting('delivery_inside_label'), 'fee' => (int)setting('delivery_inside_fee')],
        'outside' => ['label' => setting('delivery_outside_label'), 'fee' => (int)setting('delivery_outside_fee')],
    ];
}

function delivery_fee(string $zone, int $subtotal): int
{
    $min = (int)setting('free_delivery_min');
    if ($min > 0 && $subtotal >= $min) {
        return 0;
    }
    return delivery_zones()[$zone]['fee'] ?? 0;
}

function order_statuses(): array
{
    return [
        'pending' => 'Pending',
        'confirmed' => 'Confirmed',
        'shipped' => 'Out for delivery',
        'delivered' => 'Delivered',
        'cancelled' => 'Cancelled',
    ];
}

function payment_methods(): array
{
    return [
        'cod' => 'Cash on delivery',
        'online' => 'Online payment',
        'whatsapp' => 'Confirm on WhatsApp',
    ];
}

function payment_statuses(): array
{
    return ['unpaid' => 'Unpaid', 'paid' => 'Paid', 'failed' => 'Payment failed', 'refunded' => 'Refunded'];
}

function online_payment_ready(): bool
{
    return setting('online_enabled') === '1' && setting('ssl_store_id') !== '' && setting('ssl_store_password') !== '';
}

function whatsapp_ready(): bool
{
    return setting('whatsapp_enabled') === '1' && digits(setting('whatsapp_number')) !== '';
}

function enabled_payment_methods(): array
{
    $m = [];
    if (setting('cod_enabled') === '1') {
        $m['cod'] = payment_methods()['cod'];
    }
    if (online_payment_ready()) {
        $m['online'] = payment_methods()['online'];
    }
    if (whatsapp_ready()) {
        $m['whatsapp'] = payment_methods()['whatsapp'];
    }
    return $m;
}

/* ---------- Icons (inline SVG) ---------- */

function icon(string $name, string $class = 'h-5 w-5'): string
{
    static $paths = [
        'cart' => '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>',
        'search' => '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
        'message' => '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
        'truck' => '<path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
        'cash' => '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
        'card' => '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
        'shield' => '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
        'phone' => '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
        'mail' => '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/>',
        'map-pin' => '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
        'facebook' => '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
        'check' => '<path d="M20 6 9 17l-5-5"/>',
        'plus' => '<path d="M12 5v14"/><path d="M5 12h14"/>',
        'minus' => '<path d="M5 12h14"/>',
        'trash' => '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/>',
        'arrow' => '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
        'arrow-left' => '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
        'info' => '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
        'menu' => '<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/>',
        'close' => '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
        'box' => '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.27 6.96 12 12.01l8.73-5.05"/><path d="M12 22.08V12"/>',
        'grid' => '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
        'tag' => '<path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><path d="M7 7h.01"/>',
        'settings' => '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
        'home' => '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
        'receipt' => '<path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2-3 2z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
        'user' => '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
        'logout' => '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
        'external' => '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/>',
        'image' => '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
        'edit' => '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
        'eye' => '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
        'alert' => '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    ];
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="' . e($class) . '">' . ($paths[$name] ?? $paths['info']) . '</svg>';
}
