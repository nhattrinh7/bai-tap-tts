DROP TABLE IF EXISTS shares;

CREATE TABLE shares (
  id TEXT PRIMARY KEY,
  object_key TEXT NOT NULL,
  original_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  share_token TEXT UNIQUE NOT NULL,
  expires_at INTEGER NOT NULL,
  max_downloads INTEGER NOT NULL,
  download_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_shares_token ON shares(share_token);
