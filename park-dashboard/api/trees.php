<?php
require_once __DIR__ . '/../config.php';

$pdo    = getDB();
$action = isset($_GET['action']) ? $_GET['action'] : 'list';

if ($action === 'list') {
    listTrees($pdo);
} elseif ($action === 'stats') {
    getStats($pdo);
} elseif ($action === 'species') {
    getSpecies($pdo);
} else {
    jsonOut(array('error' => 'Unknown action'), 400);
}

function listTrees($pdo) {
    $status = isset($_GET['status']) ? $_GET['status'] : null;
    $sql = "SELECT
                Tree_No      AS tree_no,
                Input_Type   AS input_type,
                Tree_ID      AS tree_id,
                Tree_Species AS tree_species,
                Latitude     AS latitude,
                Longitude    AS longitude,
                Tree_Height  AS tree_height,
                DBH          AS dbh,
                Tree_Status  AS tree_status,
                Date         AS entry_date,
                Email        AS email,
                Remarks      AS remarks
            FROM Tree_Information";
    $params = array();
    if ($status && $status !== 'all') {
        $sql .= " WHERE Tree_Status = ?";
        $params[] = $status;
    }
    $sql .= " ORDER BY Tree_No ASC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    jsonOut($stmt->fetchAll());
}

function getStats($pdo) {
    $totals = $pdo->query("
        SELECT
            COUNT(*)                            AS total,
            SUM(Tree_Status = 'Alive')          AS live,
            SUM(Tree_Status = 'At Risk')        AS at_risk,
            SUM(Tree_Status = 'Dead')           AS dead,
            SUM(Tree_Status = 'New Planting')   AS new_planting,
            ROUND(AVG(DBH), 2)                  AS avg_dbh,
            ROUND(AVG(Tree_Height), 1)          AS avg_height
        FROM Tree_Information
    ")->fetch();

    $dbh = $pdo->query("
        SELECT
            SUM(DBH < 10)                AS lt10,
            SUM(DBH >= 10 AND DBH < 20)  AS b10_20,
            SUM(DBH >= 20 AND DBH < 30)  AS b20_30,
            SUM(DBH >= 30 AND DBH < 40)  AS b30_40,
            SUM(DBH >= 40)               AS gt40
        FROM Tree_Information
    ")->fetch();

    jsonOut(array('totals' => $totals, 'dbh_dist' => $dbh));
}

function getSpecies($pdo) {
    $rows = $pdo->query("
        SELECT Tree_Species AS species, COUNT(*) AS count
        FROM Tree_Information
        GROUP BY Tree_Species
        ORDER BY count DESC
    ")->fetchAll();
    jsonOut($rows);
}
