-- GTS migration 0004 — record hidden reasoning tokens per AI call.
-- Applied with: npx wrangler d1 migrations apply gts-db [--local]
-- (Remote: the owner runs it with --remote; see README § Auth.)
--
-- Meta's OpenAI-compatible `usage` object can carry
-- `completion_tokens_details.reasoning_tokens`: tokens the model spent
-- thinking before answering (both call sites send
-- `reasoning_effort: 'low'`). Those tokens are already counted inside
-- `completion_tokens` — they are a SUBSET of it, not extra — so this
-- column only breaks the completion figure down; totals and cost
-- (prompt + completion) are unchanged.
-- NULL means "not recorded" (rows written before this migration, or a
-- response without the breakdown) — it is never shown as 0, because 0
-- would claim the model did no reasoning at all.

ALTER TABLE ai_usage ADD COLUMN reasoning_tokens INTEGER;
