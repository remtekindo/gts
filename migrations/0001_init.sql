-- GTS initial schema (D1 / SQLite).
-- Applied with: npx wrangler d1 migrations apply gts-db [--local]
-- Tables mirror the current localStorage model (see app/utils/admin.ts),
-- so the app can move its bank, users and results here without reshaping.

CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  material_slug TEXT NOT NULL,
  number INTEGER NOT NULL,
  part INTEGER NOT NULL,
  skill TEXT NOT NULL,
  stem TEXT NOT NULL,
  context TEXT,
  options_json TEXT NOT NULL,
  correct_letter TEXT NOT NULL CHECK (correct_letter IN ('A', 'B', 'C', 'D')),
  explanation TEXT NOT NULL,
  difficulty INTEGER NOT NULL DEFAULT 3,
  source TEXT NOT NULL DEFAULT 'bank',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (material_slug, number)
);

CREATE TABLE IF NOT EXISTS test_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  material_slug TEXT NOT NULL,
  paper_id TEXT NOT NULL,
  score INTEGER,
  total INTEGER,
  answers_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'Free',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_questions_material_part ON questions (material_slug, part);
CREATE INDEX IF NOT EXISTS idx_results_user ON test_results (username, created_at);
