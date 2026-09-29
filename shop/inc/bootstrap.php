<?php
declare(strict_types=1);

define('APP_ROOT', dirname(__DIR__));
define('CONFIG_FILE', APP_ROOT . '/config.php');

require __DIR__ . '/helpers.php';
require __DIR__ . '/db.php';
require __DIR__ . '/cart.php';
require __DIR__ . '/layout.php';
require __DIR__ . '/sslcommerz.php';

date_default_timezone_set('Asia/Dhaka');

$GLOBALS['config'] = is_file(CONFIG_FILE) ? require CONFIG_FILE : null;

if (!defined('SKIP_INSTALL_CHECK') && $GLOBALS['config'] === null) {
    header('Location: ' . url('install.php'));
    exit;
}

$debug = (bool)($GLOBALS['config']['debug'] ?? false);
ini_set('display_errors', $debug ? '1' : '0');
error_reporting(E_ALL);

set_exception_handler(function (Throwable $ex) use ($debug) {
    error_log('[shop] ' . $ex);
    if (!headers_sent()) {
        http_response_code(500);
    }
    echo '<!doctype html><meta charset="utf-8"><title>Error</title>'
        . '<body style="background:#0b0b0e;color:#e4e4e7;font-family:system-ui;padding:40px">'
        . '<h1 style="font-size:20px">Something went wrong.</h1>'
        . '<p style="color:#a1a1aa">Please go back and try again. If it keeps happening, contact the shop.</p>'
        . ($debug ? '<pre style="white-space:pre-wrap;color:#fca5a5">' . e((string)$ex) . '</pre>' : '')
        . '</body>';
});

// Session
$https = is_https();
session_name('shopsid');
session_set_cookie_params([
    'lifetime' => 0,
    'path' => (base_path() ?: '') . '/',
    'secure' => $https,
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();

header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('X-Frame-Options: SAMEORIGIN');
