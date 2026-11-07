-- GTS migration 0008 — attempt number on test results.
-- Applied with: npx wrangler d1 migrations apply gts-db [--local]
-- (Remote: the owner runs it with --remote; see README § Auth.)
--
-- Sequential unlocking needs to know WHICH attempt a finished row
-- was: Sim 02 opens only after Sim 01 is completed, and Attempt 02
-- only after Attempt 01. The take page already knew the attempt
-- number (it is in the URL and in the browser's local result) but
-- POST /api/results/submit never sent it, so the server could not
-- tell attempts apart. This nullable column records it:
--   attempt  1–3, the attempt the row was submitted for.
-- Nullable so rows submitted before this migration stay valid —
-- they simply have no attempt number, and the unlock code treats
-- such a legacy row as attempt 1 (the default attempt, and the only
-- one that was ever open first). The paper-level lock does not need
-- the column at all: any valid row for a paper counts as completing
-- that paper.

ALTER TABLE test_results ADD COLUMN attempt INTEGER;

CREATE INDEX IF NOT EXISTS idx_results_user_paper_attempt ON test_results (user_sub, paper_id, attempt);
