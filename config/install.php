<?php
// ── SOFTLIFE INSTALLER ──
// Visit: http://localhost/softlife/install.php
// This will auto-create the database and all tables.
// Delete this file after setup is confirmed.

require_once __DIR__ . '/config/db.php';

header('Content-Type: text/html; charset=utf-8');

try {
    $db = getDB(); // This triggers auto-create of DB + all tables

    // Check all tables exist
    $tables = ['users','sessions','habits','moods','activities','goals','journal'];
    $found  = [];
    foreach ($tables as $t) {
        $st = $db->query("SHOW TABLES LIKE '$t'");
        $found[$t] = $st->rowCount() > 0;
    }

    $allOk = !in_array(false, $found, true);
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SoftLife Installer</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', sans-serif; background: #f0f0f8; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  .card { background: #fff; border-radius: 18px; padding: 40px 48px; box-shadow: 0 8px 40px rgba(124,111,247,.15); max-width: 520px; width: 100%; }
  h1 { font-size: 1.7rem; color: #3d2c8d; margin-bottom: 6px; }
  .sub { color: #888; font-size: .92rem; margin-bottom: 28px; }
  .row { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-radius: 10px; margin-bottom: 8px; background: #f8f8ff; }
  .row .name { font-weight: 600; color: #3d2c8d; }
  .ok  { color: #22c55e; font-weight: 700; }
  .fail{ color: #ef4444; font-weight: 700; }
  .banner { margin-top: 24px; padding: 16px 20px; border-radius: 12px; font-weight: 600; font-size: 1rem; text-align: center; }
  .banner.success { background: #dcfce7; color: #166534; }
  .banner.error   { background: #fee2e2; color: #991b1b; }
  .btn { display: block; margin-top: 22px; text-align: center; background: linear-gradient(135deg,#7c6ff7,#a78bfa); color: #fff; padding: 14px 28px; border-radius: 50px; text-decoration: none; font-weight: 700; font-size: 1rem; transition: opacity .2s; }
  .btn:hover { opacity: .88; }
  .warn { margin-top: 14px; font-size: .8rem; color: #888; text-align: center; }
</style>
</head>
<body>
<div class="card">
  <h1>🌱 SoftLife Setup</h1>
  <p class="sub">Checking database and tables...</p>

  <?php foreach ($found as $table => $exists): ?>
  <div class="row">
    <span class="name">📋 <?= $table ?></span>
    <span class="<?= $exists ? 'ok' : 'fail' ?>"><?= $exists ? '✓ Ready' : '✗ Missing' ?></span>
  </div>
  <?php endforeach; ?>

  <?php if ($allOk): ?>
  <div class="banner success">✅ All tables ready! SoftLife is set up correctly.</div>
  <a href="index.html" class="btn">Go to SoftLife →</a>
  <?php else: ?>
  <div class="banner error">❌ Some tables are missing. Refresh this page to retry.</div>
  <?php endif; ?>

  <p class="warn">⚠️ Delete install.php after setup is confirmed.</p>
</div>
</body>
</html>
<?php
} catch (Exception $e) {
?>
<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Error</title>
<style>body{font-family:sans-serif;padding:40px;background:#fee2e2;} pre{background:#fff;padding:20px;border-radius:10px;}</style>
</head><body>
<h2>❌ Connection Error</h2>
<p>Could not connect to MySQL. Make sure XAMPP MySQL is running.</p>
<pre><?= htmlspecialchars($e->getMessage()) ?></pre>
<p>Check <strong>config/db.php</strong> — make sure DB_USER and DB_PASS are correct.</p>
</body></html>
<?php
}
