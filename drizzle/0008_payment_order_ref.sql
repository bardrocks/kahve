ALTER TABLE payments ADD COLUMN order_ref TEXT;
CREATE INDEX IF NOT EXISTS payments_order_ref ON payments (order_ref);
