-- -----------------------------------------------------
-- Table structure for table `sms_messages`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `sms_messages` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `sender` VARCHAR(50) NULL,
  `body` TEXT NULL,
  `device_timestamp` DATETIME NULL,
  `sms_hash` VARCHAR(64) NOT NULL,
  `status` VARCHAR(20) DEFAULT 'pending', -- pending, processed, ignored, error
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `idx_sms_hash` (`sms_hash` ASC),
  INDEX `idx_status` (`status` ASC)
);
