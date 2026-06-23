<?php
// debug.php — upload this, visit it, then DELETE it after
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h2>Step 1: PHP Version</h2>";
echo "PHP: " . phpversion() . "<br>";

echo "<h2>Step 2: PDO available?</h2>";
if (extension_loaded('pdo') && extension_loaded('pdo_mysql')) {
    echo "✅ PDO + PDO_MySQL loaded<br>";
} else {
    echo "❌ PDO not available<br>";
    exit;
}

echo "<h2>Step 3: DB Connection</h2>";
$host = 'sql204.infinityfree.com';
$db   = 'if0_41764337_sirehtree_db';
$user = 'if0_41764337';
$pass = 'YOUR_PASSWORD_HERE'; // ← paste your password here

try {
    $pdo = new PDO(
        "mysql:host=$host;port=3306;dbname=$db;charset=utf8mb4",
        $user, $pass,
        array(PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION)
    );
    echo "✅ Connected to database<br>";
} catch (Exception $e) {
    echo "❌ Connection failed: " . $e->getMessage() . "<br>";
    exit;
}

echo "<h2>Step 4: Tables</h2>";
$tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
foreach ($tables as $t) echo "Table: <b>$t</b><br>";

echo "<h2>Step 5: Sample query</h2>";
try {
    $row = $pdo->query("SELECT COUNT(*) AS total FROM trees")->fetch();
    echo "✅ Row count: <b>" . $row['total'] . "</b><br>";
} catch (Exception $e) {
    echo "❌ Query failed: " . $e->getMessage() . "<br>";
}

echo "<h2>Step 6: Column names</h2>";
$cols = $pdo->query("DESCRIBE trees")->fetchAll();
foreach ($cols as $c) echo $c['Field'] . " (" . $c['Type'] . ")<br>";

echo "<h2>Step 7: Sample data row</h2>";
$row = $pdo->query("SELECT * FROM trees LIMIT 1")->fetch(PDO::FETCH_ASSOC);
echo "<pre>" . print_r($row, true) . "</pre>";

echo "<hr><p style='color:red'>⚠️ Delete debug.php after use!</p>";
?>
