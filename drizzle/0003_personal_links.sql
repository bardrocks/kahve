CREATE TABLE personal_links (code TEXT PRIMARY KEY, person_id TEXT NOT NULL UNIQUE, device_hash TEXT, created TEXT NOT NULL, updated TEXT NOT NULL);
