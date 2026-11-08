# TOEFL iBT + IELTS Academic — question-generation specs

Handover for the content step: how to fill the question bank for the two
materials whose **structure** was activated on 8 Nov 2026 (branch `v2`).
The bank has **0 questions** for both today — papers, checkout gating,
empty states and performance scoping are built; only the content is
missing. Real questions come from this pipeline (AI generates → admin
QCs → bank), never hand-written and never invented.

Official formats below were checked **2026-11-08**. Re-check the
official pages before a big generation run — ETS in particular changes
the TOEFL format every few years (shortened Jul 2023, redesigned
21 Jan 2026).

- TOEFL iBT test content (ETS, official):
  https://www.ets.org/toefl/test-takers/ibt/about/content.html
- IELTS Guide for Test Takers (ielts.org, official PDF):
  https://ielts.org/cdn/ielts-downloadable-assets/ielts-guidance-and-support/ielts-guides/ielts-guide-for-test-takers.pdf
- Pipeline docs: `scripts/generate-questions/README.md`
  (setup, QC workflow, cost notes) — read it first.

## 1. TOEFL iBT — official format (from 21 Jan 2026, ETS)

Order is fixed: Reading → Listening → Writing → Speaking. Reading and
Listening are **multistage adaptive** — item counts and times may vary
per test taker; the table is the base test.

| Section   | Items | Approx. base time | Task types |
|-----------|------:|------------------:|------------|
| Reading   |    50 | 30 min | Complete the Words; Read in Daily Life; Read an Academic Passage |
| Listening |    47 | 29 min | Listen and Choose a Response; Listen to a Conversation; Listen to an Announcement; Listen to an Academic Talk |
| Writing   |    12 | 23 min | Build a Sentence (10); Write an Email (1); Write for an Academic Discussion (1) |
| Speaking  |    11 |  8 min | Listen and Repeat (7 sentences); Take an Interview (4 questions) |

Total section time ~90 min; allow ~2 hours including directions.
Scores: **1–6 band scale in 0.5 steps**, CEFR-aligned, per section and
overall. (During a two-year transition ETS also reports comparable
0–120 overall scores — do not build on the 0–120 scale; it is legacy.)

### Papers in the app (`toefl-ibt`)

| Paper id | Kind | Parts | Duration |
|----------|------|-------|---------:|
| `toefl-ibt-sim-01` | Full Simulation | Reading + Listening (MCQ) | 59 min (30 + 29) |
| `toefl-reading-drill` | Drill Pack | Reading | 30 min |
| `toefl-listening-drill` | Drill Pack | Listening | 29 min |
| `toefl-writing-paper` | Drill Pack | Writing (prompt + sample + rubric, v1) | 23 min |
| `toefl-speaking-paper` | Drill Pack | Speaking (prompt + sample + rubric, v1) | 8 min |

Part numbering in the app: 1 Reading, 2 Listening, 3 Speaking,
4 Writing.

## 2. IELTS Academic — official format (stable, ielts.org)

| Section   | Questions | Time | Notes |
|-----------|----------:|-----:|-------|
| Listening | 40 | ~30 min | 4 parts (2 monologues, 2 conversations), 10 questions each, each recording played once |
| Reading   | 40 | 60 min | 3 passages (books, journals, magazines, newspapers), 2,150–2,750 words; at least one text has a detailed logical argument |
| Writing   | 2 tasks | 60 min | Task 1: describe visual information (graph/table/chart/diagram), ≥150 words, ~20 min. Task 2: discuss a point of view / argument / problem, ≥250 words, ~40 min. Task 2 counts twice as much as Task 1. |
| Speaking  | 3 parts | 11–14 min | Face-to-face interview: Part 1 introduction + familiar topics (4–5 min), Part 2 long turn on a topic card (1 min prep, 1–2 min talk), Part 3 two-way discussion |

Total ~2h 45m. Listening, Reading and Writing are taken in one
sitting with no breaks; Speaking may be the same day or up to 7 days
before/after. Scores: **band scale 1–9, half bands**; overall band =
average of the four section bands, rounded to the nearest half band.
Listening and Reading: 1 mark per correct answer out of 40, raw mark
converted to a band (official conversion table — look it up on
ielts.org before building any band mapping; do not guess it).

### Papers in the app (`ielts-academic`)

| Paper id | Kind | Parts | Duration |
|----------|------|-------|---------:|
| `ielts-academic-sim-01` | Full Simulation | Listening + Reading (MCQ) | 90 min (30 + 60) |
| `ielts-listening-drill` | Drill Pack | Listening | 30 min |
| `ielts-reading-drill` | Drill Pack | Reading | 60 min |
| `ielts-writing-paper` | Drill Pack | Writing (prompt + sample + rubric, v1) | 60 min |
| `ielts-speaking-paper` | Drill Pack | Speaking (prompt + sample + rubric, v1) | 14 min |

Part numbering in the app: 1 Listening, 2 Reading, 3 Writing,
4 Speaking.

## 3. What the bank model supports today vs. what needs an extension

