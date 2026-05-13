<?php
require_once __DIR__ . '/../includes/helpers.php';
setHeaders();

$userId = requireAuth();
$db     = getDB();
$method = $_SERVER['REQUEST_METHOD'];

// GET → list last 20 activities
if ($method === 'GET') {
    $st = $db->prepare('SELECT * FROM activities WHERE user_id = ? ORDER BY created_at DESC LIMIT 20');
    $st->execute([$userId]);
    ok(['activities' => $st->fetchAll()]);
}

// POST → add activity
if ($method === 'POST') {
    $b        = body();
    $name     = clean($b['name'] ?? '', 100);
    $type     = clean($b['type'] ?? 'general', 50);
    $duration = max(0, (int)($b['duration'] ?? 0));
    $date     = date('Y-m-d');

    if (!$name) fail('Activity name required.');

    $db->prepare('INSERT INTO activities (user_id, name, type, duration, activity_date) VALUES (?, ?, ?, ?, ?)')
       ->execute([$userId, $name, $type, $duration, $date]);
    $id = (int) $db->lastInsertId();
    ok(['id' => $id]);
}

// DELETE ?id=X
if ($method === 'DELETE') {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) fail('ID required.');
    $db->prepare('DELETE FROM activities WHERE id = ? AND user_id = ?')->execute([$id, $userId]);
    ok();
}

fail('Method not allowed.', 405);
