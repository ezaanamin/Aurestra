-- Add flags to transactions table
ALTER TABLE transactions 
ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN is_spam BOOLEAN DEFAULT FALSE;

-- Rename sms_messages to sms_history as requested
-- First check if it exists, then rename
-- In SQLite, we can't easily do 'RENAME TABLE IF EXISTS' without complex logic 
-- but we can just try to rename if it's there.
-- Actually, the user might want a NEW table or just use existing one.
-- "Maintain a separate table called SMSHistory that stores all raw SMS messages"
-- Our existing sms_messages table:
--   `id` INT NOT NULL AUTO_INCREMENT,
--   `device_sms_id` VARCHAR(100),
--   `sender` VARCHAR(50) NULL,
--   `body` TEXT NULL,
--   `device_timestamp` DATETIME NULL,
--   `sms_hash` VARCHAR(64) NOT NULL,
--   `status` VARCHAR(20) DEFAULT 'pending',
--   `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

-- Let's create SMSHistory if it doesn't exist or rename.
-- Given we are using SQLAlchemy, it might be better to create a new one or keep the current one.
-- Let's stick to 'sms_history' name in the DB.

CREATE TABLE IF NOT EXISTS `sms_history` (
  `id` INTEGER PRIMARY KEY AUTO_INCREMENT,
  `device_sms_id` VARCHAR(100),
  `sender` VARCHAR(50),
  `body` TEXT,
  `device_timestamp` DATETIME,
  `sms_hash` VARCHAR(64) UNIQUE NOT NULL,
  `status` VARCHAR(20) DEFAULT 'pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Copy data if sms_messages exists (This is MySQL syntax, assuming MySQL/MariaDB based on AUTO_INCREMENT and backticks)
-- If it's SQLite, syntax is slightly different.
-- The previous migrations used backticks and AUTO_INCREMENT, so it's likely MySQL/MariaDB.
-- Wait, '04_create_transactions_table.sql' uses 'id' INT NOT NULL AUTO_INCREMENT.

INSERT INTO sms_history (device_sms_id, sender, body, device_timestamp, sms_hash, status, created_at)
SELECT device_sms_id, sender, body, device_timestamp, sms_hash, status, created_at FROM sms_messages;

DROP TABLE IF EXISTS sms_messages;