The current `Question` model (`app/data/mock.ts`) is **MCQ only**:
stem + `context` passage (optional) + exactly 4 options A–D + one
correct letter + explanation. The `generate.mjs` JSON schema enforces
exactly that. This already covers the MCQ starter bank:

- TOEFL Reading: "Read an Academic Passage" MCQ, "Read in Daily
  Life" MCQ, "Complete the Words" as cloze MCQ (stem = sentence with
  a blank, options = candidate words).
- TOEFL Listening MCQ (conversation / announcement / academic talk):
  supported as text stem + options. Audio is a v2 stage (TTS) —
  generate the transcript/stem now, add audio later. Do not block the
  bank on audio.
- IELTS Listening MCQ and IELTS Reading MCQ: supported.

**Needs a model extension — do not force these into MCQ:**

- IELTS True/False/Not Given, Yes/No/Not Given, matching headings,
  matching information, sentence completion, summary / note / table /
  flow-chart completion, short-answer questions, diagram labelling.
- TOEFL table items and prose-summary items (multi-select / category
  sorting), "Complete the Words" with a word bank.
- Speaking / Writing: **not MCQ in v1** — same approach as TOEIC SW:
  prompt + sample answer + scoring rubric. Generate prompts, model
  answers and rubrics; AI grading is v2. (The Speaking/Writing papers
  above are Drill Packs for exactly this reason.)

Extension work, in order (do the MCQ starter bank first — it unblocks
checkout + simulations — then this):

1. `Question` schema: add an answer-type field, e.g.
   `type: 'mcq' | 'true-false-ng' | 'matching' | 'completion' | ...`,
   with per-type answer payloads.
2. `generate.mjs`: per-material part descriptions (see §4 — the
   current `PART_DESCRIPTIONS` is TOEIC-only), a material-aware
   prompt (it currently says "TOEIC-style"), and a JSON schema per
   answer type.
3. Validation in `generate.mjs` + `merge-batch.mjs` per answer type.
4. Take-page rendering per answer type (`app/pages/m/[slug]/papers/[id]/take.vue`)
   and scoring per answer type (`app/utils/scoring.ts`).
5. Per-material scoring scales (TOEFL 1–6, IELTS 1–9 with the official
   raw→band tables) in `server/utils/performance.ts` +
   `app/utils/performance.ts` — today those files apply the TOEIC
   scale to `toeic-lr` only and give other materials accuracy %
   (see the header comments there). Never reuse the TOEIC mapping
   for another test.

## 4. `generate.mjs` — what must change before running it for these materials

Do **not** run the script as-is for `toefl-ibt` / `ielts-academic`
today: `buildPrompt()` hardcodes "Generate N TOEIC-style questions"
and `PART_DESCRIPTIONS` only has TOEIC parts 1–7, so the model would
write TOEIC-style items stamped with the wrong material slug. The
`--skill` default is also TOEIC-derived (parts 1–4 → listening,
5–7 → reading), which is wrong for TOEFL part 3 (Speaking) / part 4
(Writing) and IELTS part 2 (Reading) / part 3 (Writing) / part 4
(Speaking).

Required changes in `scripts/generate-questions/generate.mjs`:

1. `PART_DESCRIPTIONS` → keyed by material + part, e.g.
   `toefl-ibt: { 1: 'Read an Academic Passage: ...', 2: 'Academic Talk: ...', ... }`
   and `ielts-academic: { 1: 'Listening Part 1: ...', ... }`,
   using the task types in §1–§2 above.
2. `buildPrompt()` takes the material slug and writes
   "Generate N TOEFL iBT-style questions" / "IELTS Academic-style
   questions" with the right part description; drop the TOEIC-only
   rules (photo description, workplace/business tone) for these
   materials — TOEFL is academic, IELTS Academic is academic +
   general-interest.
3. `--skill` default becomes material-aware, or pass `--skill`
   explicitly on every call until it is (see §5).
4. Keep `--count` ≤ 20 per call and `--rpm-delay-ms 1000` when
   batching (Contributor tier: 100 requests/min).

`merge-batch.mjs` needs **no** change: it is material-agnostic and
appends to `GENERATED_QUESTIONS` in `app/data/generated.ts` with the
batch's `materialSlug`. The moment the first batch for a material is
merged, that material becomes purchasable in checkout automatically
(client + server both key off "bank count > 0").

## 5. CLI invocations (after the §4 changes)

Model: `muse-spark-1.3-contributor` (default, $0.10/$0.20 per 1M
in/out tokens). Key: `MODEL_API_KEY` from dev.meta.ai/api-keys
(keys start with `LLM_`). **Never commit the key, never paste it in
chat.** Set it inline per command or export it in the shell session
only. (`.dev.vars` is for the server's `NITRO_MODEL_API_KEY` in
wrangler mode — a different key slot; do not confuse the two.)

