<?php
require_once __DIR__ . '/../config/db.php';

// ── JSON RESPONSE HELPERS ──
function ok(array $data = []): void {
    echo json_encode(array_merge(['success' => true], $data));
    exit;
}

function fail(string $msg, int $code = 400): void {
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $msg]);
    exit;
}

// ── CORS + JSON HEADERS ──
function setHeaders(): void {
    header('Content-Type: application/json; charset=utf-8');

    // Fix #2: Use FRONTEND_URL env var; fall back to * only if not set.
    $allowedOrigin = getenv('FRONTEND_URL') ?: '*';
    header('Access-Control-Allow-Origin: ' . $allowedOrigin);
    header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-Token');

    // Fix #7: Private user data must never be cached by shared caches.
    header('Cache-Control: no-store, no-cache, must-revalidate, private');
    header('Pragma: no-cache');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
}

// ── GET REQUEST BODY AS ARRAY ──
function body(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

// ── VALIDATE SESSION TOKEN ── returns user_id or fails
function requireAuth(): int {
    $token = $_SERVER['HTTP_X_TOKEN'] ?? ($_GET['token'] ?? '');
    if (!$token || strlen($token) !== 64) fail('Not authenticated.', 401);

    $db  = getDB();
    $sql = 'SELECT user_id FROM sessions WHERE token = ? AND expires_at > NOW()';
    $st  = $db->prepare($sql);
    $st->execute([$token]);
    $row = $st->fetch();

    if (!$row) fail('Session expired. Please log in again.', 401);
    return (int) $row['user_id'];
}

// ── GENERATE SECURE TOKEN ──
function makeToken(): string {
    return bin2hex(random_bytes(32)); // 64 hex chars
}

// ── SANITIZE STRING ──
function clean(string $val, int $max = 255): string {
    return substr(trim(strip_tags($val)), 0, $max);
}
