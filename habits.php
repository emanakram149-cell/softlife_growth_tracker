<?php
require_once __DIR__ . '/../includes/helpers.php';
setHeaders();

$token = $_SERVER['HTTP_X_TOKEN'] ?? '';
if ($token && strlen($token) === 64) {
    getDB()->prepare('DELETE FROM sessions WHERE token = ?')->execute([$token]);
}
ok(['message' => 'Logged out.']);
