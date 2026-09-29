import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/agents.js';

const bandAgent = { id: 'agent-1', name: 'Northstar Creative Director', description: 'Owns campaign intent.' };

test('agent endpoint protects access, reads Band, and runs approved Crusoe work', async () => {
  const oldFetch = globalThis.fetch;
  const oldBand = process.env.BAND_API_KEY;
  const oldCrusoe = process.env.CRUSOE_API_KEY;
  const oldCode = process.env.DEMO_ACCESS_CODE;
  process.env.BAND_API_KEY = 'test-band-key';
  process.env.CRUSOE_API_KEY = 'test-crusoe-key';
  process.env.DEMO_ACCESS_CODE = 'test-demo-code';
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
    assert.equal(body.model, 'nvidia/Nemotron-3.5-Lightning-30B-A3B');
    assert.equal(body.max_tokens, 512);
    assert.equal(body.chat_template_kwargs.enable_thinking, false);
    return new Response(JSON.stringify({ choices: [{ message: { content: 'Campaign direction\n\nOWNER DECISION NEEDED: Choose A.' } }], usage: { prompt_tokens: 1000, completion_tokens: 1000 } }));
  };
  async function request(method = 'GET', body, code = 'test-demo-code') {
    const res = { code: 200, headers: {}, setHeader(key, value) { this.headers[key] = value; }, status(value) { this.code = value; return this; }, json(data) { this.data = data; return this; } };
    await handler({ method, body, headers: { 'x-demo-access-code': code } }, res);
    return res;
  }
  try {
    assert.equal((await request('GET', undefined, 'wrong')).code, 401);
    assert.equal(bandCalls, 0);
    const roster = await request();
    assert.equal(roster.code, 200);
    assert.equal(roster.data.agents[0].shortName, 'Creative Director');
    assert.equal((await request('POST', { agentId: 'missing', task: 'Plan', brief: 'Brief' })).code, 404);
    const result = await request('POST', { agentId: bandAgent.id, task: 'Draft campaign direction', brief: 'Launch a sci-fi series.' });
    assert.equal(result.code, 200);
    assert.equal(result.data.run.status, 'awaiting_approval');
    assert.equal(result.data.run.usage.estimatedUsd, 0.00025);
    assert.equal(crusoeCalls, 1);
    assert.ok(!JSON.stringify(result.data).includes('test-crusoe-key'));
  } finally {
    globalThis.fetch = oldFetch;
    if (oldBand === undefined) delete process.env.BAND_API_KEY; else process.env.BAND_API_KEY = oldBand;
    if (oldCrusoe === undefined) delete process.env.CRUSOE_API_KEY; else process.env.CRUSOE_API_KEY = oldCrusoe;
    if (oldCode === undefined) delete process.env.DEMO_ACCESS_CODE; else process.env.DEMO_ACCESS_CODE = oldCode;
  }
});
