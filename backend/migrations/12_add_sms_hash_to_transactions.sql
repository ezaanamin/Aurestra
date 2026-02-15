-- Add column
ALTER TABLE transactions 
ADD COLUMN sms_hash VARCHAR(64) NULL 
AFTER transaction_hash;

-- Create index
CREATE INDEX idx_transactions_sms_hash 
ON transactions(sms_hash);

-- Optional: Additional performance indexes
CREATE INDEX idx_transactions_date_amount_type 
ON transactions(date, amount, type);
