#!/usr/bin/env node
/**
 * GTS question-generation pipeline — Meta Model API (Muse Spark).
 *
 * Generates original TOEIC-style practice questions via Meta's
 * OpenAI-compatible API, validates them against the GTS Question schema,
 * dedupes against the existing bank, and logs real token costs so we can
 * validate the unit-economics model with data instead of estimates.
 *
 *   MODEL_API_KEY=LLM_xxx node scripts/generate-questions/generate.mjs \
 *     --material toeic-lr --part 5 --skill reading --count 10 --difficulty 3
 *
 *   node scripts/generate-questions/generate.mjs --dry-run --count 3
 *   node scripts/generate-questions/generate.mjs --validate out/batch-xxx.json
 *
 * Docs: scripts/generate-questions/README.md
 */

import fs from 'node:fs';

const BASE_URL = process.env.META_MODEL_BASE_URL || 'https://api.meta.ai/v1';
const API_KEY = process.env.MODEL_API_KEY || process.env.META_MODEL_API_KEY || '';

// Pricing per 1M tokens (USD). Source: Meta Model API pricing page.
const PRICING = {
  'muse-spark-1.3-contributor': { in: 0.10, out: 0.20, label: 'Contributor' },
  'muse-spark-1.3': { in: 1.25, out: 4.25, label: 'Standard' },
};
const IDR_PER_USD = Number(process.env.IDR_PER_USD || 16500);

const PART_DESCRIPTIONS = {
  1: 'Photographs: one statement describes the photo (4 spoken-style options).',
  2: 'Question–Response: a short spoken question, choose the best response.',
  3: 'Conversations: 2–3 speakers, 3 questions per dialogue.',
  4: 'Talks: a short monologue (announcement/ad/talk), 3 questions per talk.',
  5: 'Incomplete Sentences: choose the word/phrase that completes the sentence. Tests grammar + vocabulary.',
  6: 'Text Completion: a short passage (email/memo/notice) with 4 blanks; each blank is one question.',
  7: 'Reading Comprehension: single/double passages with 2–5 questions each.',
};

function parseArgs(argv) {
  const out = { count: 10, difficulty: 3, model: 'muse-spark-1.3-contributor', dryRun: false, validate: null, rpmDelayMs: 0 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === '--material') out.material = next();
    else if (a === '--part') out.part = Number(next());
    else if (a === '--skill') out.skill = next();
    else if (a === '--count') out.count = Number(next());
    else if (a === '--difficulty') out.difficulty = Number(next());
    else if (a === '--model') out.model = next();
    else if (a === '--out') out.out = next();
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--validate') out.validate = next();
    else if (a === '--rpm-delay-ms') out.rpmDelayMs = Number(next());
    else if (a === '--help' || a === '-h') { printHelp(); process.exit(0); }
    else { console.error(`Unknown arg: ${a}`); process.exit(1); }
  }
  return out;
}

function printHelp() {
  console.log(`Usage:
  MODEL_API_KEY=LLM_xxx node generate.mjs --material toeic-lr --part 5 --skill reading --count 10 --difficulty 3

Options:
  --material <slug>     material slug, e.g. toeic-lr (required unless --validate/--dry-run)
  --part <n>            TOEIC part 1-7 (default: 5)
  --skill <s>           listening | reading (default by part: 1-4 listening, 5-7 reading)
  --count <n>           questions to generate (default 10, keep <= 20 per call)
  --difficulty <1-5>    target difficulty (default 3)
  --model <id>          muse-spark-1.3-contributor (default) or muse-spark-1.3
  --out <path>          output file (default out/batch-<material>-p<part>-<ts>.json)
  --dry-run             no API call; validates a built-in mock response instead
  --validate <file>     validate an existing batch file, no API call
  --rpm-delay-ms <ms>   pause between calls when batching (Contributor: 100 RPM)

Env:
  MODEL_API_KEY (or META_MODEL_API_KEY)   Meta Model API key from dev.meta.ai/api-keys
  META_MODEL_BASE_URL                     override, default https://api.meta.ai/v1
  IDR_PER_USD                             default 16500`);
}

const QUESTION_JSON_SCHEMA = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          stem: { type: 'string' },
          context: { type: 'string' },
          options: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                letter: { type: 'string' },
                text: { type: 'string' },
              },
              required: ['letter', 'text'],
            },
          },
          correctLetter: { type: 'string' },
          explanation: { type: 'string' },
        },
        required: ['stem', 'options', 'correctLetter', 'explanation'],
      },
    },
  },
  required: ['questions'],
};

