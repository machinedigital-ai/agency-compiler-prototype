import test from 'node:test';
import assert from 'node:assert/strict';
import handler, { validateInput, validateOutput, MAX_OUTPUT } from '../api/compile.js';

const input = { studioName: 'Northstar', teamSize: 3, focus: 'Entertainment creative', brief: 'A launch trailer for a sci-fi series.' };
const plan = { studio: { pattern: 'Small studio', roles: [{ title: 'Director', resolution: 'human', mandate: 'Approve creative' }], capabilities: ['Creative direction'] },
  project: { label: 'Trailer', rationale: 'Time-based campaign', pod: ['Director'], workflow: ['Align', 'Produce'], artifacts: ['Cut map'], gates: ['Director approves'] },
  sampleArtifact: { title: 'Cut map', content: 'Open on a world with two suns.' } };

test('input and provider output validation reject malformed plans', () => {
  assert.deepEqual(validateInput(input), input);
  for (const change of [{teamSize:0},{teamSize:1.5},{brief:''},{brief:'x'.repeat(4001)},{focus:null}]) assert.throws(() => validateInput({...input,...change}));
  assert.throws(() => validateOutput({}));
  assert.throws(() => validateOutput({...plan, studio:{...plan.studio, roles:[{...plan.studio.roles[0], resolution:'unrestricted shell'}]}}));
  assert.equal(validateOutput(plan).project.label, 'Trailer');
});

test('handler guards billing, bounds requests, reports usage, and exposes no upstream secrets', async () => {
  const oldFetch = globalThis.fetch;
  const oldKey = process.env.CRUSOE_API_KEY;
  process.env.CRUSOE_API_KEY = 'test-provider-secret';
  let calls = 0, upstreamStatus = 200, completion = { choices:[{finish_reason:'stop',message:{content:JSON.stringify(plan)}}],usage:{prompt_tokens:1000,completion_tokens:1000} };
  globalThis.fetch = async (url, options) => {
    calls++;
    assert.equal(url, 'https://api.inference.crusoecloud.com/v1/chat/completions');
    const body = JSON.parse(options.body);
    assert.equal(body.max_tokens, MAX_OUTPUT);
    return new Response(JSON.stringify(upstreamStatus === 200 ? completion : {error:'test-provider-secret'}), {status:upstreamStatus});
  };
  async function request(body = input, headers = {}, method = 'POST') {
    const res = { code:200, setHeader(){}, status(code){this.code=code;return this;}, json(data){this.data=data;return this;} };
    await handler({method,headers,body},res); return res;
  }
  try {
    assert.equal((await request({...input,brief:''})).code,400);
    assert.equal((await request('{broken')).code,400);
    assert.equal((await request(input,{},'GET')).code,405);
    assert.equal(calls,0);
    const ok=await request(); assert.equal(ok.code,200); assert.equal(ok.data.generation.usage.estimatedUsd,0.00054);
    upstreamStatus=429; const limited=await request(); assert.equal(limited.code,429); assert.ok(!JSON.stringify(limited.data).includes('test-provider-secret'));
    upstreamStatus=200; completion.choices[0].finish_reason='length'; assert.equal((await request()).code,502);
    completion.choices[0]={finish_reason:'stop',message:{content:'{"studio":{}}'}}; assert.equal((await request()).code,502);
    globalThis.fetch=async()=>{throw new DOMException('timeout','TimeoutError');}; assert.equal((await request()).code,504);
    delete process.env.CRUSOE_API_KEY; assert.equal((await request()).code,503);
  } finally {
    globalThis.fetch=oldFetch;
    if(oldKey===undefined) delete process.env.CRUSOE_API_KEY; else process.env.CRUSOE_API_KEY=oldKey;
  }
});
