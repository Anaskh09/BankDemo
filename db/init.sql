

CREATE DATABASE IF NOT EXISTS bankdemo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bankdemo;

-- IMPORTANT: drop tables in correct order because of foreign keys
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS accounts;
DROP TABLE IF EXISTS users;

-- =========================
-- USERS
-- =========================
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(120) NOT NULL UNIQUE,
  role ENUM('user','admin') NOT NULL DEFAULT 'user',

  -- For VULN mode (intentionally insecure)
  password_plain VARCHAR(100) NULL,

  -- For SECURE mode
  password_hash VARCHAR(255) NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =========================
-- ACCOUNTS
-- =========================
CREATE TABLE accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_accounts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =========================
-- TRANSACTIONS
-- =========================
CREATE TABLE transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  account_id INT NOT NULL,
  type ENUM('credit','debit','transfer') NOT NULL DEFAULT 'transfer',
  beneficiary VARCHAR(120) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  note TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tx_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =========================
-- MESSAGES (XSS demo zone)
-- =========================
CREATE TABLE messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_msg_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;


INSERT INTO users (email, role, password_plain, password_hash) VALUES
('admin@bank.com', 'admin', 'admin123', '$2b$10$QEkOx6zM47TEUdnTqZXO8euqML6ndEZPz/DtRdYJlzn8Jt7l2J4xu'),
('user@bank.com',  'user',  'user123',  '$2b$10$0vdPZawAELq3mzeI3GqoDeYpAYuf0ZEN1QFUKBvxAN6.PzfQYQ6zO');


INSERT INTO accounts (user_id, balance) VALUES
(1, 25000.00),  
(2,  1200.50); 

INSERT INTO transactions (account_id, type, beneficiary, amount, note) VALUES
(2, 'transfer', 'Orange Maroc',  99.00,  'Internet subscription'),
(2, 'transfer', 'CIH Bank',      20.00,  'Fees'),
(2, 'debit',    'Marjane',       150.75, 'Shopping at Marjane'),
(2, 'credit',   'Salary',       3000.00, 'Monthly salary');

INSERT INTO messages (user_id, content) VALUES
(2, 'Bonjour, je veux vérifier mon dernier transfert.'),
(2, 'Merci pour votre support.');