function buildPrompt({ part, skill, count, difficulty }) {
  const partDesc = PART_DESCRIPTIONS[part] || `Part ${part}`;
  return `You write ORIGINAL English test practice questions. Everything must be your own
original content — do not reproduce any published test material.

Generate ${count} TOEIC-style questions:
- Part: ${part} — ${partDesc}
- Skill: ${skill}
- Target difficulty: ${difficulty}/5 (1 = beginner, 5 = advanced)

Rules for every question:
1. "stem" is the question text (for Part 1, describe a photo like "Photograph: ...").
2. For Parts 6-7 include a short original "context" passage; otherwise omit it.
3. "options" has EXACTLY 4 items with letters A, B, C, D in order.
4. Exactly ONE option is correct; the other three are plausible distractors
   (common learner mistakes, not jokes or obviously wrong).
5. "correctLetter" is one of A/B/C/D.
6. "explanation" is 1-2 sentences explaining why the answer is correct.
7. Vary the correct letter across questions — do not make them all the same.
8. Workplace/business English tone. No copyrighted text, no real brand names.

Return ONLY the JSON object matching the schema.`;
}

function mockResponse(count) {
  const letters = ['A', 'B', 'C', 'D'];
  const qs = [];
  for (let i = 0; i < count; i++) {
    const correct = letters[i % 4];
    qs.push({
      stem: `Mock question ${i + 1}: Choose the correct word to complete the sentence.`,
      options: ['A', 'B', 'C', 'D'].map(l => ({ letter: l, text: `Mock option ${l} for question ${i + 1}` })),
      correctLetter: correct,
      explanation: `Mock explanation: option ${correct} is correct.`,
    });
  }
  return { questions: qs, usage: { prompt_tokens: 800, completion_tokens: 400 } };
}

async function callApi(prompt, model) {
  const body = {
    model,
    messages: [
      { role: 'system', content: 'You are a precise test-item writer. You output only valid JSON.' },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_schema', json_schema: { name: 'toeic_questions', schema: QUESTION_JSON_SCHEMA } },
    // Keep reasoning short: reasoning tokens are billed as output tokens.
    reasoning_effort: 'low',
  };
  let lastErr = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
        body: JSON.stringify(body),
      });
      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error(`HTTP ${res.status}`);
        await sleep(2000 * attempt);
        continue;
      }
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
      }
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error('Empty response content');
      return { parsed: JSON.parse(content), usage: data.usage || {} };
    } catch (e) {
      lastErr = e;
      if (attempt < 3) await sleep(1500 * attempt);
    }
  }
  throw lastErr;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ---- validation -----------------------------------------------------------

function existingStems() {
  // Extract stems from the committed bank so we never regenerate duplicates.
  try {
    const src = fs.readFileSync('app/data/mock.ts', 'utf8');
    const re = /stem:\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)/g;
    const out = new Set();
    let m;
    while ((m = re.exec(src))) {
      try { out.add(normalize(eval(m[1]))); } catch { /* skip odd literals */ }
    }
    return out;
  } catch {
    return new Set();
  }
}

function normalize(s) { return s.toLowerCase().replace(/\s+/g, ' ').trim(); }

function validateBatch(questions, { part, skill }) {
  const errors = [];
  const warnings = [];
  const seen = new Set();
  const dist = { A: 0, B: 0, C: 0, D: 0 };
  questions.forEach((q, i) => {
    const tag = `q${i + 1}`;
    if (!q.stem || typeof q.stem !== 'string' || !q.stem.trim()) errors.push(`${tag}: empty stem`);
    if (!Array.isArray(q.options) || q.options.length !== 4) { errors.push(`${tag}: options must be exactly 4`); return; }
    const letters = q.options.map(o => o.letter);
    if (JSON.stringify(letters) !== JSON.stringify(['A', 'B', 'C', 'D'])) errors.push(`${tag}: option letters must be A,B,C,D in order`);
    const texts = q.options.map(o => (o.text || '').trim());
    if (texts.some(t => !t)) errors.push(`${tag}: empty option text`);
    if (new Set(texts.map(normalize)).size !== 4) errors.push(`${tag}: duplicate option texts`);
    if (!['A', 'B', 'C', 'D'].includes(q.correctLetter)) errors.push(`${tag}: bad correctLetter ${q.correctLetter}`);
    else dist[q.correctLetter]++;
    if (!q.explanation || !q.explanation.trim()) errors.push(`${tag}: empty explanation`);
    if (q.stem) {
      const n = normalize(q.stem);
      if (seen.has(n)) errors.push(`${tag}: duplicate stem inside batch`);
      seen.add(n);
    }
  });
  // correct-letter balance
  const total = questions.length;
  for (const [l, c] of Object.entries(dist)) {
    if (total >= 8 && c / total > 0.4) warnings.push(`correct letter ${l} is ${c}/${total} — skewed`);
  }
  return { errors, warnings, dist };
}

function maxExistingNumber() {
  try {
    const src = fs.readFileSync('app/data/mock.ts', 'utf8');
    const nums = [...src.matchAll(/number:\s*(\d+)/g)].map(m => Number(m[1]));
    return nums.length ? Math.max(...nums) : 0;
  } catch { return 0; }
}

