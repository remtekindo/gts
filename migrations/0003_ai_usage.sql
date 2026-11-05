-- GTS migration 0003 — AI usage log (Meta Model API calls).
-- Applied with: npx wrangler d1 migrations apply gts-db [--local]
-- (Remote: the owner runs it with --remote; see README § Auth.)
--
-- One row per Meta API call (live-test batches + audit chat), so the
-- Overview "Aktivitas Penggunaan AI" card shows real numbers — model,
-- tokens, estimated cost, and peak hour. No dummy rows are ever
-- seeded here; an empty table honestly means "no usage yet".
-- created_at is UTC (SQLite datetime('now')); the Overview card
-- converts hours to WIB (UTC+7) when it builds the histogram.

CREATE TABLE IF NOT EXISTS ai_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  endpoint TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_created ON ai_usage (created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_endpoint ON ai_usage (endpoint);
