<?php
require_once __DIR__ . '/../config.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$pdo    = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$body   = json_decode(file_get_contents('php://input'), true);
if (!$body) $body = array();

if ($method === 'POST') {
    createTree($pdo, $body);
} elseif ($method === 'PUT') {
    updateTree($pdo, $body);
} elseif ($method === 'DELETE') {
    deleteTree($pdo, $body);
} else {
    jsonOut(array('error' => 'Method not allowed'), 405);
}

function validateTree($d) {
    $required = array('Tree_No','Input_Type','Tree_ID','Tree_Species','Latitude','Longitude','Tree_Status','Date');
    foreach ($required as $f) {
        if (!isset($d[$f]) || $d[$f] === '') {
            return array('ok' => false, 'msg' => "Missing field: $f");
        }
    }
    return array('ok' => true);
}

function createTree($pdo, $d) {
    $v = validateTree($d);
    if (!$v['ok']) jsonOut(array('error' => $v['msg']), 422);
    $sql = "INSERT INTO Tree_Information
                (Tree_No, Input_Type, Tree_ID, Tree_Species, Latitude, Longitude,
                 Tree_Height, DBH, Tree_Status, Date, Email, Remarks)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)";
    $pdo->prepare($sql)->execute(array(
        $d['Tree_No'], $d['Input_Type'], $d['Tree_ID'], $d['Tree_Species'],
        $d['Latitude'], $d['Longitude'],
        isset($d['Tree_Height']) ? $d['Tree_Height'] : null,
        isset($d['DBH'])         ? $d['DBH']         : null,
        $d['Tree_Status'], $d['Date'],
        isset($d['Email'])   ? $d['Email']   : null,
        isset($d['Remarks']) ? $d['Remarks'] : null,
    ));
    jsonOut(array('success' => true, 'id' => $pdo->lastInsertId()), 201);
}

function updateTree($pdo, $d) {
    if (empty($d['Tree_ID'])) jsonOut(array('error' => 'Tree_ID required'), 422);
    $sql = "UPDATE Tree_Information SET
                Tree_No=?, Input_Type=?, Tree_Species=?, Latitude=?, Longitude=?,
                Tree_Height=?, DBH=?, Tree_Status=?, Date=?, Email=?, Remarks=?
            WHERE Tree_ID = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute(array(
        $d['Tree_No'], $d['Input_Type'], $d['Tree_Species'],
        $d['Latitude'], $d['Longitude'],
        isset($d['Tree_Height']) ? $d['Tree_Height'] : null,
        isset($d['DBH'])         ? $d['DBH']         : null,
        $d['Tree_Status'], $d['Date'],
        isset($d['Email'])   ? $d['Email']   : null,
        isset($d['Remarks']) ? $d['Remarks'] : null,
        $d['Tree_ID'],
    ));
    jsonOut(array('success' => true, 'rows' => $stmt->rowCount()));
}

function deleteTree($pdo, $d) {
    if (empty($d['Tree_ID'])) jsonOut(array('error' => 'Tree_ID required'), 422);
    $stmt = $pdo->prepare("DELETE FROM Tree_Information WHERE Tree_ID = ?");
    $stmt->execute(array($d['Tree_ID']));
    jsonOut(array('success' => true, 'rows' => $stmt->rowCount()));
}
