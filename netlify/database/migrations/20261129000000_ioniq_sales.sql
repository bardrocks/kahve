CREATE TABLE IF NOT EXISTS ioniq_sales (id TEXT PRIMARY KEY, created TEXT NOT NULL, method TEXT NOT NULL, total INTEGER NOT NULL, items TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS ioniq_sales_created ON ioniq_sales (created);
