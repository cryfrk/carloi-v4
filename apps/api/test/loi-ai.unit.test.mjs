import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  choosePreferredProvider,
  detectLoiAiTaskKinds,
  normalizeLoiAiText,
} = require('../dist/modules/loi-ai/loi-ai-routing.js');

test('loi ai routing chooses DeepSeek for search-like prompts', () => {
  const tasks = detectLoiAiTaskKinds('800 bin TL civari ilan ara ve saticiya soru hazirla');

  assert.ok(tasks.includes('SEARCH'));
  assert.ok(tasks.includes('SELLER_QUESTIONS'));
  assert.equal(choosePreferredProvider(tasks), 'DEEPSEEK');
});

test('loi ai routing chooses OpenAI for comparison and technical prompts', () => {
  const tasks = detectLoiAiTaskKinds('Bu iki ilani karsilastir ve kronik ariza risklerini yorumla');

  assert.ok(tasks.includes('COMPARISON'));
  assert.ok(tasks.includes('TECHNICAL'));
  assert.equal(choosePreferredProvider(tasks), 'OPENAI');
  assert.equal(normalizeLoiAiText('Karşılaştır ve yorumla'), 'karsilastir ve yorumla');
});
