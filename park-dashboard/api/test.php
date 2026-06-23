<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

echo "Step 1: PHP works. Version = " . phpversion() . "<br>";

$host = 'sql204.infinityfree.com';
$db   = 'if0_41764337_sirehtree_db';
$user = 'if0_41764337';
$pass = 'YOUR_PASSWORD_HERE'; // ← your password

echo "Step 2: Trying DB connection...<br>";
try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$db;charset=utf8mb4",
        $user, $pass,
        array(PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION)
    );
    echo "Step 3: Connected!<br>";

    $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    echo "Step 4: Tables = " . implode(', ', $tables) . "<br>";

    $n = $pdo->query("SELECT COUNT(*) FROM Tree_Information")->fetchColumn();
    echo "Step 5: Tree_Information row count = $n<br>";

    $row = $pdo->query("SELECT * FROM Tree_Information LIMIT 1")->fetch(PDO::FETCH_ASSOC);
    echo "Step 6: Sample row = <pre>" . print_r($row, true) . "</pre>";

    echo "<b style='color:green'>ALL GOOD — ready to load dashboard!</b>";
} catch(Exception $e) {
    echo "<b style='color:red'>ERROR: " . $e->getMessage() . "</b>";
}
