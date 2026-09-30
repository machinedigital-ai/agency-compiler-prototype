import test from 'node:test';
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';

process.env.AGENT_ARTIFACT_STORE_PATH = 'work/test-agent-api-artifacts.json';
const { default: handler } = await import('../api/agents.js');

const bandAgent = { id: 'agent-1', name: 'Northstar Creative Director', description: 'Owns campaign intent.' };

test('public agent endpoint reads Band and runs approved Crusoe work', async () => {
  const oldFetch = globalThis.fetch;
  const oldBand = process.env.BAND_API_KEY;
  const oldCrusoe = process.env.CRUSOE_API_KEY;
  process.env.BAND_API_KEY = 'test-band-key';
  process.env.CRUSOE_API_KEY = 'test-crusoe-key';
  let bandCalls = 0;
  let crusoeCalls = 0;
  globalThis.fetch = async (url, options) => {
    if (url.includes('band.ai')) {
      bandCalls++;
      assert.equal(options.headers['X-API-Key'], 'test-band-key');
      return new Response(JSON.stringify({ data: [bandAgent] }));
    }
    crusoeCalls++;
    const body = JSON.parse(options.body);
    assert.equal(body.model, crusoeCalls === 1 ? 'nvidia/Nemotron-3.5-Lightning-30B-A3B' : 'nvidia/NVIDIA-Nemotron-3-Super-120B-A12B');
    assert.equal(body.max_tokens, 512);
    assert.equal(body.chat_template_kwargs.enable_thinking, false);
    return new Response(JSON.stringify({ choices: [{ message: { content: 'Campaign direction\n\nOWNER DECISION NEEDED: Choose A.' } }], usage: { prompt_tokens: 1000, completion_tokens: 1000 } }));
  };
  async function request(method = 'GET', body) {
    const res = { code: 200, headers: {}, setHeader(key, value) { this.headers[key] = value; }, status(value) { this.code = value; return this; }, json(data) { this.data = data; return this; } };
    await handler({ method, body, headers: {} }, res);
    return res;
  }
  try {
    const roster = await request();
    assert.equal(roster.code, 200);
    assert.equal(roster.data.agents[0].shortName, 'Creative Director');
    assert.equal(roster.data.runtime.studioCompiler.model, 'google/gemma-4-31b-it');
    assert.deepEqual(roster.data.runtime.policies.map(policy => policy.id), ['balanced', 'review']);
    assert.equal((await request('POST', { agentId: 'missing', task: 'Plan', brief: 'Brief' })).code, 404);
    const result = await request('POST', { agentId: bandAgent.id, task: 'Draft campaign direction', brief: 'Launch a sci-fi series.' });
    assert.equal(result.code, 200);
    assert.equal(result.data.run.status, 'awaiting_approval');
    assert.equal(result.data.run.model.id, 'balanced');
    assert.equal(result.data.run.usage.estimatedUsd, 0.00025);
    const deeper = await request('POST', { agentId: bandAgent.id, task: 'Stress-test campaign direction', brief: 'Launch a sci-fi series.', policy: 'review' });
    assert.equal(deeper.code, 200);
    assert.equal(deeper.data.run.model.id, 'review');
    assert.equal(deeper.data.run.usage.estimatedUsd, 0.0027);
    assert.equal((await request('POST', { agentId: bandAgent.id, task: 'Plan', brief: 'Brief', policy: 'missing' })).code, 400);
    assert.equal(crusoeCalls, 2);
    assert.ok(!JSON.stringify(result.data).includes('test-crusoe-key'));
  } finally {
    globalThis.fetch = oldFetch;
    await rm(process.env.AGENT_ARTIFACT_STORE_PATH, { force: true });
    if (oldBand === undefined) delete process.env.BAND_API_KEY; else process.env.BAND_API_KEY = oldBand;
    if (oldCrusoe === undefined) delete process.env.CRUSOE_API_KEY; else process.env.CRUSOE_API_KEY = oldCrusoe;
  }
});
