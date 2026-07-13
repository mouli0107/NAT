/**
 * ASTRA Code Lens — GitHub PR webhook receiver + pipeline (Phase 3)
 *
 * Flow: verify HMAC → parse pull_request event → resolve per-repo policy →
 * (if enabled + base-branch matches + processable action) run a scoped review or
 * conform loop on the PR head branch, restricted to the PR's changed files, then
 * post a Check Run (advisory by default) + a summary comment. In conform mode the
 * fixes are pushed to a companion branch and a stacked PR is opened into the PR
 * head branch (decision #2 — push fixes; safe default, never rewrites the author's
 * branch unless the repo opts into pushMode='direct-to-head').
 *
 * Live calls need an installed GitHub App (GITHUB_APP_ID / GITHUB_APP_PRIVATE_KEY
 * / GITHUB_WEBHOOK_SECRET). The pure functions below are unit-tested; the live
 * pipeline is not exercised without those secrets.
 */

import crypto from 'crypto';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';
import { createSession } from './codelens-session';
import { runReviewLoop, computeMetric, normalizeBudgets } from './codelens-loop';
import { runConformLoop } from './codelens-conform';
import type { LoopMetric } from './codelens-types';
import { pushFixes } from './codelens-agent';
import {
  resolvePrPolicy, matchesBaseBranch, type PrPolicy,
} from './codelens-pr-policy';

/**
 * DB-backed policy with safe fallback. codelens-loop-db top-level-imports ./db
 * (throws without DATABASE_URL), so it's dynamically imported here — any failure
 * falls back to the in-memory/env resolver so the webhook still functions.
 */
async function resolvePrPolicyWithDb(repoFullName: string): Promise<PrPolicy> {
  try {
    const { loadPrPolicyFromDb } = await import('./codelens-loop-db');
    const p = await loadPrPolicyFromDb(repoFullName);
    if (p) return p;
  } catch { /* no DB / not found → fall through */ }
  return resolvePrPolicy(repoFullName);
}
import {
  isGithubAppConfigured, getInstallationToken, installationCloneUrl,
  listPrFiles, createCheckRun, updateCheckRun, createIssueComment, openPullRequest,
  type CheckConclusion,
} from './codelens-github-app';

// ─── Pure helpers (unit-tested) ────────────────────────────────────────────────

