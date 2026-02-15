-- Add device_sms_id column to sms_messages for better deduplication
ALTER TABLE `sms_messages` 
ADD COLUMN `device_sms_id` VARCHAR(100) NULL AFTER `id`;

-- Add index for faster lookups
CREATE INDEX `idx_device_sms_id` ON `sms_messages` (`device_sms_id`);
