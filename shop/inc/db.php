<?php
declare(strict_types=1);

function db_connect(array $cfg): PDO
{
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];
    if (($cfg['driver'] ?? 'mysql') === 'sqlite') {
        $pdo = new PDO('sqlite:' . $cfg['sqlite_path'], null, null, $options);
        $pdo->exec('PRAGMA foreign_keys = ON');
        return $pdo;
    }
    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $cfg['host'], (int)($cfg['port'] ?? 3306), $cfg['name']);
    return new PDO($dsn, $cfg['user'], $cfg['pass'], $options);
}

function db(?PDO $use = null): PDO
{
    static $pdo = null;
    if ($use !== null) {
        $pdo = $use;
    }
    if ($pdo === null) {
        $pdo = db_connect($GLOBALS['config']['db']);
    }
    return $pdo;
}

function db_available(): bool
{
    return !empty($GLOBALS['config']['db']);
}

function db_driver(): string
{
    return $GLOBALS['config']['db']['driver'] ?? 'mysql';
}

function db_run(string $sql, array $params = []): PDOStatement
{
    $stmt = db()->prepare($sql);
    $stmt->execute(array_values($params));
    return $stmt;
}

function db_all(string $sql, array $params = []): array
{
    return db_run($sql, $params)->fetchAll();
}

function db_one(string $sql, array $params = []): ?array
{
    $row = db_run($sql, $params)->fetch();
    return $row === false ? null : $row;
}

function db_val(string $sql, array $params = [])
{
    $v = db_run($sql, $params)->fetchColumn();
    return $v === false ? null : $v;
}

function db_exec(string $sql, array $params = []): int
{
    return db_run($sql, $params)->rowCount();
}

function db_insert(string $table, array $data): int
{
    $cols = array_keys($data);
    $sql = 'INSERT INTO ' . $table . ' (' . implode(', ', $cols) . ') VALUES (' . implode(', ', array_fill(0, count($cols), '?')) . ')';
    db_run($sql, array_values($data));
    return (int)db()->lastInsertId();
}

function db_update(string $table, array $data, int $id): void
{
    $set = implode(', ', array_map(fn($c) => $c . ' = ?', array_keys($data)));
    db_run('UPDATE ' . $table . ' SET ' . $set . ' WHERE id = ?', [...array_values($data), $id]);
}

function now(): string
{
    return date('Y-m-d H:i:s');
}

/** Table definitions, written once and adapted to MySQL or SQLite. */
function schema_sql(string $driver): array
{
    $pk = $driver === 'sqlite' ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'INT UNSIGNED AUTO_INCREMENT PRIMARY KEY';
    $ref = $driver === 'sqlite' ? 'INTEGER' : 'INT UNSIGNED';
    $tail = $driver === 'sqlite' ? '' : ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';

    return [
        "CREATE TABLE IF NOT EXISTS settings (
            k VARCHAR(64) NOT NULL PRIMARY KEY,
            v TEXT
        ){$tail}",
        "CREATE TABLE IF NOT EXISTS admins (
            id {$pk},
            username VARCHAR(60) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            created_at DATETIME NOT NULL
        ){$tail}",
        "CREATE TABLE IF NOT EXISTS login_attempts (
            id {$pk},
            ip VARCHAR(45) NOT NULL,
            attempted_at DATETIME NOT NULL
        ){$tail}",
        "CREATE TABLE IF NOT EXISTS categories (
            id {$pk},
            name VARCHAR(120) NOT NULL,
            slug VARCHAR(191) NOT NULL UNIQUE,
            sort_order INT NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL
        ){$tail}",
        "CREATE TABLE IF NOT EXISTS products (
            id {$pk},
            category_id {$ref} NULL,
            name VARCHAR(191) NOT NULL,
            slug VARCHAR(191) NOT NULL UNIQUE,
            short_desc VARCHAR(255) NOT NULL DEFAULT '',
            description TEXT,
            price INT NOT NULL DEFAULT 0,
            compare_price INT NULL,
            stock INT NULL,
            featured TINYINT NOT NULL DEFAULT 0,
            active TINYINT NOT NULL DEFAULT 1,
            sort_order INT NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
        ){$tail}",
        "CREATE TABLE IF NOT EXISTS product_images (
            id {$pk},
            product_id {$ref} NOT NULL,
            path VARCHAR(255) NOT NULL,
            sort_order INT NOT NULL DEFAULT 0,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        ){$tail}",
        "CREATE TABLE IF NOT EXISTS orders (
            id {$pk},
            code VARCHAR(20) NOT NULL UNIQUE,
            token VARCHAR(64) NOT NULL,
            customer_name VARCHAR(120) NOT NULL,
            phone VARCHAR(30) NOT NULL,
            email VARCHAR(191) NOT NULL DEFAULT '',
            address TEXT,
            zone VARCHAR(20) NOT NULL DEFAULT 'inside',
            note TEXT,
            subtotal INT NOT NULL DEFAULT 0,
            delivery_fee INT NOT NULL DEFAULT 0,
            total INT NOT NULL DEFAULT 0,
            payment_method VARCHAR(20) NOT NULL DEFAULT 'cod',
            payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid',
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            stock_restored TINYINT NOT NULL DEFAULT 0,
            tran_id VARCHAR(64) NOT NULL DEFAULT '',
            val_id VARCHAR(100) NOT NULL DEFAULT '',
            bank_tran_id VARCHAR(100) NOT NULL DEFAULT '',
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL
        ){$tail}",
        "CREATE TABLE IF NOT EXISTS order_items (
            id {$pk},
            order_id {$ref} NOT NULL,
            product_id {$ref} NULL,
            name VARCHAR(191) NOT NULL,
            price INT NOT NULL,
            qty INT NOT NULL,
            line_total INT NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
        ){$tail}",
        "CREATE INDEX idx_products_cat ON products (category_id)",
        "CREATE INDEX idx_orders_status ON orders (status, created_at)",
        "CREATE INDEX idx_orders_tran ON orders (tran_id)",
        "CREATE INDEX idx_login_ip ON login_attempts (ip, attempted_at)",
    ];
}
