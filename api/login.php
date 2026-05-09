<?php
require_once __DIR__ . '/../includes/helpers.php';
setHeaders();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // ── GENERATE & RETURN MATH CAPTCHA CHALLENGE ──
    if (!session_id()) session_start();
    $n1 = random_int(1, 12);
    $n2 = random_int(1, 12);
    $_SESSION['math_captcha_answer'] = $n1 + $n2;
    $_SESSION['math_captcha_time']   = time();
    ok(['question' => "What is {$n1} + {$n2} = ?"]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail('POST only.');

if (!session_id()) session_start();

$b        = body();
$email    = filter_var(trim($b['email']    ?? ''), FILTER_SANITIZE_EMAIL);
$password = $b['password'] ?? '';
$captcha  = isset($b['captcha_answer']) ? (int)$b['captcha_answer'] : null;

// ── VALIDATE INPUTS ──
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Invalid email.');
if (!$password) fail('Password required.');

// ── VALIDATE MATH CAPTCHA ──
if ($captcha === null) fail('Captcha answer is required.');
$expected  = $_SESSION['math_captcha_answer'] ?? null;
$captchaTs = $_SESSION['math_captcha_time']   ?? 0;

if ($expected === null)           fail('Captcha session expired. Please refresh.');
if ((time() - $captchaTs) > 300) fail('Captcha expired (5 min). Please refresh the page.');
if ($captcha !== (int)$expected)  fail('Incorrect captcha answer. Please try again.');

// Invalidate captcha after single use
unset($_SESSION['math_captcha_answer'], $_SESSION['math_captcha_time']);

$db = getDB();

// ── FIND USER ──
$st = $db->prepare('SELECT * FROM users WHERE email = ?');
$st->execute([$email]);
$user = $st->fetch();

if (!$user || !password_verify($password, $user['password']))
    fail('Incorrect email or password.');

// ── DELETE EXPIRED SESSIONS ──
$db->prepare('DELETE FROM sessions WHERE user_id = ? AND expires_at < NOW()')
   ->execute([$user['id']]);

// ── CREATE SESSION ──
$token   = makeToken();
$expires = date('Y-m-d H:i:s', strtotime('+30 days'));
$db->prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
   ->execute([$token, $user['id'], $expires]);

ok([
    'token' => $token,
    'user'  => [
        'id'       => (int) $user['id'],
        'username' => $user['username'],
        'email'    => $user['email'],
        'gender'   => $user['gender'],
    ],
]);
