import 'dotenv/config';
import { runReview } from '../server/codelens-agent';
import { createSession } from '../server/codelens-session';
import type { SseEvent } from '../server/codelens-types';

/**
 * End-to-end quality test of the ASTRA Code Lens pipeline against a local fixture
 * repo with KNOWN violations. Verifies: coverage ledger, fail-closed errors,
 * confidence score, deterministic pre-pass, and violation detection.
 *
 *   FIXTURE=<abs path to fixture git repo> npx tsx scripts/codelens-quality-test.ts
 */
async function main() {
  const fixture = process.env.FIXTURE;
  if (!fixture) throw new Error('Set FIXTURE=<abs path to fixture repo>');

  const sessionId = `qtest-${Math.round(performance.now())}`;
  const session = createSession(sessionId, fixture, '', '', [], []);

  await runReview(session);

  // ─── Inspect the ledger + confidence from the final event ───────────────────
  const complete = [...session.eventHistory].reverse().find(
    (e: SseEvent) => e.event === 'review_complete',
  ) as Extract<SseEvent, { event: 'review_complete' }> | undefined;

  const violations = Array.from(session.violations.values());
  const detViolations = violations.filter(v => v.ruleId === 'S07' || v.ruleId === 'S10');

  console.log('\n================ QUALITY TEST RESULT ================');
  console.log('files reviewed       :', session.fileSummaries.size);
  console.log('run_status           :', complete?.run_status);
  console.log('coverage expected    :', complete?.coverage.expected_cells);
  console.log('coverage verified    :', complete?.coverage.verified_cells);
  console.log('coverage errors      :', complete?.coverage.error_cells);
  console.log('OVERALL confidence   :', complete?.coverage.confidence_pct + '%',
              `(${complete?.coverage.verified_applicable_cells}/${complete?.coverage.applicable_cells} applicable verified)`);
  console.log('total violations     :', violations.length);

  console.log('\n--- per-file confidence ---');
  for (const [fid, s] of Array.from(session.fileSummaries.entries())) {
    const file = session.files.find(f => f.fileId === fid);
    const conf = s.applicableCells > 0 ? Math.round((s.verifiedCells / s.applicableCells) * 100) : 100;
    console.log(`  ${file?.relativePath.padEnd(40)} conf=${conf}% (${s.verifiedCells}/${s.applicableCells}) errors=${s.errors} crit=${s.critical} warn=${s.warning}`);
  }

  console.log('\n--- expected known violations ---');
  const s07 = violations.find(v => v.ruleId === 'S07');
  const s10 = violations.find(v => v.ruleId === 'S10');
  console.log('  S07 (net8 csproj target) caught:', !!s07, s07 ? `→ ${s07.foundCode} [src via source field]` : '');
  console.log('  S10 (UseSqlServer)        caught:', !!s10, s10 ? `→ ${s10.foundCode}` : '');
  console.log('  deterministic-eligible violations found:', detViolations.length);

  console.log('\n--- a few LLM-found violations (sample) ---');
  for (const v of violations.filter(v => v.ruleId !== 'S07' && v.ruleId !== 'S10').slice(0, 6)) {
    const file = session.files.find(f => f.fileId === v.fileId);
    console.log(`  ${v.ruleId} ${v.severity} · ${file?.relativePath} L${v.lineStart}: ${v.ruleName}`);
  }
  console.log('====================================================\n');
  process.exit(0);
}

main().catch(e => { console.error('TEST FAILED:', e?.message ?? e); process.exit(1); });
