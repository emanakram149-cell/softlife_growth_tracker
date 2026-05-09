<?php
require_once __DIR__ . '/../includes/helpers.php';
setHeaders();

$userId = requireAuth();
$db     = getDB();
$method = $_SERVER['REQUEST_METHOD'];

// GET /api/habits.php  → list today's habits
if ($method === 'GET') {
    $date = $_GET['date'] ?? date('Y-m-d');
    $st   = $db->prepare('SELECT * FROM habits WHERE user_id = ? AND habit_date = ? ORDER BY created_at DESC');
    $st->execute([$userId, $date]);
    ok(['habits' => $st->fetchAll()]);
}

// POST /api/habits.php  → add habit
if ($method === 'POST') {
    $b    = body();
    $act  = $b['action'] ?? 'add';

    if ($act === 'add') {
        $name = clean($b['name'] ?? '', 100);
        if (!$name) fail('Habit name required.');
        $date = date('Y-m-d');
        $db->prepare('INSERT INTO habits (user_id, name, done, streak, habit_date) VALUES (?, ?, 0, 1, ?)')
           ->execute([$userId, $name, $date]);
        $id = (int) $db->lastInsertId();
        ok(['id' => $id]);
    }

    if ($act === 'toggle') {
        $id   = (int)($b['id'] ?? 0);
        $done = (int)($b['done'] ?? 0);
        // Update streak: if marking done, increment streak
        if ($done) {
            $db->prepare('UPDATE habits SET done = 1, streak = streak + 1 WHERE id = ? AND user_id = ?')
               ->execute([$id, $userId]);
        } else {
            $db->prepare('UPDATE habits SET done = 0 WHERE id = ? AND user_id = ?')
               ->execute([$id, $userId]);
        }
        ok();
    }
}

// DELETE /api/habits.php?id=X
if ($method === 'DELETE') {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) fail('ID required.');
    $db->prepare('DELETE FROM habits WHERE id = ? AND user_id = ?')->execute([$id, $userId]);
    ok();
}

fail('Method not allowed.', 405);
