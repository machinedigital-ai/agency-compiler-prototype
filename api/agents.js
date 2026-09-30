import { randomUUID } from 'node:crypto';
import { MODEL as STUDIO_COMPILER_MODEL } from './compile.js';

export const MODEL_POLICIES = {
  balanced: { id: 'balanced', label: 'Balanced', model: 'nvidia/Nemotron-3.5-Lightning-30B-A3B', modelLabel: 'Nemotron 3.5 Lightning', inputUsdPerMillion: 0.05, outputUsdPerMillion: 0.20 },
  review: { id: 'review', label: 'Deep review', model: 'nvidia/NVIDIA-Nemotron-3-Super-120B-A12B', modelLabel: 'Nemotron 3 Super 120B', inputUsdPerMillion: 0.30, outputUsdPerMillion: 2.40 }
};
const BAND_URL = 'https://app.band.ai/api/v1/me/agents?page_size=100';
const PURPOSES = {
  'Northstar Creative Director': { shortName: 'Creative Director', purpose: 'Protects the campaign idea and turns your brief into clear creative direction.', assignment: 'Draft campaign direction', boundary: 'You approve the direction and every final creative decision.' },
  'Northstar Trailer Editor': { shortName: 'Trailer Editor', purpose: 'Turns the story into trailer beats, cut maps, and version plans.', assignment: 'Build a 90-second trailer cut plan', boundary: 'Cannot publish, deliver, or replace your final editorial review.' },
  'Northstar Visual Artist': { shortName: 'Visual Artist', purpose: 'Develops key-art directions and adapts approved visuals for campaign formats.', assignment: 'Develop three key-art directions', boundary: 'Cannot buy assets, publish work, or modify protected source files.' }
};

function json(res, status, data) { return res.status(status).json(data); }
function publicPolicy(policy) { const { id, label, model, modelLabel, inputUsdPerMillion, outputUsdPerMillion } = policy; return { id, label, model, modelLabel, inputUsdPerMillion, outputUsdPerMillion }; }
async function listBandAgents() {
  const response = await fetch(BAND_URL, { headers: { 'X-API-Key': process.env.BAND_API_KEY }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw Object.assign(new Error(`Band request failed (HTTP ${response.status}).`), { status: 502 });
  const body = await response.json();
  const list = Array.isArray(body.data) ? body.data : body.data?.agents || [];
  return list.filter(agent => PURPOSES[agent.name]).map(agent => ({ id: agent.id, bandName: agent.name, description: agent.description,
    avatarUrl: agent.avatar_url, registeredAt: agent.inserted_at, provider: 'Band', connection: 'registered', ...PURPOSES[agent.name] }));
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!process.env.BAND_API_KEY) return json(res, 503, { error: 'Band is not configured on this deployment.' });
  try {
    const agents = await listBandAgents();
    if (req.method === 'GET') return json(res, 200, { agents, runtime: { coordination: 'Band', defaultPolicy: 'balanced', policies: Object.values(MODEL_POLICIES).map(publicPolicy), studioCompiler: { model: STUDIO_COMPILER_MODEL, modelLabel: 'Gemma 4 31B' } } });
    if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return json(res, 405, { error: 'Use GET or POST.' }); }
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { return json(res, 400, { error: 'Invalid JSON.' }); } }
    const agent = agents.find(item => item.id === body?.agentId);
    if (!agent) return json(res, 404, { error: 'That agent is not part of this studio.' });
    const task = typeof body.task === 'string' ? body.task.trim() : '';
    const brief = typeof body.brief === 'string' ? body.brief.trim() : '';
    if (!task || task.length > 1200 || !brief || brief.length > 4000) return json(res, 400, { error: 'Provide a task and project brief within the allowed length.' });
    const policy = MODEL_POLICIES[body?.policy || 'balanced'];
    if (!policy) return json(res, 400, { error: 'Choose an available model policy.' });
    if (!process.env.CRUSOE_API_KEY) return json(res, 503, { error: 'Crusoe is not configured on this deployment.' });
    const started = Date.now();
    const response = await fetch('https://api.inference.crusoecloud.com/v1/chat/completions', { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.CRUSOE_API_KEY}` },
      body: JSON.stringify({ model: policy.model, temperature: 0.3, max_tokens: 512, chat_template_kwargs: { enable_thinking: false },
        messages: [{ role: 'system', content: `You are the ${agent.shortName} in a three-person virtual creative team. Purpose: ${agent.purpose} Boundary: ${agent.boundary} Produce a concise, concrete work product under 220 words. Do not claim you used tools, published, purchased, contacted anyone, rendered media, or completed real-world actions. End with "OWNER DECISION NEEDED:" followed by one specific choice.` },
          { role: 'user', content: `PROJECT BRIEF:\n${brief}\n\nASSIGNED TASK:\n${task}` }] }), signal: AbortSignal.timeout(55000) });
    if (!response.ok) throw Object.assign(new Error(response.status === 429 ? 'Crusoe is rate limiting requests. Wait before retrying.' : `Crusoe request failed (HTTP ${response.status}).`), { status: response.status === 429 ? 429 : 502 });
    const completion = await response.json();
    const output = completion.choices?.[0]?.message?.content?.trim();
    if (!output) throw Object.assign(new Error('The agent returned no work product.'), { status: 502 });
    const usage = completion.usage;
    const cost = usage ? (usage.prompt_tokens * policy.inputUsdPerMillion + usage.completion_tokens * policy.outputUsdPerMillion) / 1e6 : null;
    return json(res, 200, { run: { id: randomUUID(), agentId: agent.id, agentName: agent.shortName, task, output,
      status: 'awaiting_approval', createdAt: new Date().toISOString(), durationMs: Date.now() - started,
      model: publicPolicy(policy), usage: usage ? { inputTokens: usage.prompt_tokens, outputTokens: usage.completion_tokens, estimatedUsd: cost } : null } });
  } catch (error) {
    const timeout = ['TimeoutError', 'AbortError'].includes(error.name);
    return json(res, error.status || (timeout ? 504 : 502), { error: timeout ? 'The agent timed out. No automatic retry was made.' : error.message || 'Agent service unavailable.' });
  }
}
