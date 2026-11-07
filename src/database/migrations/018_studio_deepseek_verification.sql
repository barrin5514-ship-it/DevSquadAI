CREATE TABLE studio_deepseek_verification (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  model TEXT NOT NULL,
  key_fingerprint TEXT NOT NULL,
  input_price REAL NOT NULL,
  output_price REAL NOT NULL,
  source TEXT NOT NULL,
  checked_at TEXT NOT NULL
);
