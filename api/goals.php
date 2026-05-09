<?php
require_once __DIR__ . '/../includes/helpers.php';
setHeaders();

$userId = requireAuth();
$db     = getDB();
$method = $_SERVER['REQUEST_METHOD'];

// GET → all goals
if ($method === 'GET') {
    $st = $db->prepare('SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC');
    $st->execute([$userId]);
    ok(['goals' => $st->fetchAll()]);
}

// POST → add or update progress
if ($method === 'POST') {
    $b   = body();
    $act = $b['action'] ?? 'add';

    if ($act === 'add') {
        $title    = clean($b['title'] ?? '', 150);
        $cat      = clean($b['cat'] ?? 'Personal', 50);
        $target   = $b['target_date'] ?? null;
        if ($target && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $target)) $target = null;
        if (!$title) fail('Goal title required.');

        $db->prepare('INSERT INTO goals (user_id, title, cat, target_date) VALUES (?, ?, ?, ?)')
           ->execute([$userId, $title, $cat, $target]);
        $id = (int) $db->lastInsertId();
        ok(['id' => $id]);
    }

    if ($act === 'progress') {
        $id       = (int)($b['id'] ?? 0);
        $progress = min(100, max(0, (int)($b['progress'] ?? 0)));
        $status   = $progress >= 100 ? 'completed' : 'active';
        $db->prepare('UPDATE goals SET progress = ?, status = ? WHERE id = ? AND user_id = ?')
           ->execute([$progress, $status, $id, $userId]);
        ok();
    }
}

// DELETE ?id=X
if ($method === 'DELETE') {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) fail('ID required.');
    $db->prepare('DELETE FROM goals WHERE id = ? AND user_id = ?')->execute([$id, $userId]);
    ok();
}

fail('Method not allowed.', 405);
