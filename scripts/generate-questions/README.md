# Question-generation pipeline (Meta Model API)

Generates original TOEIC-style practice questions with Meta's Muse Spark
models, validates them against the GTS `Question` schema, dedupes against the
committed bank, and logs **real token costs** — so the unit-economics model
(±Rp750–2.500/user/month) gets validated with data, not estimates.

This pipeline is also the hackathon's "real use of Meta's models": the
question bank behind GTS's adaptive curriculum is generated with Meta's
Model API.

## Setup

1. Create an API key at `dev.meta.ai/api-keys` (keys start with `LLM_`).
   The $150 hackathon credits apply to the key's team.
2. Export it — **never commit it**:
   ```sh
   export MODEL_API_KEY="LLM_..."
   ```
3. Pick the model:
   - `muse-spark-1.3-contributor` (default) — $0.10/$0.20 per 1M in/out tokens.
     Trade-off: Meta may train on your prompts + completions. Our prompts
     contain only parameters (part/skill/difficulty/count) — no user PII —
     so this is safe for question generation.
   - `muse-spark-1.3` — $1.25/$4.25 per 1M tokens, standard contract.

## Usage

```sh
# 10 Part-5 reading questions, difficulty 3/5 (default model = contributor)
MODEL_API_KEY=LLM_xxx node scripts/generate-questions/generate.mjs \
  --material toeic-lr --part 5 --skill reading --count 10 --difficulty 3

# Listening (Part 2), standard tier
MODEL_API_KEY=LLM_xxx node scripts/generate-questions/generate.mjs \
  --material toeic-lr --part 2 --skill listening --count 10 --model muse-spark-1.3

# Plumbing test without spending anything
node scripts/generate-questions/generate.mjs --dry-run --count 3

# Re-validate a batch file
node scripts/generate-questions/generate.mjs --validate scripts/generate-questions/out/batch-toeic-lr-p5-20261031.json
```

Output: `scripts/generate-questions/out/batch-<material>-p<part>-<ts>.json`
(matching the `Question` interface in `app/data/mock.ts`; question numbers
continue from the bank). Cost rows append to `out/cost-log.csv`.

Flags: `--difficulty 1-5`, `--out <path>`, `--rpm-delay-ms` (Contributor is
limited to 100 requests/min — pause between calls when batching).

## QC workflow (do not skip)

1. `generate.mjs` validates automatically: 4 options A–D in order, unique
   option texts, exactly one correct letter, non-empty stem/explanation,
   no duplicates inside the batch or against `app/data/mock.ts`, and a
   correct-letter distribution check (warns if skewed on 8+ questions).
2. **Human review:** read a random sample (5–10) of every batch. The model
   occasionally writes a "correct" answer that is debatable — fix or drop
   those items before merging.
3. Merge the reviewed batch into the bank (one command, run from repo root):
   ```sh
   node scripts/generate-questions/merge-batch.mjs --batch scripts/generate-questions/out/batch-toeic-lr-p5-20261103.json
   ```
   The script re-validates, drops duplicates already in the bank, renumbers
   continuing the bank, and appends to `GENERATED_QUESTIONS` in
   `app/data/generated.ts` (wired into the app automatically).

## Scaling up

Loop: generate → human review → merge. Keep `--count` at 10–20 per call
for reviewable batches; when running several calls back-to-back, add
`--rpm-delay-ms 1000` (Contributor tier: 100 requests/min). Track spend in
`out/cost-log.csv` — stop and review unit economics if Rp/question drifts
above the P&L estimate.

## Cost notes

- Muse Spark reasons before answering; **reasoning tokens are billed as
  output tokens**. The script sets `reasoning_effort: "low"` to keep
  generation cheap — quality stays high for this structured task.
- Rough math at Contributor rates: ~1k input + ~4k output tokens per
  10-question batch ≈ $0.0009/batch ≈ **Rp1.5/question** — consistent with
  the P&L estimate. The real numbers land in `cost-log.csv`; use them.
- Structured output uses Chat Completions `response_format: json_schema`
  against `https://api.meta.ai/v1` (OpenAI-compatible).