/** Timing-safe HMAC-SHA256 verification of the X-Hub-Signature-256 header. */
export function verifyGithubSignature(
  rawBody: Buffer | string | undefined,
  signatureHeader: string | undefined,
  secret: string,
): boolean {
  if (!rawBody || !signatureHeader || !secret) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', secret)
    .update(typeof rawBody === 'string' ? Buffer.from(rawBody) : rawBody)
    .digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export interface ParsedPrEvent {
  action: string;
  prNumber: number;
  headRef: string;
  headSha: string;
  baseRef: string;
  repoFullName: string;
  installationId: number | null;
}

export function parsePullRequestEvent(body: any): ParsedPrEvent | null {
  const pr = body?.pull_request;
  const repoFullName = body?.repository?.full_name;
  if (!pr || !repoFullName || !pr.head || !pr.base) return null;
  const prNumber = body.number ?? pr.number;
  if (typeof prNumber !== 'number') return null;
  return {
    action: String(body.action ?? ''),
    prNumber,
    headRef: String(pr.head.ref ?? ''),
    headSha: String(pr.head.sha ?? ''),
    baseRef: String(pr.base.ref ?? ''),
    repoFullName: String(repoFullName),
    installationId: typeof body?.installation?.id === 'number' ? body.installation.id : null,
  };
}

/** Only these PR actions trigger a run (edits/labels/etc. are ignored). */
export function shouldProcessAction(action: string): boolean {
  return action === 'opened' || action === 'synchronize' || action === 'reopened';
}

/** Advisory vs blocking check conclusion from the final metric. */
export function conclusionFor(metric: LoopMetric, blocking: boolean): CheckConclusion {
  if (metric.criticalOpen > 0) return blocking ? 'failure' : 'neutral';
  if (metric.openViolations > 0) return 'neutral';
  return 'success';
}

export function buildCheckSummary(metric: LoopMetric, mode: string, stopReason: string): string {
  return [
    `**Mode:** ${mode}`,
    `**Result:** ${metric.runStatus} · confidence ${metric.confidencePct}%`,
    `**Open:** ${metric.criticalOpen} critical · ${metric.warningOpen} warning · ${metric.infoOpen} info`,
    `**Loop stop reason:** ${stopReason}`,
  ].join('\n');
}

// ─── Express handler ─────────────────────────────────────────────────────────

export async function handleGithubWebhook(req: Request, res: Response): Promise<void> {
  const secret = process.env.GITHUB_WEBHOOK_SECRET ?? '';
  if (!secret || !isGithubAppConfigured()) {
    res.status(503).json({ error: 'GitHub App / webhook not configured' });
    return;
  }

  const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;
  const sig = req.header('x-hub-signature-256');
  if (!verifyGithubSignature(rawBody, sig, secret)) {
    res.status(401).json({ error: 'invalid signature' });
    return;
  }

  const event = req.header('x-github-event');
  if (event !== 'pull_request') {
    res.status(204).end(); // ack non-PR events without acting
    return;
  }

  const evt = parsePullRequestEvent(req.body);
  if (!evt) { res.status(400).json({ error: 'unparseable pull_request payload' }); return; }

  const policy = await resolvePrPolicyWithDb(evt.repoFullName);
  if (!policy.enabled) { res.status(202).json({ skipped: 'policy-disabled' }); return; }
  if (!shouldProcessAction(evt.action)) { res.status(202).json({ skipped: `action:${evt.action}` }); return; }
  if (!matchesBaseBranch(evt.baseRef, policy.baseBranchPattern)) { res.status(202).json({ skipped: 'base-branch' }); return; }
  if (evt.installationId == null) { res.status(202).json({ skipped: 'no-installation-id' }); return; }

  // Ack fast; do the work asynchronously (GitHub expects a prompt response).
  res.status(202).json({ accepted: true, repo: evt.repoFullName, pr: evt.prNumber, mode: policy.mode });
  runPrPipeline(evt, policy).catch(err =>
    console.error(`[CodeLens][webhook] PR pipeline failed for ${evt.repoFullName}#${evt.prNumber}:`, err?.message));
}

// ─── Async pipeline ────────────────────────────────────────────────────────────

async function runPrPipeline(evt: ParsedPrEvent, policy: PrPolicy): Promise<void> {
  const token = await getInstallationToken(evt.installationId!);

  // Scope to changed C#/csproj files only.
  const changed = (await listPrFiles(evt.repoFullName, evt.prNumber, token))
    .filter(f => f.endsWith('.cs') || f.endsWith('.csproj'));

  // Post an in-progress check we can transition later.
  let checkId: number | null = null;
  try {
    const check = await createCheckRun({
      repoFullName: evt.repoFullName, headSha: evt.headSha, status: 'in_progress',
      title: 'ASTRA Code Lens running', summary: `Reviewing ${changed.length} changed file(s) on \`${evt.headRef}\`.`,
    }, token);
    checkId = typeof check?.id === 'number' ? check.id : null;
  } catch (e: any) { console.warn('[CodeLens][webhook] createCheckRun failed:', e?.message); }

  if (changed.length === 0) {
    if (checkId != null) {
      await updateCheckRun(evt.repoFullName, checkId, {
        status: 'completed', conclusion: 'neutral',
        title: 'No reviewable files', summary: 'This PR changes no .cs/.csproj files.',
      }, token).catch(() => {});
    }
    return;
  }

  const sessionId = `cls-pr-${randomUUID().slice(0, 8)}`;
  const localPath = path.join(os.tmpdir(), 'codelens', sessionId);
  fs.mkdirSync(localPath, { recursive: true });
  const authUrl = installationCloneUrl(evt.repoFullName, token);
  const session = createSession(sessionId, authUrl, evt.headRef, localPath, [], [], `gh-app:${evt.installationId}`);
  session.restrictToFiles = changed;

  const budgets = normalizeBudgets();
  const result = policy.mode === 'conform'
    ? await runConformLoop(session, { policy: 'zero_blocker_full_coverage', budgets })
    : await runReviewLoop(session, { policy: 'full_coverage', budgets });

  const metric = computeMetric(session);
  const conclusion = conclusionFor(metric, policy.blocking);
  const summary = buildCheckSummary(metric, policy.mode, result.stopReason);

  // Conform: push fixes to a companion branch + open a stacked PR into the PR head.
  let companionNote = '';
  if (policy.mode === 'conform' && session.fixBranch) {
    try {
      const pushed = await pushFixes(session);
      if (pushed.pushed && policy.pushMode === 'companion-pr') {
        const pr = await openPullRequest(evt.repoFullName, {
          title: `ASTRA Code Lens fixes for #${evt.prNumber}`,
          head: pushed.branch,
          base: evt.headRef,
          body: `Automated standards fixes for #${evt.prNumber}. Review and merge to apply.`,
        }, token);
        companionNote = pr?.html_url ? `\n\n**Fixes PR:** ${pr.html_url}` : '';
      } else if (pushed.pushed) {
        companionNote = `\n\n**Fixes pushed to:** \`${pushed.branch}\``;
      }
    } catch (e: any) { console.warn('[CodeLens][webhook] push/openPR failed:', e?.message); }
  }

  if (checkId != null) {
    await updateCheckRun(evt.repoFullName, checkId, {
      status: 'completed', conclusion,
      title: `ASTRA Code Lens: ${conclusion}`, summary: summary + companionNote,
    }, token).catch((e: any) => console.warn('[CodeLens][webhook] updateCheckRun failed:', e?.message));
  }
  await createIssueComment(evt.repoFullName, evt.prNumber,
    `### ASTRA Code Lens — ${policy.mode} (${conclusion})\n\n${summary}${companionNote}`, token)
    .catch((e: any) => console.warn('[CodeLens][webhook] comment failed:', e?.message));
}
