-- D1 schema for the online message stele (worker/community.js).
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device TEXT NOT NULL,
  who TEXT NOT NULL,
  t TEXT NOT NULL,
  w TEXT NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS posts_at ON posts (at);
CREATE INDEX IF NOT EXISTS posts_device ON posts (device, at);
CREATE TABLE IF NOT EXISTS resonance (
  post INTEGER NOT NULL,
  device TEXT NOT NULL,
  PRIMARY KEY (post, device)
);
