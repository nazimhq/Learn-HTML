<?php
declare(strict_types=1);

function head_assets(): string
{
    $css = url('assets/style.css');
    return <<<HTML
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap">
  <script src="https://cdn.tailwindcss.com/3.4.17"></script>
  <script>
    tailwind.config = {
      theme: { extend: {
        colors: { ink: "#0b0b0e", panel: "#111115", muted: "#a1a1aa", accent: { DEFAULT: "#8b5cf6", 2: "#a855f7", soft: "#c4b5fd" } },
        fontFamily: {
          display: ['"Space Grotesk"', "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
          sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", '"Segoe UI"', "Roboto", "sans-serif"]
        },
        maxWidth: { site: "76rem" }
      } }
    };
  </script>
  <link rel="stylesheet" href="{$css}">
HTML;
}

function flash_html(): string
{
    $out = '';
    foreach (take_flashes() as $f) {
        $cls = match ($f['type']) {
            'error' => 'border-red-500/40 bg-red-500/10 text-red-200',
            'success' => 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
            default => 'border-accent/40 bg-accent/10 text-accent-soft',
        };
        $out .= '<div class="flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ' . $cls . '" role="status">'
            . icon($f['type'] === 'error' ? 'alert' : 'check', 'mt-0.5 h-4 w-4 shrink-0') . '<span>' . e($f['message']) . '</span></div>';
    }
    return $out ? '<div class="mx-auto mt-6 flex max-w-site flex-col gap-2 px-4 sm:px-6">' . $out . '</div>' : '';
}

function store_header(string $title = '', array $opt = []): void
{
    $store = setting('store_name');
    $fullTitle = $title !== '' ? $title . ' | ' . $store : $store . ' | ' . setting('tagline');
    $desc = $opt['description'] ?? setting('meta_description');
    $canonical = $opt['canonical'] ?? null;
    $ogImage = $opt['image'] ?? '';
    $count = cart_count();
    $categories = db_all('SELECT name, slug FROM categories ORDER BY sort_order, name');
    $q = query('q');
    $announcement = setting('announcement');
    $wa = whatsapp_ready() ? wa_link('Hello ' . $store . ', I have a question.') : '';
    ?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title><?= e($fullTitle) ?></title>
  <meta name="description" content="<?= e($desc) ?>">
  <meta name="theme-color" content="#0b0b0e">
  <?php if ($canonical): ?><link rel="canonical" href="<?= e($canonical) ?>"><?php endif; ?>
  <meta property="og:type" content="<?= e($opt['og_type'] ?? 'website') ?>">
  <meta property="og:site_name" content="<?= e($store) ?>">
  <meta property="og:title" content="<?= e($fullTitle) ?>">
  <meta property="og:description" content="<?= e($desc) ?>">
  <?php if ($ogImage): ?><meta property="og:image" content="<?= e($ogImage) ?>"><?php endif; ?>
  <?php if (!empty($opt['noindex'])): ?><meta name="robots" content="noindex"><?php endif; ?>
<?= head_assets() ?>
</head>
<body>
  <a href="#main" class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-black">Skip to content</a>
  <?php if ($announcement !== ''): ?>
  <div class="border-b border-white/[0.06] bg-accent/10 px-4 py-2 text-center text-xs font-medium text-accent-soft sm:text-sm"><?= e($announcement) ?></div>
  <?php endif; ?>
  <header id="siteHeader" class="site-header sticky z-50 border-b border-white/[0.06] bg-ink/80 backdrop-blur-lg">
    <nav class="mx-auto flex h-16 max-w-site items-center gap-4 px-4 sm:px-6" aria-label="Main">
      <a href="<?= e(url('')) ?>" class="flex min-w-0 items-center gap-2.5 font-display text-base font-bold tracking-wide text-white sm:text-[1.05rem]">
        <span class="inline-block h-2.5 w-2.5 shrink-0 rounded-sm bg-accent shadow-[0_0_14px_rgba(139,92,246,0.9)]" aria-hidden="true"></span>
        <span class="truncate"><?= e($store) ?></span>
      </a>
      <ul class="ml-6 hidden items-center gap-7 text-sm text-muted lg:flex">
        <li><a class="hover:text-white" href="<?= e(url('shop.php')) ?>">Shop all</a></li>
        <?php foreach (array_slice($categories, 0, 4) as $c): ?>
        <li><a class="hover:text-white" href="<?= e(url('shop.php?category=' . rawurlencode($c['slug']))) ?>"><?= e($c['name']) ?></a></li>
        <?php endforeach; ?>
      </ul>
      <form action="<?= e(url('shop.php')) ?>" method="get" class="ml-auto hidden md:block" role="search">
        <label class="relative block">
          <span class="sr-only">Search products</span>
          <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"><?= icon('search', 'h-4 w-4') ?></span>
          <input type="search" name="q" value="<?= e($q) ?>" placeholder="Search products" class="field h-10 w-56 rounded-full pl-9 pr-4 text-sm">
        </label>
      </form>
      <div class="ml-auto flex items-center gap-2 md:ml-0">
        <a href="<?= e(url('cart.php')) ?>" class="relative inline-flex h-10 items-center gap-2 rounded-full border border-white/10 px-3.5 text-sm text-white hover:border-accent/50" aria-label="Cart">
          <?= icon('cart', 'h-[18px] w-[18px]') ?>
          <span class="hidden sm:inline">Cart</span>
          <span data-cart-count class="<?= $count ? '' : 'hidden ' ?>inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[0.7rem] font-semibold text-white"><?= $count ?></span>
        </a>
        <button id="menuBtn" type="button" class="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-white lg:hidden" aria-expanded="false" aria-controls="mobileMenu" aria-label="Open menu"><?= icon('menu') ?></button>
      </div>
    </nav>
    <div id="mobileMenu" class="border-t border-white/10 lg:hidden" hidden>
      <div class="mx-auto max-w-site px-4 py-4">
        <form action="<?= e(url('shop.php')) ?>" method="get" role="search" class="md:hidden">
          <label class="relative block">
            <span class="sr-only">Search products</span>
            <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"><?= icon('search', 'h-4 w-4') ?></span>
            <input type="search" name="q" value="<?= e($q) ?>" placeholder="Search products" class="field h-11 w-full rounded-xl pl-9 pr-4">
          </label>
        </form>
        <ul class="mt-2 flex flex-col">
          <li><a class="block border-b border-white/[0.06] py-3 text-zinc-200" href="<?= e(url('shop.php')) ?>">Shop all</a></li>
          <?php foreach ($categories as $c): ?>
          <li><a class="block border-b border-white/[0.06] py-3 text-zinc-200" href="<?= e(url('shop.php?category=' . rawurlencode($c['slug']))) ?>"><?= e($c['name']) ?></a></li>
          <?php endforeach; ?>
        </ul>
        <?php if ($wa): ?>
        <a href="<?= e($wa) ?>" target="_blank" rel="noopener" class="btn-primary mt-4 flex items-center justify-center gap-2 rounded-full px-5 py-3 font-medium"><?= icon('message', 'h-4 w-4') ?>Chat on WhatsApp</a>
        <?php endif; ?>
      </div>
    </div>
  </header>
  <main id="main">
<?= flash_html() ?>
<?php
}

function store_footer(): void
{
    $store = setting('store_name');
    $phone = setting('phone');
    $email = setting('email');
    $fb = setting('facebook_url');
    $wa = whatsapp_ready() ? wa_link('Hello ' . $store . ', I have a question.') : '';
    $credit = setting('footer_credit');
    $creditUrl = setting('footer_credit_url');
    ?>
  </main>
  <footer class="mt-24 border-t border-white/[0.06]">
    <div class="mx-auto grid max-w-site gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
      <div>
        <a href="<?= e(url('')) ?>" class="flex items-center gap-2.5 font-display text-[1.05rem] font-bold tracking-wide text-white">
          <span class="inline-block h-2.5 w-2.5 rounded-sm bg-accent" aria-hidden="true"></span><?= e($store) ?>
        </a>
        <p class="mt-4 max-w-xs text-sm leading-relaxed text-muted"><?= e(setting('tagline')) ?></p>
        <?php if (setting('address') !== ''): ?><p class="mt-2 text-sm text-zinc-500"><?= e(setting('address')) ?></p><?php endif; ?>
      </div>
      <div>
        <h2 class="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">Contact</h2>
        <ul class="mt-4 flex flex-col gap-3 text-sm">
          <?php if ($phone): ?><li><a class="inline-flex items-center gap-2.5 text-muted hover:text-white" href="<?= e(tel_href($phone)) ?>"><?= icon('phone', 'h-4 w-4 text-zinc-500') ?><?= e($phone) ?></a></li><?php endif; ?>
          <?php if ($email): ?><li><a class="inline-flex items-center gap-2.5 text-muted hover:text-white" href="mailto:<?= e($email) ?>"><?= icon('mail', 'h-4 w-4 text-zinc-500') ?><?= e($email) ?></a></li><?php endif; ?>
          <?php if ($wa): ?><li><a class="inline-flex items-center gap-2.5 text-muted hover:text-white" href="<?= e($wa) ?>" target="_blank" rel="noopener"><?= icon('message', 'h-4 w-4 text-zinc-500') ?>WhatsApp</a></li><?php endif; ?>
          <?php if ($fb): ?><li><a class="inline-flex items-center gap-2.5 text-muted hover:text-white" href="<?= e($fb) ?>" target="_blank" rel="noopener"><?= icon('facebook', 'h-4 w-4 text-zinc-500') ?>Facebook</a></li><?php endif; ?>
        </ul>
      </div>
      <div>
        <h2 class="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">Shop</h2>
        <ul class="mt-4 flex flex-col gap-3 text-sm">
          <li><a class="text-muted hover:text-white" href="<?= e(url('shop.php')) ?>">All products</a></li>
          <li><a class="text-muted hover:text-white" href="<?= e(url('cart.php')) ?>">Your cart</a></li>
          <li><a class="text-muted hover:text-white" href="<?= e(url('track.php')) ?>">Track an order</a></li>
        </ul>
      </div>
    </div>
    <div class="border-t border-white/[0.06]">
      <div class="mx-auto flex max-w-site flex-col gap-2 px-4 py-6 text-xs text-zinc-500 sm:flex-row sm:justify-between sm:px-6">
        <p>&copy; <?= date('Y') ?> <?= e($store) ?>. All rights reserved.</p>
        <?php if ($credit !== ''): ?>
        <p><?php if ($creditUrl): ?><a class="hover:text-zinc-300" href="<?= e($creditUrl) ?>" target="_blank" rel="noopener"><?= e($credit) ?></a><?php else: ?><?= e($credit) ?><?php endif; ?></p>
        <?php endif; ?>
      </div>
    </div>
  </footer>
  <?php if ($wa): ?>
  <a id="fab" href="<?= e($wa) ?>" target="_blank" rel="noopener" aria-label="Chat on WhatsApp" class="fab btn-primary fixed right-4 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full sm:hidden"><?= icon('message', 'h-6 w-6') ?></a>
  <?php endif; ?>
  <div id="toast" class="toast fixed left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full border border-accent/40 bg-panel px-4 py-2.5 text-sm text-white shadow-2xl" role="status" aria-live="polite" hidden></div>
  <script src="<?= e(url('assets/store.js')) ?>"></script>
</body>
</html>
<?php
}

/* ---------- Product card ---------- */

function product_placeholder(string $name, string $extra = ''): string
{
    $letter = strtoupper(mb_substr(trim($name), 0, 1) ?: '?');
    $hue = 250 + (crc32($name) % 45);
    return '<div class="placeholder-img absolute inset-0 flex items-center justify-center ' . $extra . '" style="--h:' . $hue . '" aria-hidden="true">'
        . '<span class="font-display text-5xl font-semibold text-white/80">' . e($letter) . '</span></div>';
}

function stock_badge(array $p): string
{
    if ($p['stock'] !== null && (int)$p['stock'] <= 0) {
        return '<span class="rounded-full border border-white/15 bg-black/60 px-2.5 py-1 text-[0.7rem] font-medium uppercase tracking-wider text-zinc-300">Sold out</span>';
    }
    if ($p['compare_price'] !== null && (int)$p['compare_price'] > (int)$p['price']) {
        $off = (int)round(100 - ((int)$p['price'] / (int)$p['compare_price']) * 100);
        return '<span class="rounded-full bg-accent px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-wider text-white">' . $off . '% off</span>';
    }
    return '';
}

function price_html(array $p, string $size = 'text-base'): string
{
    $out = '<span class="font-display font-semibold text-white ' . $size . '" style="font-variant-numeric:tabular-nums">' . e(money($p['price'])) . '</span>';
    if ($p['compare_price'] !== null && (int)$p['compare_price'] > (int)$p['price']) {
        $out .= ' <s class="text-sm text-zinc-500">' . e(money($p['compare_price'])) . '</s>';
    }
    return $out;
}

/** $hideOnPhone hides a trailing odd card in the 2-column phone grid so no card sits alone. */
function product_card(array $p, bool $hideOnPhone = false): string
{
    $href = e(url('product.php?p=' . rawurlencode($p['slug'])));
    $soldOut = $p['stock'] !== null && (int)$p['stock'] <= 0;
    $img = !empty($p['image'])
        ? '<img src="' . e(image_url($p['image'])) . '" alt="' . e($p['name']) . '" loading="lazy" decoding="async" class="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]">'
        : product_placeholder($p['name']);
    $badge = stock_badge($p);
    $cat = !empty($p['category_name']) ? '<p class="text-[0.7rem] font-medium uppercase tracking-[0.14em] text-accent-soft">' . e($p['category_name']) . '</p>' : '';
    $button = $soldOut
        ? '<button type="button" disabled class="w-full cursor-not-allowed rounded-full border border-white/10 px-4 py-2.5 text-sm text-zinc-500">Sold out</button>'
        : '<form method="post" action="' . e(url('cart.php')) . '" data-add-to-cart>'
            . csrf_field()
            . '<input type="hidden" name="action" value="add"><input type="hidden" name="product_id" value="' . (int)$p['id'] . '"><input type="hidden" name="qty" value="1">'
            . '<button type="submit" class="btn-ghost inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-white">' . icon('plus', 'h-4 w-4') . 'Add to cart</button></form>';

    return '<article class="card group flex-col overflow-hidden rounded-2xl ' . ($hideOnPhone ? 'hidden lg:flex' : 'flex') . '" data-reveal>'
        . '<a href="' . $href . '" class="relative block aspect-square overflow-hidden bg-[#121217]">' . $img
        . ($badge ? '<span class="absolute left-3 top-3">' . $badge . '</span>' : '') . '</a>'
        . '<div class="flex flex-1 flex-col p-4 sm:p-5">' . $cat
        . '<h3 class="mt-1.5 font-display text-base font-semibold leading-snug text-white sm:text-lg"><a href="' . $href . '" class="hover:text-accent-soft">' . e($p['name']) . '</a></h3>'
        . '<p class="mt-2">' . price_html($p) . '</p>'
        . '<div class="mt-auto pt-4">' . $button . '</div></div></article>';
}

/** Base SELECT for product listings, including category name and first image. */
function product_select(): string
{
    return "SELECT p.*, c.name AS category_name, c.slug AS category_slug,
              (SELECT path FROM product_images i WHERE i.product_id = p.id ORDER BY i.sort_order, i.id LIMIT 1) AS image
            FROM products p LEFT JOIN categories c ON c.id = p.category_id";
}
