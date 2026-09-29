<?php
/* One-time setup. Creates the database tables, the admin login and config.php.
   Delete this file from your hosting after the shop is installed. */
define('SKIP_INSTALL_CHECK', true);
require __DIR__ . '/inc/bootstrap.php';

$installed = $GLOBALS['config'] !== null;
$errors = [];
$v = [
    'driver' => 'mysql', 'db_host' => 'localhost', 'db_name' => '', 'db_user' => '', 'db_pass' => '',
    'store_name' => '', 'username' => 'admin', 'sample' => '1',
];

if (!$installed && is_post()) {
    csrf_check();
    foreach ($v as $k => $_) {
        $v[$k] = $k === 'db_pass' ? (string)($_POST['db_pass'] ?? '') : input($k);
    }
    $v['sample'] = isset($_POST['sample']) ? '1' : '0';
    $password = (string)($_POST['password'] ?? '');

    if (!in_array($v['driver'], ['mysql', 'sqlite'], true)) {
        $errors[] = 'Choose a database type.';
    }
    if ($v['driver'] === 'mysql' && ($v['db_name'] === '' || $v['db_user'] === '')) {
        $errors[] = 'Enter the MySQL database name and username from Hostinger.';
    }
    if ($v['store_name'] === '') {
        $errors[] = 'Enter your shop name.';
    }
    if (!preg_match('/^[A-Za-z0-9_.-]{3,60}$/', $v['username'])) {
        $errors[] = 'Admin username must be 3–60 letters, numbers, dots, dashes or underscores.';
    }
    if (strlen($password) < 8) {
        $errors[] = 'Admin password must be at least 8 characters.';
    }
    if (!is_writable(__DIR__)) {
        $errors[] = 'The shop folder is not writable, so config.php cannot be created.';
    }

    if (!$errors) {
        $dbConfig = $v['driver'] === 'sqlite'
            ? ['driver' => 'sqlite', 'sqlite_path' => __DIR__ . '/data/shop.sqlite']
            : ['driver' => 'mysql', 'host' => $v['db_host'] ?: 'localhost', 'port' => 3306, 'name' => $v['db_name'], 'user' => $v['db_user'], 'pass' => $v['db_pass']];
        try {
            $pdo = db_connect($dbConfig);
        } catch (PDOException $ex) {
            $errors[] = 'Could not connect to the database. Check the name, username and password. (' . $ex->getMessage() . ')';
        }
    }

    if (!$errors) {
        try {
            foreach (schema_sql($dbConfig['driver']) as $sql) {
                try {
                    $pdo->exec($sql);
                } catch (PDOException $ex) {
                    if (!str_starts_with(ltrim($sql), 'CREATE INDEX')) {
                        throw $ex;
                    }
                }
            }
            if ((int)$pdo->query('SELECT COUNT(*) FROM admins')->fetchColumn() > 0) {
                throw new RuntimeException('This database already has a shop installed. Use an empty database, or restore config.php.');
            }
            $GLOBALS['config'] = ['db' => $dbConfig];
            db($pdo);
            $pdo->beginTransaction();
            $defaults = default_settings();
            $defaults['store_name'] = $v['store_name'];
            $defaults['meta_description'] = 'Order online from ' . $v['store_name'] . '. Home delivery across Mymensingh. Pay cash on delivery or online.';
            foreach ($defaults as $k => $val) {
                db_exec('INSERT INTO settings (k, v) VALUES (?, ?)', [$k, $val]);
            }
            db_insert('admins', ['username' => $v['username'], 'password_hash' => password_hash($password, PASSWORD_DEFAULT), 'created_at' => now()]);
            if ($v['sample'] === '1') {
                install_sample_data();
            }
            $pdo->commit();

            $php = "<?php\n// Created by install.php. Keep this file private.\nreturn " . var_export([
                'db' => $dbConfig,
                'site_url' => '',   // e.g. 'https://shop.example.com' if links come out wrong; leave '' to auto-detect
                'debug' => false,   // true shows error details; keep false on a live shop
            ], true) . ";\n";
            if (file_put_contents(CONFIG_FILE, $php, LOCK_EX) === false) {
                throw new RuntimeException('Could not write config.php. Check folder permissions.');
            }
            @chmod(CONFIG_FILE, 0640);
            $_SESSION = [];
            session_regenerate_id(true);
            $installed = true;
            $justInstalled = true;
        } catch (Throwable $ex) {
            if (isset($pdo) && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            $errors[] = $ex instanceof RuntimeException ? $ex->getMessage() : 'Setup failed: ' . $ex->getMessage();
        }
    }
}

/** Generic placeholder products so the template doesn't look empty. Clearly marked as samples. */
function install_sample_data(): void
{
    $cats = ['Cakes' => 1, 'Pastries' => 2, 'Cookies' => 3, 'Gift Boxes' => 4];
    $ids = [];
    foreach ($cats as $name => $sort) {
        $ids[$name] = db_insert('categories', ['name' => $name, 'slug' => slugify($name), 'sort_order' => $sort, 'created_at' => now()]);
    }
    $note = "\n\nThis is a sample product. Edit or delete it in the admin panel.";
    $products = [
        ['Chocolate Fudge Cake (1 lb)', 'Cakes', 1200, 1350, null, 1, 'Moist chocolate sponge with fudge frosting.'],
        ['Vanilla Cream Cake (1 lb)', 'Cakes', 950, null, null, 1, 'Light vanilla sponge layered with fresh cream.'],
        ['Red Velvet Cake (2 lb)', 'Cakes', 2200, null, 5, 0, 'Classic red velvet with cream cheese frosting.'],
        ['Chocolate Pastry', 'Pastries', 120, null, null, 1, 'Single slice, rich and creamy.'],
        ['Fruit Tart', 'Pastries', 150, null, 12, 0, 'Buttery tart shell with custard and seasonal fruit.'],
        ['Butter Cookies (250 g)', 'Cookies', 280, 320, null, 1, 'Crisp, buttery cookies in a reusable tin.'],
        ['Oatmeal Raisin Cookies (250 g)', 'Cookies', 300, null, 0, 0, 'Chewy oats and raisins.'],
        ['Celebration Gift Box', 'Gift Boxes', 1800, null, 8, 0, 'A mix of cookies, pastries and a small cake.'],
    ];
    foreach ($products as $i => [$name, $cat, $price, $compare, $stock, $featured, $short]) {
        db_insert('products', [
            'category_id' => $ids[$cat],
            'name' => $name,
            'slug' => unique_slug('products', slugify($name)),
            'short_desc' => $short,
            'description' => $short . $note,
            'price' => $price,
            'compare_price' => $compare,
            'stock' => $stock,
            'featured' => $featured,
            'active' => 1,
            'sort_order' => $i,
            'created_at' => date('Y-m-d H:i:s', time() - (count($products) - $i) * 60),
            'updated_at' => now(),
        ]);
    }
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>Install your shop</title>
<?= head_assets() ?>
</head>
<body>
<main class="mx-auto max-w-xl px-4 py-14">
  <div class="flex items-center gap-2.5 font-display text-lg font-bold text-white"><span class="inline-block h-2.5 w-2.5 rounded-sm bg-accent shadow-[0_0_14px_rgba(139,92,246,0.9)]"></span>Shop setup</div>

  <?php if ($installed): ?>
  <div class="panel mt-8 rounded-3xl p-7">
    <?php if (!empty($justInstalled)): ?>
    <h1 class="font-display text-2xl font-semibold text-white">Your shop is ready</h1>
    <p class="mt-3 text-muted">Log in to add products, set your WhatsApp number and delivery charges.</p>
    <p class="mt-4 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">Important: delete <strong>install.php</strong> from your hosting File Manager now.</p>
    <div class="mt-6 flex flex-col gap-3 sm:flex-row">
      <a href="<?= e(url('admin/login.php')) ?>" class="btn-primary rounded-full px-6 py-3 text-center font-medium">Go to admin</a>
      <a href="<?= e(url('')) ?>" class="btn-ghost rounded-full px-6 py-3 text-center text-white">View shop</a>
    </div>
    <?php else: ?>
    <h1 class="font-display text-2xl font-semibold text-white">Already installed</h1>
    <p class="mt-3 text-muted">This shop is set up. For safety, delete install.php from your hosting.</p>
    <a href="<?= e(url('admin/login.php')) ?>" class="btn-primary mt-6 inline-flex rounded-full px-6 py-3 font-medium">Go to admin</a>
    <?php endif; ?>
  </div>
  <?php else: ?>
  <h1 class="mt-8 font-display text-3xl font-semibold tracking-tight text-white">Install your shop</h1>
  <p class="mt-3 text-muted">This takes about a minute. In Hostinger, create a MySQL database first (hPanel → Databases → MySQL Databases), then fill in its details here.</p>

  <?php foreach ($errors as $err): ?><p class="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200" role="alert"><?= e($err) ?></p><?php endforeach; ?>

  <form method="post" class="mt-8 flex flex-col gap-6">
    <?= csrf_field() ?>
    <fieldset class="panel rounded-3xl p-6">
      <legend class="sr-only">Database</legend>
      <h2 class="font-display font-semibold text-white">1. Database</h2>
      <div class="mt-4 grid gap-4">
        <div class="grid gap-2 sm:grid-cols-2">
          <label class="choice flex cursor-pointer items-center gap-3 rounded-xl p-3 text-sm text-white"><input type="radio" name="driver" value="mysql" <?= $v['driver'] === 'mysql' ? 'checked' : '' ?>>MySQL (Hostinger)</label>
          <label class="choice flex cursor-pointer items-center gap-3 rounded-xl p-3 text-sm text-white"><input type="radio" name="driver" value="sqlite" <?= $v['driver'] === 'sqlite' ? 'checked' : '' ?>>SQLite (testing only)</label>
        </div>
        <div><label for="db_host" class="text-sm text-zinc-200">Host</label><input id="db_host" name="db_host" value="<?= e($v['db_host']) ?>" class="field mt-2 h-11 w-full rounded-xl px-4"></div>
        <div><label for="db_name" class="text-sm text-zinc-200">Database name</label><input id="db_name" name="db_name" value="<?= e($v['db_name']) ?>" placeholder="u123456789_shop" class="field mt-2 h-11 w-full rounded-xl px-4"></div>
        <div><label for="db_user" class="text-sm text-zinc-200">Database username</label><input id="db_user" name="db_user" value="<?= e($v['db_user']) ?>" placeholder="u123456789_admin" class="field mt-2 h-11 w-full rounded-xl px-4"></div>
        <div><label for="db_pass" class="text-sm text-zinc-200">Database password</label><input id="db_pass" name="db_pass" type="password" autocomplete="off" class="field mt-2 h-11 w-full rounded-xl px-4"></div>
      </div>
    </fieldset>
    <fieldset class="panel rounded-3xl p-6">
      <legend class="sr-only">Shop and admin</legend>
      <h2 class="font-display font-semibold text-white">2. Shop and admin login</h2>
      <div class="mt-4 grid gap-4">
        <div><label for="store_name" class="text-sm text-zinc-200">Shop name</label><input id="store_name" name="store_name" value="<?= e($v['store_name']) ?>" required class="field mt-2 h-11 w-full rounded-xl px-4"></div>
        <div><label for="username" class="text-sm text-zinc-200">Admin username</label><input id="username" name="username" value="<?= e($v['username']) ?>" required autocomplete="username" class="field mt-2 h-11 w-full rounded-xl px-4"></div>
        <div><label for="password" class="text-sm text-zinc-200">Admin password (8+ characters)</label><input id="password" name="password" type="password" required minlength="8" autocomplete="new-password" class="field mt-2 h-11 w-full rounded-xl px-4"></div>
        <label class="flex items-start gap-3 text-sm"><input type="checkbox" name="sample" value="1" <?= $v['sample'] === '1' ? 'checked' : '' ?> class="mt-0.5 h-4 w-4"><span class="text-zinc-200">Add sample categories and products<span class="block text-xs text-zinc-500">Marked as samples. Edit or delete them later.</span></span></label>
      </div>
    </fieldset>
    <button class="btn-primary rounded-full px-6 py-3.5 font-medium">Install shop</button>
  </form>
  <?php endif; ?>
</main>
</body>
</html>
