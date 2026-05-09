<?php
// =====================================================
//  api/feedback.php  — Save feedback to database
//  Method : POST
//  Fields : feedback_text, rating, category, name, email
//  Auth   : Optional (logged-in user_id is also saved)
// =====================================================
require_once __DIR__ . '/../includes/helpers.php';
setHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail('POST only.', 405);

$b = body();

// ── Required field ──
$text = clean($b['feedback_text'] ?? '', 2000);
if (strlen($text) < 3) fail('Please enter your feedback (at least 3 characters).');

// ── Optional fields ──
$rating   = isset($b['rating']) ? max(1, min(5, (int)$b['rating'])) : null;
$category = clean($b['category'] ?? '', 50);
$name     = clean($b['name']     ?? '', 100);
$email    = trim($b['email']     ?? '');
if ($email && !filter_var($email, FILTER_VALIDATE_EMAIL)) $email = '';
$ip = substr($_SERVER['REMOTE_ADDR'] ?? '', 0, 45);

// ── Optional: detect logged-in user ──
$user_id = null;
$token   = $_SERVER['HTTP_X_TOKEN'] ?? ($_GET['token'] ?? '');
if ($token && strlen($token) === 64) {
    try {
        $db2 = getDB();
        $st2 = $db2->prepare('SELECT user_id FROM sessions WHERE token = ? AND expires_at > NOW()');
        $st2->execute([$token]);
        $row2 = $st2->fetch();
        if ($row2) $user_id = (int) $row2['user_id'];
    } catch (Exception $e) { /* optional, ignore */ }
}

// ── Rate limiting: max 5 per IP per hour ──
$db = getDB();
$st = $db->prepare("SELECT COUNT(*) as cnt FROM feedback WHERE ip_address = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)");
$st->execute([$ip]);
$lim = $st->fetch();
if ($lim && $lim['cnt'] >= 5) fail('Too many feedback submissions. Please try again later.', 429);

// ── Save to database ──
$st = $db->prepare('INSERT INTO feedback (user_id, rating, category, name, email, feedback_text, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)');
$st->execute([$user_id, $rating, $category, $name, $email, $text, $ip]);

ok(['message' => 'Thank you! Your feedback has been submitted successfully.']);
