<?php
require_once __DIR__ . '/../includes/helpers.php';
setHeaders();

$userId = requireAuth();
$db     = getDB();
$method = $_SERVER['REQUEST_METHOD'];

// GET → all entries
if ($method === 'GET') {
    $st = $db->prepare('SELECT * FROM journal WHERE user_id = ? ORDER BY created_at DESC');
    $st->execute([$userId]);
    ok(['journal' => $st->fetchAll()]);
}

// POST → add entry
if ($method === 'POST') {
    $b       = body();
    $title   = clean($b['title']   ?? '', 100);
    $content = clean($b['content'] ?? '', 1000);
    if (!$title && !$content) fail('Title or content required.');

    $db->prepare('INSERT INTO journal (user_id, title, content) VALUES (?, ?, ?)')
       ->execute([$userId, $title, $content]);
    $id = (int) $db->lastInsertId();
    ok(['id' => $id]);
}

// DELETE ?id=X
if ($method === 'DELETE') {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) fail('ID required.');
    $db->prepare('DELETE FROM journal WHERE id = ? AND user_id = ?')->execute([$id, $userId]);
    ok();
}

fail('Method not allowed.', 405);
