<?php
require dirname(__DIR__) . '/inc/admin.php';
require_admin();

$id = (int)query('id');
$product = $id ? db_one('SELECT * FROM products WHERE id = ?', [$id]) : null;
if ($id && !$product) {
    flash('error', 'That product no longer exists.');
    redirect('admin/products.php');
}
$categories = db_all('SELECT id, name FROM categories ORDER BY sort_order, name');
$errors = [];
$v = [
    'name' => $product['name'] ?? '',
    'slug' => $product['slug'] ?? '',
    'category_id' => (string)($product['category_id'] ?? ''),
    'short_desc' => $product['short_desc'] ?? '',
    'description' => $product['description'] ?? '',
    'price' => isset($product['price']) ? (string)$product['price'] : '',
    'compare_price' => isset($product['compare_price']) ? (string)$product['compare_price'] : '',
    'stock' => isset($product['stock']) ? (string)$product['stock'] : '',
    'sort_order' => (string)($product['sort_order'] ?? '0'),
    'featured' => (string)($product['featured'] ?? '0'),
    'active' => (string)($product['active'] ?? '1'),
];

if (is_post()) {
    csrf_check();
    foreach (['name', 'slug', 'category_id', 'short_desc', 'description', 'price', 'compare_price', 'stock', 'sort_order'] as $k) {
        $v[$k] = input($k);
    }
    $v['featured'] = isset($_POST['featured']) ? '1' : '0';
    $v['active'] = isset($_POST['active']) ? '1' : '0';

    if ($v['name'] === '' || mb_strlen($v['name']) > 191) {
        $errors['name'] = 'Enter a product name (up to 191 characters).';
    }
    if (!preg_match('/^\d{1,9}$/', $v['price'])) {
        $errors['price'] = 'Enter the price as a whole number, like 1200.';
    }
    if ($v['compare_price'] !== '' && !preg_match('/^\d{1,9}$/', $v['compare_price'])) {
        $errors['compare_price'] = 'Enter a whole number, or leave it empty.';
    }
    if ($v['stock'] !== '' && !preg_match('/^\d{1,7}$/', $v['stock'])) {
        $errors['stock'] = 'Enter a whole number, or leave it empty for unlimited.';
    }
    if (mb_strlen($v['short_desc']) > 255) {
        $errors['short_desc'] = 'Keep the short description under 255 characters.';
    }
    $catId = $v['category_id'] !== '' ? (int)$v['category_id'] : null;
    if ($catId !== null && !db_val('SELECT id FROM categories WHERE id = ?', [$catId])) {
        $catId = null;
    }

    $newFiles = uploaded_files('images');
    $stored = [];
    if (!$errors) {
        foreach ($newFiles as $f) {
            try {
                $stored[] = store_image($f);
            } catch (RuntimeException $ex) {
                $errors['images'] = $ex->getMessage();
                break;
            }
        }
        if (isset($errors['images'])) {
            foreach ($stored as $s) {
                delete_image_file($s);
            }
        }
    }

    if (!$errors) {
        $slug = unique_slug('products', slugify($v['slug'] !== '' ? $v['slug'] : $v['name']), $id);
        $data = [
            'category_id' => $catId,
            'name' => $v['name'],
            'slug' => $slug,
            'short_desc' => $v['short_desc'],
            'description' => $v['description'],
            'price' => (int)$v['price'],
            'compare_price' => $v['compare_price'] !== '' ? (int)$v['compare_price'] : null,
            'stock' => $v['stock'] !== '' ? (int)$v['stock'] : null,
            'featured' => (int)$v['featured'],
            'active' => (int)$v['active'],
            'sort_order' => (int)$v['sort_order'],
            'updated_at' => now(),
        ];
        if ($product) {
            db_update('products', $data, $id);
        } else {
            $data['created_at'] = now();
            $id = db_insert('products', $data);
        }

        // Remove ticked images
        foreach ((array)($_POST['remove_image'] ?? []) as $imgId) {
            $img = db_one('SELECT * FROM product_images WHERE id = ? AND product_id = ?', [(int)$imgId, $id]);
            if ($img) {
                db_exec('DELETE FROM product_images WHERE id = ?', [$img['id']]);
                delete_image_file($img['path']);
            }
        }
        // Main image goes first
        $main = (int)($_POST['main_image'] ?? 0);
        $n = 1;
        foreach (db_all('SELECT id FROM product_images WHERE product_id = ? ORDER BY sort_order, id', [$id]) as $img) {
            db_exec('UPDATE product_images SET sort_order = ? WHERE id = ?', [(int)$img['id'] === $main ? 0 : $n++, $img['id']]);
        }
        foreach ($stored as $path) {
            db_insert('product_images', ['product_id' => $id, 'path' => $path, 'sort_order' => $n++]);
        }

        flash('success', $product ? 'Product saved.' : 'Product added. It is ' . ($v['active'] === '1' ? 'now live in the shop.' : 'hidden until you make it visible.'));
        redirect('admin/product-edit.php?id=' . $id);
    }
}

