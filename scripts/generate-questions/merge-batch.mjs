#!/usr/bin/env node
/**
 * Merge a human-reviewed batch into the app's question bank.
 *
 *   node scripts/generate-questions/merge-batch.mjs --batch scripts/generate-questions/out/batch-toeic-lr-p5-20261103.json
 *
 * - Re-validates the batch shape.
 * - Drops questions whose stem already exists in app/data/mock.ts or
 *   app/data/generated.ts (reports them).
 * - Renumbers sequentially continuing the bank (no collisions across batches).
 * - Appends to GENERATED_QUESTIONS in app/data/generated.ts.
 *
 * Run from the repo root. Review the batch BEFORE merging — this is the
 * human-in-the-loop gate.
 */

import fs from 'node:fs';

const GENERATED_PATH = 'app/data/generated.ts';

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--batch') out.batch = argv[++i];
    else if (argv[i] === '--help' || argv[i] === '-h') { printHelp(); process.exit(0); }
    else { console.error(`Unknown arg: ${argv[i]}`); process.exit(1); }
  }
  if (!out.batch) { console.error('Missing --batch <file>'); process.exit(1); }
  return out;
}

function printHelp() {
  console.log(`Usage:\n  node scripts/generate-questions/merge-batch.mjs --batch <batch.json>\n\nMerges a reviewed batch into app/data/generated.ts (GENERATED_QUESTIONS).\nRun from the repo root.`);
}

const normalize = s => s.toLowerCase().replace(/\s+/g, ' ').trim();

function existingStems() {
  const out = new Set();
  for (const f of ['app/data/mock.ts', GENERATED_PATH]) {
    try {
      const src = fs.readFileSync(f, 'utf8');
      const re = /stem:\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*")/g;
      let m;
      while ((m = re.exec(src))) {
        try { out.add(normalize(eval(m[1]))); } catch { /* skip odd literals */ }
      }
    } catch { /* file may not exist yet */ }
  }
  return out;
}

function maxNumber() {
  let max = 0;
  for (const f of ['app/data/mock.ts', GENERATED_PATH]) {
    try {
      const src = fs.readFileSync(f, 'utf8');
      for (const m of src.matchAll(/number:\s*(\d+)/g)) max = Math.max(max, Number(m[1]));
    } catch { /* ignore */ }
  }
  return max;
}

function shapeOk(q) {
  if (!q || typeof q.stem !== 'string' || !q.stem.trim()) return 'empty stem';
  if (!Array.isArray(q.options) || q.options.length !== 4) return 'options must be 4';
  if (JSON.stringify(q.options.map(o => o.letter)) !== JSON.stringify(['A', 'B', 'C', 'D'])) return 'letters must be A-D';
  if (q.options.some(o => !o.text || !o.text.trim())) return 'empty option text';
  if (!['A', 'B', 'C', 'D'].includes(q.correctLetter)) return 'bad correctLetter';
  if (!q.explanation || !q.explanation.trim()) return 'empty explanation';
  return null;
}

function main() {
  const { batch } = parseArgs(process.argv);
  const data = JSON.parse(fs.readFileSync(batch, 'utf8'));
  const questions = data.questions || data;
  if (!Array.isArray(questions) || questions.length === 0) {
    console.error('Batch has no questions.');
    process.exit(1);
  }

  const stems = existingStems();
  const kept = [];
  let droppedDupe = 0;
  const shapeErrors = [];
  questions.forEach((q, i) => {
    const err = shapeOk(q);
    if (err) { shapeErrors.push(`q${i + 1}: ${err}`); return; }
    if (stems.has(normalize(q.stem))) { droppedDupe++; return; }
    stems.add(normalize(q.stem));
    kept.push(q);
  });
  if (shapeErrors.length) {
    shapeErrors.forEach(e => console.log('ERROR:', e));
    process.exit(1);
  }

  let nextNum = maxNumber() + 1;
  const merged = kept.map(q => ({ ...q, number: nextNum++ }));

  let src = fs.readFileSync(GENERATED_PATH, 'utf8');
  const serialized = merged.map(q => JSON.stringify(q, null, 2).split('\n').map(l => '  ' + l).join('\n')).join(',\n');
  // Insert before the final closing bracket of the array.
  const closingIdx = src.lastIndexOf(']');
  if (closingIdx === -1) { console.error('Cannot find array close in ' + GENERATED_PATH); process.exit(1); }
  const before = src.slice(0, closingIdx).replace(/\s+$/, '');
  const needsComma = !before.endsWith('[');
  src = before + (needsComma ? ',\n' : '\n') + serialized + '\n]\n';
  fs.writeFileSync(GENERATED_PATH, src);

  console.log(`Merged ${merged.length} question(s) into ${GENERATED_PATH} (numbers ${merged[0]?.number}–${merged[merged.length - 1]?.number}).`);
  if (droppedDupe) console.log(`Dropped ${droppedDupe} duplicate(s) already in the bank.`);
  console.log('Next: run typecheck + dev server, spot-check the new questions in /admin/questions.');
}

main();
