-- GTS migration 0006 — leaderboard results + quest claims.
-- Applied with: npx wrangler d1 migrations apply gts-db [--local]
-- (Remote: the owner runs it with --remote; see README § Auth.)
--
-- The leaderboard is real users only, so test results must live
-- server-side. `test_results` (0001) already had username,
-- material_slug, paper_id, score, total, answers_json, created_at —
-- this migration adds the three columns the leaderboard needs:
--   user_sub  Google `sub`, the stable account id (username stays
--             for the legacy local rows; the leaderboard joins users
--             on user_sub for the display name).
--   kind      'simulation' (Full Simulation paper) or 'drill'
--             (Drill Pack). Live tests are NOT submitted — they use
--             AI-generated questions, not the curated bank, so they
--             never earn leaderboard points.
--   correct   questions answered correctly (accuracy = correct/total).
-- Legacy rows have NULL in all three and are ignored by the board.
--
-- `quest_claims` records Weekly Quest claims server-side: one row per
-- (user, quest, ISO week). A quest pays 50 points only once per week,
-- only after the user claims it — the claim, not the completion, is
-- what the monthly total counts.

ALTER TABLE test_results ADD COLUMN user_sub TEXT;
ALTER TABLE test_results ADD COLUMN kind TEXT;
ALTER TABLE test_results ADD COLUMN correct INTEGER;

CREATE INDEX IF NOT EXISTS idx_results_user_sub ON test_results (user_sub, created_at);
CREATE INDEX IF NOT EXISTS idx_results_material_paper ON test_results (material_slug, paper_id, created_at);

CREATE TABLE IF NOT EXISTS quest_claims (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_sub TEXT NOT NULL,
  quest_id TEXT NOT NULL CHECK (quest_id IN ('sim', 'score700', 'drills')),
  week_start TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 50,
  claimed_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_sub, quest_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_quest_claims_user ON quest_claims (user_sub, week_start);
