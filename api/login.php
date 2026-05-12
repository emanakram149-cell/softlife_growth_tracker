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
// ── LOGIN RATE LIMITING ──
$ip = $_SERVER['REMOTE_ADDR'] ?? '';
$db = getDB();

// failed_logins table banao agar nahi hai
$db->exec("CREATE TABLE IF NOT EXISTS failed_logins (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ip (ip_address)
) ENGINE=InnoDB");

// Last 15 min mein is IP se kitne failed attempts?
$st = $db->prepare("SELECT COUNT(*) as cnt FROM failed_logins 
    WHERE ip_address = ? 
    AND attempted_at > DATE_SUB(NOW(), INTERVAL 15 MINUTE)");
$st->execute([$ip]);
$attempts = $st->fetch()['cnt'];

if ($attempts >= 5) {
    fail('Too many failed attempts. Please wait 15 minutes.', 429);
}
// ── FIND USER ──
$st = $db->prepare('SELECT * FROM users WHERE email = ?');
$st->execute([$email]);
$user = $st->fetch();

if (!$user || !password_verify($password, $user['password'])) {
    // Failed attempt record karo
    $db->prepare("INSERT INTO failed_logins (ip_address) VALUES (?)")
       ->execute([$ip]);
    fail('Incorrect email or password.');
}

// Successful login pe is IP ki failures clear karo
$db->prepare("DELETE FROM failed_logins WHERE ip_address = ?")
   ->execute([$ip]);

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
