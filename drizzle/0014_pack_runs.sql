CREATE TABLE IF NOT EXISTS pack_runs (id TEXT PRIMARY KEY, item_id TEXT NOT NULL, size REAL NOT NULL, unit TEXT NOT NULL, opened TEXT NOT NULL, closed TEXT, cups INTEGER, adjust INTEGER NOT NULL DEFAULT 0, note TEXT, cost INTEGER);
CREATE INDEX IF NOT EXISTS pack_runs_item ON pack_runs (item_id);