$images = $id ? db_all('SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order, id', [$id]) : [];

function err(array $errors, string $k): string
{
    return isset($errors[$k]) ? '<p class="mt-1.5 text-sm text-red-300">' . e($errors[$k]) . '</p>' : '';
}

admin_header($product ? 'Edit product' : 'Add product', 'products');
$viewLink = $product && (int)$product['active'] ? '<a href="' . e(url('product.php?p=' . rawurlencode($product['slug']))) . '" target="_blank" rel="noopener" class="btn-ghost inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-white">View in shop' . icon('external', 'h-3.5 w-3.5') . '</a>' : '';
echo admin_page_title($product ? 'Edit product' : 'Add product', $product ? $product['name'] : 'Fill in the details and add at least one photo.', $viewLink);
?>
<?php if ($errors): ?>
<div class="mb-5 flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200" role="alert"><?= icon('alert', 'mt-0.5 h-4 w-4 shrink-0') ?><span>Please fix the fields marked below.</span></div>
<?php endif; ?>

<form method="post" enctype="multipart/form-data" class="grid gap-6 xl:grid-cols-[1fr_340px]">
  <?= csrf_field() ?>
  <div class="flex flex-col gap-6">
    <section class="panel rounded-2xl p-5 sm:p-6">
      <h2 class="font-display font-semibold text-white">Details</h2>
      <div class="mt-5 grid gap-5">
        <div>
          <label for="name" class="text-sm font-medium text-zinc-200">Product name</label>
          <input id="name" name="name" value="<?= e($v['name']) ?>" required maxlength="191" class="field mt-2 h-11 w-full rounded-xl px-4">
          <?= err($errors, 'name') ?>
        </div>
        <div>
          <label for="short_desc" class="text-sm font-medium text-zinc-200">Short description <span class="font-normal text-zinc-500">(one line, shown under the price)</span></label>
          <input id="short_desc" name="short_desc" value="<?= e($v['short_desc']) ?>" maxlength="255" class="field mt-2 h-11 w-full rounded-xl px-4">
          <?= err($errors, 'short_desc') ?>
        </div>
        <div>
          <label for="description" class="text-sm font-medium text-zinc-200">Full description <span class="font-normal text-zinc-500">(leave a blank line between paragraphs)</span></label>
          <textarea id="description" name="description" rows="7" class="field mt-2 w-full rounded-xl px-4 py-3"><?= e($v['description']) ?></textarea>
        </div>
      </div>
    </section>

    <section class="panel rounded-2xl p-5 sm:p-6">
      <h2 class="font-display font-semibold text-white">Photos</h2>
      <p class="mt-1 text-sm text-muted">JPG, PNG, WebP or GIF, up to 5 MB each. Square photos look best. Large photos are resized automatically.</p>
      <?php if ($images): ?>
      <div class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <?php foreach ($images as $i => $img): ?>
        <div class="rounded-xl border border-white/10 p-2">
          <div class="relative aspect-square overflow-hidden rounded-lg bg-[#121217]"><img src="<?= e(image_url($img['path'])) ?>" alt="" class="absolute inset-0 h-full w-full object-cover"></div>
          <label class="mt-2 flex items-center gap-2 text-xs text-zinc-300"><input type="radio" name="main_image" value="<?= (int)$img['id'] ?>" <?= $i === 0 ? 'checked' : '' ?>>Main photo</label>
          <label class="mt-1 flex items-center gap-2 text-xs text-red-300"><input type="checkbox" name="remove_image[]" value="<?= (int)$img['id'] ?>">Remove</label>
        </div>
        <?php endforeach; ?>
      </div>
      <?php endif; ?>
      <label class="mt-5 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 px-4 py-8 text-center hover:border-accent/60">
        <span class="text-accent-soft"><?= icon('image', 'h-6 w-6') ?></span>
        <span class="text-sm text-zinc-200">Choose photos to upload</span>
        <span class="text-xs text-zinc-500">You can select several at once</span>
        <input type="file" name="images[]" accept="image/jpeg,image/png,image/webp,image/gif" multiple class="mt-2 w-full max-w-xs text-xs text-zinc-400 file:mr-3 file:rounded-full file:border-0 file:bg-accent/20 file:px-3 file:py-1.5 file:text-accent-soft">
      </label>
      <?= err($errors, 'images') ?>
    </section>
  </div>

  <div class="flex flex-col gap-6">
    <section class="panel rounded-2xl p-5 sm:p-6">
      <h2 class="font-display font-semibold text-white">Price &amp; stock</h2>
      <div class="mt-5 grid gap-5">
        <div>
          <label for="price" class="text-sm font-medium text-zinc-200">Price (<?= e(setting('currency_label', 'BDT')) ?>)</label>
          <input id="price" name="price" value="<?= e($v['price']) ?>" required inputmode="numeric" placeholder="1200" class="field mt-2 h-11 w-full rounded-xl px-4">
          <?= err($errors, 'price') ?>
        </div>
        <div>
          <label for="compare_price" class="text-sm font-medium text-zinc-200">Old price <span class="font-normal text-zinc-500">(optional, shown crossed out)</span></label>
          <input id="compare_price" name="compare_price" value="<?= e($v['compare_price']) ?>" inputmode="numeric" class="field mt-2 h-11 w-full rounded-xl px-4">
          <?= err($errors, 'compare_price') ?>
        </div>
        <div>
          <label for="stock" class="text-sm font-medium text-zinc-200">Stock <span class="font-normal text-zinc-500">(empty = unlimited)</span></label>
          <input id="stock" name="stock" value="<?= e($v['stock']) ?>" inputmode="numeric" class="field mt-2 h-11 w-full rounded-xl px-4">
          <?= err($errors, 'stock') ?>
        </div>
      </div>
    </section>

    <section class="panel rounded-2xl p-5 sm:p-6">
      <h2 class="font-display font-semibold text-white">Organise</h2>
      <div class="mt-5 grid gap-5">
        <div>
          <label for="category_id" class="text-sm font-medium text-zinc-200">Category</label>
          <select id="category_id" name="category_id" class="field mt-2 h-11 w-full rounded-xl pl-4">
            <option value="">No category</option>
            <?php foreach ($categories as $c): ?><option value="<?= (int)$c['id'] ?>" <?= $v['category_id'] === (string)$c['id'] ? 'selected' : '' ?>><?= e($c['name']) ?></option><?php endforeach; ?>
          </select>
          <?php if (!$categories): ?><p class="mt-1.5 text-xs text-zinc-500"><a class="text-accent-soft" href="<?= e(url('admin/categories.php')) ?>">Create a category</a> first if you want one.</p><?php endif; ?>
        </div>
        <label class="flex items-start gap-3"><input type="checkbox" name="active" value="1" <?= $v['active'] === '1' ? 'checked' : '' ?> class="mt-1 h-4 w-4"><span><span class="block text-sm text-white">Visible in shop</span><span class="block text-xs text-zinc-500">Untick to hide without deleting</span></span></label>
        <label class="flex items-start gap-3"><input type="checkbox" name="featured" value="1" <?= $v['featured'] === '1' ? 'checked' : '' ?> class="mt-1 h-4 w-4"><span><span class="block text-sm text-white">Featured</span><span class="block text-xs text-zinc-500">Shown on the home page</span></span></label>
        <div>
          <label for="sort_order" class="text-sm font-medium text-zinc-200">Sort order <span class="font-normal text-zinc-500">(lower shows first)</span></label>
          <input id="sort_order" name="sort_order" value="<?= e($v['sort_order']) ?>" inputmode="numeric" class="field mt-2 h-11 w-full rounded-xl px-4">
        </div>
        <div>
          <label for="slug" class="text-sm font-medium text-zinc-200">Web address <span class="font-normal text-zinc-500">(optional)</span></label>
          <input id="slug" name="slug" value="<?= e($v['slug']) ?>" placeholder="made from the name" class="field mt-2 h-11 w-full rounded-xl px-4 font-mono text-sm">
        </div>
      </div>
    </section>

    <div class="flex gap-2">
      <button class="btn-primary flex-1 rounded-full px-6 py-3 font-medium"><?= $product ? 'Save changes' : 'Add product' ?></button>
      <a href="<?= e(url('admin/products.php')) ?>" class="btn-ghost rounded-full px-5 py-3 text-sm text-white">Cancel</a>
    </div>
  </div>
</form>
<?php admin_footer();
