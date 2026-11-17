CREATE TABLE customer_profiles (id TEXT PRIMARY KEY, name TEXT NOT NULL, name_key TEXT NOT NULL UNIQUE, phone TEXT UNIQUE, created TEXT NOT NULL, updated TEXT NOT NULL);
