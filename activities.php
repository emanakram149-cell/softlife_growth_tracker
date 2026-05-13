<?php
require_once __DIR__ . '/../includes/helpers.php';
setHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail('POST only.');

$b        = body();
$username = clean($b['username'] ?? '', 15);
$email    = filter_var(trim($b['email'] ?? ''), FILTER_SANITIZE_EMAIL);
$password = $b['password'] ?? '';
$gender   = $b['gender']   ?? 'default';

// ── VALIDATE INPUTS ──
if (!preg_match('/^[A-Za-z0-9_]{4,15}$/', $username))
    fail('Username must be 4-15 alphanumeric characters.');
if (!filter_var($email, FILTER_VALIDATE_EMAIL))
    fail('Invalid email address.');
if (!in_array($gender, ['male', 'female', 'default']))
    fail('Invalid gender/theme.');
if (strlen($password) < 8 || strlen($password) > 72)
    fail('Password must be 8-72 characters.');
if (!preg_match('/[A-Za-z]/', $password) || !preg_match('/[0-9]/', $password))
    fail('Password must contain letters and numbers.');

$db = getDB();

// ── CHECK DUPLICATES ──
$st = $db->prepare('SELECT id FROM users WHERE email = ? OR username = ?');
$st->execute([$email, $username]);
if ($st->fetch()) fail('Email or username already registered.');

// ── CREATE USER ──
$hash = password_hash($password, PASSWORD_BCRYPT);
$st   = $db->prepare('INSERT INTO users (username, email, password, gender) VALUES (?, ?, ?, ?)');
$st->execute([$username, $email, $hash, $gender]);
$userId = (int) $db->lastInsertId();

// ── CREATE SESSION ──
$token   = makeToken();
$expires = date('Y-m-d H:i:s', strtotime('+30 days'));
$db->prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
   ->execute([$token, $userId, $expires]);

ok([
    'token' => $token,
    'user'  => ['id' => $userId, 'username' => $username, 'email' => $email, 'gender' => $gender],
]);
