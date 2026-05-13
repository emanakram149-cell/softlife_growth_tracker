<?php
require_once __DIR__ . '/../includes/helpers.php';
setHeaders();

$userId = requireAuth();
$db     = getDB();
$method = $_SERVER['REQUEST_METHOD'];

// GET → list last 10 mood entries
if ($method === 'GET') {
    $st = $db->prepare('SELECT * FROM moods WHERE user_id = ? ORDER BY mood_date DESC LIMIT 10');
    $st->execute([$userId]);
    ok(['moods' => $st->fetchAll()]);
}

// POST → log/update today's mood (UPSERT)
if ($method === 'POST') {
    $b     = body();
    $emoji = clean($b['emoji'] ?? '', 10);
    $label = clean($b['label'] ?? '', 30);
    $note  = clean($b['note']  ?? '', 250);
    $date  = date('Y-m-d');

    if (!$emoji || !$label) fail('Emoji and label required.');

    // UPSERT: replace if same date already exists
    $st = $db->prepare('
        INSERT INTO moods (user_id, emoji, label, note, mood_date)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE emoji = VALUES(emoji), label = VALUES(label), note = VALUES(note), logged_at = NOW()
    ');
    $st->execute([$userId, $emoji, $label, $note, $date]);
    ok();
}

fail('Method not allowed.', 405);