// ---- main -----------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv);

  if (args.validate) {
    const batch = JSON.parse(fs.readFileSync(args.validate, 'utf8'));
    const { errors, warnings, dist } = validateBatch(batch.questions || batch, {});
    console.log(`Validating ${args.validate}: ${(batch.questions || batch).length} questions`);
    console.log('Correct-letter distribution:', JSON.stringify(dist));
    warnings.forEach(w => console.log('WARN:', w));
    if (errors.length) { errors.forEach(e => console.log('ERROR:', e)); process.exit(1); }
    console.log('OK — batch is valid.');
    return;
  }

  const part = args.part || 5;
  const skill = args.skill || (part <= 4 ? 'listening' : 'reading');
  const material = args.material || 'toeic-lr';
  const pricing = PRICING[args.model] || PRICING['muse-spark-1.3-contributor'];

  let parsed, usage;
  if (args.dryRun) {
    console.log('DRY RUN — no API call.');
    const m = mockResponse(args.count);
    parsed = m.questions;
    usage = m.usage;
  } else {
    if (!API_KEY) {
      console.error('Missing API key. Set MODEL_API_KEY (from dev.meta.ai/api-keys).');
      process.exit(1);
    }
    console.log(`Calling ${BASE_URL} model=${args.model} …`);
    const prompt = buildPrompt({ part, skill, count: args.count, difficulty: args.difficulty });
    const res = await callApi(prompt, args.model);
    parsed = res.parsed.questions;
    usage = res.usage;
    if (args.rpmDelayMs) await sleep(args.rpmDelayMs);
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    console.error('Model returned no questions.');
    process.exit(1);
  }
  if (parsed.length !== args.count) {
    console.log(`Note: requested ${args.count}, got ${parsed.length}.`);
  }

  const { errors, warnings, dist } = validateBatch(parsed, { part, skill });
  warnings.forEach(w => console.log('WARN:', w));
  if (errors.length) {
    errors.forEach(e => console.log('ERROR:', e));
    process.exit(1);
  }

  // Dedupe against the committed bank.
  const bank = existingStems();
  const dupes = parsed.filter(q => bank.has(normalize(q.stem)));
  if (dupes.length) {
    console.log(`ERROR: ${dupes.length} question(s) duplicate the existing bank. Regenerate or edit them.`);
    process.exit(1);
  }

  // Assign numbers continuing the bank.
  const startNum = maxExistingNumber() + 1;
  const audioNote = skill === 'listening' ? 'Audio placeholder — real TTS in production.' : undefined;
  const questions = parsed.map((q, i) => ({
    materialSlug: material,
    number: startNum + i,
    part,
    skill,
    ...(q.context ? { context: q.context } : {}),
    ...(audioNote ? { audioNote } : {}),
    stem: q.stem,
    options: q.options,
    correctLetter: q.correctLetter,
    explanation: q.explanation,
  }));

  fs.mkdirSync('scripts/generate-questions/out', { recursive: true });
  const ts = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
  const outPath = args.out || `scripts/generate-questions/out/batch-${material}-p${part}-${ts}.json`;
  fs.writeFileSync(outPath, JSON.stringify({ meta: { material, part, skill, difficulty: args.difficulty, model: args.model, generatedAt: new Date().toISOString() }, questions }, null, 2));

  // Cost log — real numbers for the unit-economics model.
  const inTok = usage.prompt_tokens || 0;
  const outTok = usage.completion_tokens || 0;
  const usd = (inTok / 1e6) * pricing.in + (outTok / 1e6) * pricing.out;
  const perQ = questions.length ? usd / questions.length : 0;
  const costPath = 'scripts/generate-questions/out/cost-log.csv';
  if (!fs.existsSync(costPath)) {
    fs.writeFileSync(costPath, 'timestamp,model,tier,questions,input_tokens,output_tokens,usd_total,usd_per_question,idr_per_question\n');
  }
  fs.appendFileSync(costPath,
    `${new Date().toISOString()},${args.model},${pricing.label},${questions.length},${inTok},${outTok},${usd.toFixed(6)},${perQ.toFixed(6)},${(perQ * IDR_PER_USD).toFixed(2)}\n`);

  console.log(`\nWrote ${questions.length} questions -> ${outPath}`);
  console.log(`Correct-letter distribution: ${JSON.stringify(dist)}`);
  console.log(`Tokens: ${inTok} in / ${outTok} out (${pricing.label})`);
  console.log(`Cost: $${usd.toFixed(4)} total = $${perQ.toFixed(6)}/question ≈ Rp${(perQ * IDR_PER_USD).toFixed(2)}/question`);
  console.log(`Next: human-review a sample, then merge into app/data/ (see README).`);
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
