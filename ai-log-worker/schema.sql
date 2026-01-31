CREATE TABLE IF NOT EXISTS logs (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  session_id TEXT,
  agent TEXT NOT NULL,
  input_summary TEXT,
  raw_output TEXT NOT NULL,
  parsed_json TEXT,
  error TEXT,
  duration_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_created_at ON logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent ON logs(agent);

