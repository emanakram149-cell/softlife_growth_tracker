<?php
// =====================================================
//  api/cleanup.php
//  Deletes expired sessions (>30 days old) and
//  failed_login records older than 1 hour.
//  Can be called manually or via a cron job.
//
//  Cron example (run daily at 3am):
//    0 3 * * * curl -s https://yourdomain.com/api/cleanup.php
//
//  Simple shared-secret protection: set CLEANUP_SECRET
//  as a Railway env var, then call:
//    /api/cleanup.php?secret=YOUR_SECRET
// =====================================================
require_once __DIR__ . '/../includes/helpers.php';
setHeaders();

// Optional secret key guard — prevents public abuse
$secret = getenv('CLEANUP_SECRET');
if ($secret) {
    $provided = $_GET['secret'] ?? ($_SERVER['HTTP_X_CLEANUP_SECRET'] ?? '');
    if (!hash_equals($secret, $provided)) {
        fail('Unauthorized.', 401);
    }
}

$db = getDB();

// 1. Delete sessions that expired more than 30 days ago
$stSessions = $db->prepare(
    "DELETE FROM sessions WHERE expires_at < DATE_SUB(NOW(), INTERVAL 30 DAY)"
);
$stSessions->execute();
$deletedSessions = $stSessions->rowCount();

// 2. Delete failed_login records older than 1 hour
$stFailed = $db->prepare(
    "DELETE FROM failed_logins WHERE attempted_at < DATE_SUB(NOW(), INTERVAL 1 HOUR)"
);
$stFailed->execute();
$deletedFailed = $stFailed->rowCount();

ok([
    'message'          => 'Cleanup complete.',
    'deleted_sessions' => $deletedSessions,
    'deleted_failed_logins' => $deletedFailed,
]);
