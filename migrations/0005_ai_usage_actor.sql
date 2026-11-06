-- GTS migration 0005 — record who used the tokens: internal team (Admin) vs end users (User).
-- Applied with: npx wrangler d1 migrations apply gts-db [--local]
-- (Remote: the owner runs it with --remote; see README § Auth.)
--
-- The split is by ENDPOINT, not by identity: the audit chat is
-- admin-only (401 for non-admin), so every audit-chat row is
-- internal-team usage; Live Test is the user-facing feature inside
-- each material, so its rows are end-user usage. No per-user identity
-- is tracked — an admin who takes a Live Test still counts as User.
-- NULL means "unknown" (rows written before this migration whose
-- endpoint is neither, or any future endpoint) — it is shown as "—",
-- never folded into Admin or User.
-- The backfill below stamps the rows that already exist.

ALTER TABLE ai_usage ADD COLUMN actor TEXT;

UPDATE ai_usage SET actor = 'admin' WHERE endpoint = 'audit-chat';
UPDATE ai_usage SET actor = 'user' WHERE endpoint = 'live-test';
