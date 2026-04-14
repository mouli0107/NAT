import 'dotenv/config';

console.log('ANTHROPIC_KEY:', process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY ? `SET (len=${process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY.length})` : 'NOT SET');
console.log('ANTHROPIC_URL:', process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL || 'NOT SET');
console.log('OPENAI_KEY:', process.env.AI_INTEGRATIONS_OPENAI_API_KEY ? `SET (len=${process.env.AI_INTEGRATIONS_OPENAI_API_KEY.length})` : 'NOT SET');

import Anthropic from '@anthropic-ai/sdk';
const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

try {
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 50,
    messages: [{ role: 'user', content: 'Say OK in one word' }]
  });
  console.log('Anthropic API: SUCCESS -', msg.content[0]?.text);
} catch (e) {
  console.log('Anthropic API ERROR:', e.status, e.message?.slice(0, 200));
}
