-- =====================================================
--  SOFTLIFE DATABASE
--  Step 1: Open phpMyAdmin → http://localhost/phpmyadmin
--  Step 2: Click "New" → Create database "softlife"
--  Step 3: Select softlife → Click "SQL" tab → Paste this → Go
-- =====================================================

CREATE DATABASE IF NOT EXISTS softlife CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE softlife;

CREATE TABLE IF NOT EXISTS users (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    username    VARCHAR(15)  NOT NULL UNIQUE,
    email       VARCHAR(150) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    gender      ENUM('male','female','default') NOT NULL DEFAULT 'default',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sessions (
    token       VARCHAR(64) PRIMARY KEY,
    user_id     INT NOT NULL,
    expires_at  DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS habits (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    name        VARCHAR(100) NOT NULL,
    done        TINYINT(1) DEFAULT 0,
    streak      INT DEFAULT 1,
    habit_date  DATE NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_date (user_id, habit_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS moods (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    emoji       VARCHAR(10) NOT NULL,
    label       VARCHAR(30) NOT NULL,
    note        VARCHAR(250) DEFAULT '',
    mood_date   DATE NOT NULL,
    logged_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_user_date (user_id, mood_date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS activities (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL,
    name            VARCHAR(100) NOT NULL,
    type            VARCHAR(50) DEFAULT 'general',
    duration        INT DEFAULT 0,
    activity_date   DATE NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS goals (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    title       VARCHAR(150) NOT NULL,
    cat         VARCHAR(50) DEFAULT 'Personal',
    progress    INT DEFAULT 0,
    status      ENUM('active','completed') DEFAULT 'active',
    target_date DATE NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS journal (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    title       VARCHAR(100) DEFAULT '',
    content     TEXT NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── FEEDBACK TABLE ──
CREATE TABLE IF NOT EXISTS feedback (
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
) ENGINE=InnoDB;
