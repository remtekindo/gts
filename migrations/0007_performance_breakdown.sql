-- GTS migration 0007 — per-part breakdown on test results.
-- Applied with: npx wrangler d1 migrations apply gts-db [--local]
-- (Remote: the owner runs it with --remote; see README § Auth.)
--
-- The Performance page needs per-part accuracy (Listening = Parts
-- 1–4, Reading = Parts 5–7, Grammar = Part 5, Vocabulary = Parts
-- 6–7) from the most recent Full Simulation. The take page already
-- knows each question's part, so POST /api/results/submit now stores
-- the tally as JSON in this nullable column:
--   {"1":{"correct":2,"total":2},"2":{"correct":1,"total":2},...}
-- Nullable so rows submitted before this migration stay valid — they
-- simply have no breakdown, and the radar/skill list shows an honest
-- empty state for them instead of demo values. The server validates
-- the shape (integer part keys 1–20, 0 <= correct <= total, parts add
-- up to the paper total) and rejects anything else with 400.

ALTER TABLE test_results ADD COLUMN breakdown TEXT;