```sh
# TOEFL Reading — academic passage MCQ, 10 questions, difficulty 3/5
MODEL_API_KEY=LLM_xxx node scripts/generate-questions/generate.mjs \
  --material toefl-ibt --part 1 --skill reading --count 10 --difficulty 3

# TOEFL Listening — academic talk MCQ
MODEL_API_KEY=LLM_xxx node scripts/generate-questions/generate.mjs \
  --material toefl-ibt --part 2 --skill listening --count 10 --difficulty 3

# IELTS Listening — 4-part MCQ
MODEL_API_KEY=LLM_xxx node scripts/generate-questions/generate.mjs \
  --material ielts-academic --part 1 --skill listening --count 10 --difficulty 3

# IELTS Reading — academic passage MCQ
MODEL_API_KEY=LLM_xxx node scripts/generate-questions/generate.mjs \
  --material ielts-academic --part 2 --skill reading --count 10 --difficulty 3

# Plumbing test without spending anything
node scripts/generate-questions/generate.mjs --dry-run --count 3

# Re-validate a batch file
node scripts/generate-questions/generate.mjs --validate scripts/generate-questions/out/batch-toefl-ibt-p1-<ts>.json

# Merge a reviewed batch (run from repo root)
node scripts/generate-questions/merge-batch.mjs --batch scripts/generate-questions/out/batch-toefl-ibt-p1-<ts>.json
```

Batching tip: run several calls back-to-back with
`--rpm-delay-ms 1000`. Output:
`scripts/generate-questions/out/batch-<material>-p<part>-<ts>.json`.
Cost rows append to `out/cost-log.csv`.

## 6. QC checklist (same as the pipeline README — do not skip)

1. `generate.mjs` validates automatically: 4 options A–D in order,
   unique option texts, exactly one correct letter, non-empty
   stem/explanation, no duplicates inside the batch or against the
   bank, correct-letter distribution check (warns if skewed on 8+
   questions).
2. **Human review:** read a random sample (5–10) of every batch.
   The model occasionally writes a "correct" answer that is
   debatable — fix or drop those items before merging. For TOEFL /
   IELTS also check: the passage/topic is genuinely academic (not
   workplace TOEIC tone), the item matches the official task type
   (§1–§2), and no item reproduces a real published test question.
3. Merge the reviewed batch (`merge-batch.mjs`, §5). The script
   re-validates, drops duplicates already in the bank, renumbers
   continuing the bank, and appends to `GENERATED_QUESTIONS`.
4. After the first merge for a material, verify in the app: the
   material's papers show real counts, the simulation starts, and
   checkout now offers the material (it becomes pickable with no
   code change).

## 7. Estimated cost — starter bank per material

Established unit cost: **~Rp1.6/question** (Contributor tier,
`reasoning_effort: "low"`; ~1k input + ~4k output tokens per
10-question batch ≈ $0.0009/batch ≈ Rp1.5/question — see the pipeline
README; real numbers land in `out/cost-log.csv`).

Starter bank = MCQ sections only (the simulation + drills for the two
MCQ sections). One full simulation's worth of each:

| Material | Starter bank | Arithmetic | Approx. cost |
|----------|------------:|-----------:|------------:|
| TOEFL iBT | 97 questions (Reading 50 + Listening 47) | 97 × Rp1.6 | **≈ Rp155** |
| IELTS Academic | 80 questions (Listening 40 + Reading 40) | 80 × Rp1.6 | **≈ Rp128** |
| **Both materials** | **177 questions** | 177 × Rp1.6 | **≈ Rp283** |

That starter bank makes both simulations playable end-to-end and both
materials purchasable. A second simulation + drill depth (another
~100 questions per material) roughly doubles it to ~Rp550–600 total.
Speaking/Writing prompt+sample+rubric generation is a handful of
items per paper, so its cost is negligible next to the MCQ bank —
budget it as a few thousand rupiah at most. Track real spend in
`out/cost-log.csv` and stop to review unit economics if Rp/question
drifts above the P&L estimate.

## 8. Steps for Rey (Mac)

1. `git pull origin v2` (branch `v2`, after this structure lands).
2. Make the §4 script changes (`PART_DESCRIPTIONS` per material,
   material-aware prompt, explicit `--skill` per call).
3. Create a key at dev.meta.ai/api-keys if needed (Contributor tier,
   $150 hackathon credits). Export it in the shell session only:
   `export MODEL_API_KEY="LLM_..."` — never commit it, never paste
   it in chat.
4. Dry-run first: `node scripts/generate-questions/generate.mjs --dry-run --count 3`
5. Generate one small batch (10 questions, one part), human-review
   it (§6), merge it, then open the app and check the paper shows a
   real count and the simulation starts.
6. Scale up in batches of 10–20 per call with `--rpm-delay-ms 1000`,
   reviewing every batch, until the starter bank (§7) is complete.
7. Only then consider the §3 model extension for non-MCQ types.

## 9. Explicitly not in this step

- No questions exist yet (bank = 0 for both materials).
- No per-material scoring scales (TOEFL 1–6, IELTS 1–9) — the
  performance page shows accuracy % for these materials until the
  scales land.
- No Listening audio (TTS is a separate stage) — Listening items are
  text-first.
- No live-test generation prompts per material
  (`server/api/live-test/generate.post.ts` is hardcoded TOEIC-style
  and gated behind a completed test anyway).
