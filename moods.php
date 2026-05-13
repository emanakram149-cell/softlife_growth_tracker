<?php
require_once __DIR__ . '/../includes/helpers.php';
setHeaders();

$userId = requireAuth();
$db     = getDB();
$method = $_SERVER['REQUEST_METHOD'];

// GET /api/habits.php  → list today's habits (with auto streak reset)
if ($method === 'GET') {
    $date      = $_GET['date'] ?? date('Y-m-d');
    $today     = date('Y-m-d');
    $yesterday = date('Y-m-d', strtotime('-1 day'));

    // Fix #11: Auto-reset streak — for each habit whose latest date is
    // older than yesterday, set streak back to 0.
    // We look at the most recent habit_date per habit name/identity.
    // Since habits are created fresh each day, we look at all habits
    // for this user and reset those whose last entry is stale.
    $db->prepare("
        UPDATE habits
        SET streak = 0
        WHERE user_id = ?
          AND streak > 0
          AND habit_date < ?
          AND id IN (
              SELECT id FROM (
                  SELECT h2.id
                  FROM habits h2
                  WHERE h2.user_id = ?
                    AND h2.habit_date < ?
                    AND NOT EXISTS (
                        SELECT 1 FROM habits h3
                        WHERE h3.user_id = h2.user_id
                          AND h3.name = h2.name
                          AND h3.habit_date >= ?
                    )
              ) AS stale
          )
    ")->execute([$userId, $yesterday, $userId, $yesterday, $yesterday]);

    $st = $db->prepare('SELECT * FROM habits WHERE user_id = ? AND habit_date = ? ORDER BY created_at DESC');
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
