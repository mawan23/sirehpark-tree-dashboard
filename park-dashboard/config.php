<?php
// ── InfinityFree Database Configuration ──────────────────────────────────────
define('DB_HOST', 'sql204.infinityfree.com');
define('DB_NAME', 'if0_41764337_sirehtree_db');
define('DB_USER', 'if0_41764337');
define('DB_PASS', 'DB_PASSWORD');  // ← paste your MySQL password here
define('DB_PORT', 3306);

function getDB() {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $pdo = new PDO($dsn, DB_USER, DB_PASS, array(
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ));
    }
    return $pdo;
}

function jsonOut($data, $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}
