<?php
// Returns ALL user data in one request — called on dashboard load
require_once __DIR__ . '/../includes/helpers.php';
setHeaders();

$userId = requireAuth();
$db     = getDB();

// Habits — today
$today = date('Y-m-d');
$st = $db->prepare('SELECT * FROM habits WHERE user_id = ? AND habit_date = ? ORDER BY created_at DESC');
$st->execute([$userId, $today]);
$habits = $st->fetchAll();

// Moods — last 10
$st = $db->prepare('SELECT * FROM moods WHERE user_id = ? ORDER BY mood_date DESC LIMIT 10');
$st->execute([$userId]);
$moods = $st->fetchAll();

// Activities — last 20
$st = $db->prepare('SELECT * FROM activities WHERE user_id = ? ORDER BY created_at DESC LIMIT 20');
$st->execute([$userId]);
$activities = $st->fetchAll();

// Goals — all
$st = $db->prepare('SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC');
$st->execute([$userId]);
$goals = $st->fetchAll();

// Journal — all
$st = $db->prepare('SELECT * FROM journal WHERE user_id = ? ORDER BY created_at DESC');
$st->execute([$userId]);
$journal = $st->fetchAll();

// User info
$st = $db->prepare('SELECT id, username, email, gender, created_at FROM users WHERE id = ?');
$st->execute([$userId]);
$user = $st->fetch();

ok([
    'user'       => $user,
    'habits'     => $habits,
    'moods'      => $moods,
    'activities' => $activities,
    'goals'      => $goals,
    'journal'    => $journal,
]);
