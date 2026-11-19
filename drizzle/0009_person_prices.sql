CREATE TABLE IF NOT EXISTS person_prices (
  name_key TEXT NOT NULL,
  product_id TEXT NOT NULL,
  price INTEGER NOT NULL,
  name TEXT NOT NULL,
  updated TEXT NOT NULL,
  PRIMARY KEY (name_key, product_id)
);
