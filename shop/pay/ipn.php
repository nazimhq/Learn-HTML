<?php
/* SSLCommerz server-to-server notification (IPN). Confirms payments even if the customer closes the browser. */
require dirname(__DIR__) . '/inc/bootstrap.php';

header('Content-Type: text/plain');
if (!is_post()) {
    http_response_code(405);
    exit('POST only');
}
echo ssl_confirm_payment($_POST) ? 'OK' : 'IGNORED';
