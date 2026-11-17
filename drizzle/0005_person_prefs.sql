CREATE TABLE IF NOT EXISTS person_prefs (
  name_key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  coffee TEXT,
  sugar INTEGER,
  milk TEXT,
  note TEXT,
  updated TEXT NOT NULL
);
