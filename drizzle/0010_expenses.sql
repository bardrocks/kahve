CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  created TEXT NOT NULL,
  amount INTEGER NOT NULL,
  method TEXT NOT NULL,
  category TEXT NOT NULL,
  vendor TEXT,
  note TEXT,
  stock_item_id TEXT,
  stock_qty REAL,
  stock_move_id TEXT
);
CREATE INDEX IF NOT EXISTS expenses_created ON expenses (created);
