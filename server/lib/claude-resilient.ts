/**
 * claude-resilient.ts — shared resilient wrapper around Anthropic messages.create.
 *
 * Solves three issues seen in production:
 *  1. Extended thinking (Claude 5) can consume the whole max_tokens budget on the
 *     thinking block → empty text. We pass thinking:{type:'disabled'}.
 *  2. The AI gateway (AI_INTEGRATIONS_ANTHROPIC_BASE_URL) can be down/unprovisioned;
 *     we fail over to the direct Anthropic API (ANTHROPIC_API_KEY).
 *  3. Reading only content[0] misses the text when a thinking block precedes it; the
 *     returned response is NORMALIZED so content[0] is always the concatenated text —
 *     so existing callers doing `content[0]?.type === 'text' ? content[0].text : …`
 *     keep working unchanged.
 *
 * Drop-in: replace `anthropic.messages.create(params)` with `resilientCreate(params)`.
 */
import Anthropic from '@anthropic-ai/sdk';

const gatewayClient = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});
const usingGateway = !!process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
const directClient = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;
// Real Anthropic model id for the direct-API fallback (the gateway model param may be
// a deployment name that api.anthropic.com rejects).
const DIRECT_MODEL = process.env.ANTHROPIC_DIRECT_MODEL || 'claude-sonnet-5';

/** Concatenate every text block (skips thinking blocks). */
export function extractText(res: any): string {
  return (res?.content ?? [])
    .filter((b: any) => b && b.type === 'text' && typeof b.text === 'string')
    .map((b: any) => b.text)
    .join('')
    .trim();
}

function normalize(res: any): any {
  return { ...res, content: [{ type: 'text', text: extractText(res) }] };
}

export async function resilientCreate(params: any): Promise<any> {
  const p = { ...params, thinking: { type: 'disabled' } };
  try {
    return normalize(await gatewayClient.messages.create(p));
  } catch (err: any) {
    if (directClient && usingGateway) {
      console.warn(`[claude-resilient] gateway failed (${err?.message}); direct API with ${DIRECT_MODEL}`);
      return normalize(await directClient.messages.create({ ...p, model: DIRECT_MODEL }));
    }
    throw err;
  }
}
