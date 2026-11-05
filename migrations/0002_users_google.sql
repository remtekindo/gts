-- GTS migration 0002 — Google sign-in identity + privilege grants.
-- Applied with: npx wrangler d1 migrations apply gts-db [--local]
-- (Remote: the owner runs it with --remote; see README § Auth.)
--
-- The `users` table gains the Google identity (keyed by Google `sub`,
-- the stable account id) and a `role` column. Access grants live in
-- the new `grants` table: a material grant opens one material, a
-- package grant opens the materials that package covers (see
-- server/utils/catalog.ts for the server-side mapping).
-- The question bank and test results are NOT touched by this migration.

ALTER TABLE users ADD COLUMN google_sub TEXT;
ALTER TABLE users ADD COLUMN email TEXT;
ALTER TABLE users ADD COLUMN name TEXT;
ALTER TABLE users ADD COLUMN picture TEXT;
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';
ALTER TABLE users ADD COLUMN last_login_at TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub ON users (google_sub);

CREATE TABLE IF NOT EXISTS grants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_sub TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('material', 'package')),
  target TEXT NOT NULL,
  granted_at TEXT NOT NULL DEFAULT (datetime('now')),
  granted_by TEXT,
  UNIQUE (user_sub, kind, target)
);

CREATE INDEX IF NOT EXISTS idx_grants_user ON grants (user_sub);
