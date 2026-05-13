<?php
// ── DATABASE CONFIG ──
// Credentials come from Railway environment variables.
// Falls back to localhost/XAMPP defaults for local development.
define('DB_HOST', getenv('MYSQLHOST')     ?: getenv('DB_HOST')     ?: 'localhost');
define('DB_PORT', getenv('MYSQLPORT')     ?: getenv('DB_PORT')     ?: '3306');
define('DB_USER', getenv('MYSQLUSER')     ?: getenv('DB_USER')     ?: 'root');
define('DB_PASS', getenv('MYSQLPASSWORD') ?: getenv('DB_PASS')     ?: '');
define('DB_NAME', getenv('MYSQLDATABASE') ?: getenv('DB_NAME')     ?: 'softlife_db');

function getDB(): PDO {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    try {
        $dsn_root = 'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';charset=utf8mb4';

        // Step 1: Connect WITHOUT selecting a database first
        $root = new PDO(
            $dsn_root,
            DB_USER, DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );

        // Step 2: Create database if it does not exist
        $root->exec("CREATE DATABASE IF NOT EXISTS `" . DB_NAME . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");

        // Step 3: Now connect to the softlife database
        $pdo = new PDO(
            'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=utf8mb4',
            DB_USER, DB_PASS,
            [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]
        );

        // Step 4: Create each table individually
        // NOTE: PDO on XAMPP does not support multiple statements in one exec() call.
        // Each CREATE TABLE must be a separate exec() call.

        $pdo->exec("CREATE TABLE IF NOT EXISTS users (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            username    VARCHAR(15)  NOT NULL UNIQUE,
            email       VARCHAR(150) NOT NULL UNIQUE,
            password    VARCHAR(255) NOT NULL,
            gender      ENUM('male','female','default') NOT NULL DEFAULT 'default',
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB");

        $pdo->exec("CREATE TABLE IF NOT EXISTS sessions (
            token       VARCHAR(64) PRIMARY KEY,
            user_id     INT NOT NULL,
            expires_at  DATETIME NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB");

        $pdo->exec("CREATE TABLE IF NOT EXISTS habits (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            user_id     INT NOT NULL,
            name        VARCHAR(100) NOT NULL,
            done        TINYINT(1) DEFAULT 0,
            streak      INT DEFAULT 1,
            habit_date  DATE NOT NULL,
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_user_date (user_id, habit_date),
            INDEX idx_user (user_id)
        ) ENGINE=InnoDB");

        $pdo->exec("CREATE TABLE IF NOT EXISTS moods (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            user_id     INT NOT NULL,
            emoji       VARCHAR(10) NOT NULL,
            label       VARCHAR(30) NOT NULL,
            note        VARCHAR(250) DEFAULT '',
            mood_date   DATE NOT NULL,
            logged_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_user_date (user_id, mood_date),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_user (user_id)
        ) ENGINE=InnoDB");

        $pdo->exec("CREATE TABLE IF NOT EXISTS activities (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            user_id         INT NOT NULL,
            name            VARCHAR(100) NOT NULL,
            type            VARCHAR(50) DEFAULT 'general',
            duration        INT DEFAULT 0,
            activity_date   DATE NOT NULL,
            created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_user (user_id)
        ) ENGINE=InnoDB");

        $pdo->exec("CREATE TABLE IF NOT EXISTS goals (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            user_id     INT NOT NULL,
            title       VARCHAR(150) NOT NULL,
            cat         VARCHAR(50) DEFAULT 'Personal',
            progress    INT DEFAULT 0,
            status      ENUM('active','completed') DEFAULT 'active',
            target_date DATE NULL,
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_user (user_id)
        ) ENGINE=InnoDB");

        $pdo->exec("CREATE TABLE IF NOT EXISTS journal (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            user_id     INT NOT NULL,
            title       VARCHAR(100) DEFAULT '',
            content     TEXT NOT NULL,
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_user (user_id)
        ) ENGINE=InnoDB");

        $pdo->exec("CREATE TABLE IF NOT EXISTS feedback (
            id            INT AUTO_INCREMENT PRIMARY KEY,
            user_id       INT NULL,
            rating        TINYINT(1)    NULL,
            category      VARCHAR(50)   DEFAULT '',
            name          VARCHAR(100)  DEFAULT '',
            email         VARCHAR(150)  DEFAULT '',
            feedback_text VARCHAR(2000) NOT NULL,
            ip_address    VARCHAR(45)   DEFAULT '',
            created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
            INDEX idx_feedback_created (created_at)
        ) ENGINE=InnoDB");

        // ── failed_logins table for rate limiting (Fix #4) ──
        $pdo->exec("CREATE TABLE IF NOT EXISTS failed_logins (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            ip_address  VARCHAR(45) NOT NULL,
            attempted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_ip_time (ip_address, attempted_at)
        ) ENGINE=InnoDB");

    } catch (PDOException $e) {
        // Log real error internally; never expose credentials or stack trace to client
        error_log('[SoftLife DB Error] ' . $e->getMessage());
        http_response_code(500);
        die(json_encode([
            'success' => false,
            'error'   => 'A database error occurred. Please try again later.'
        ]));
    }

    return $pdo;
}
