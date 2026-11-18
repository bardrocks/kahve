ALTER TABLE payments ADD COLUMN IF NOT EXISTS order_ref TEXT;
CREATE INDEX IF NOT EXISTS payments_order_ref ON payments (order_ref);
