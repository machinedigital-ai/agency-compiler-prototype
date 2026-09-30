import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const statuses = new Set(['awaiting_approval', 'approved', 'revision_requested']);
let cache;
function storePath() { return process.env.AGENT_ARTIFACT_STORE_PATH || resolve('work', 'agent-artifacts.json'); }
async function runs() {
  if (cache) return cache;
  try { cache = JSON.parse(await readFile(storePath(), 'utf8')); } catch { cache = []; }
  return cache;
}
async function persist() { await mkdir(resolve(storePath(), '..'), { recursive: true }); await writeFile(storePath(), JSON.stringify(cache, null, 2)); }
export async function saveArtifact(run) { const items = await runs(); cache = [run, ...items.filter(item => item.id !== run.id)].slice(0, 40); await persist(); return run; }
export async function findArtifact(id) { return (await runs()).find(item => item.id === id) || null; }
export async function listArtifacts() { return [...await runs()]; }
export async function updateArtifact(id, status) { if (!statuses.has(status)) return null; const run = await findArtifact(id); if (!run) return null; run.status = status; await persist(); return run; }

function json(res, status, data) { return res.status(status).json(data); }
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const id = new URL(req.url, 'http://localhost').searchParams.get('id');
  if (req.method === 'GET') {
    if (!id) return json(res, 200, { runs: await listArtifacts() });
    const run = await findArtifact(id);
    return run ? json(res, 200, { run }) : json(res, 404, { error: 'Work product not found in this runtime.' });
  }
  if (req.method !== 'PATCH') { res.setHeader('Allow', 'GET, PATCH'); return json(res, 405, { error: 'Use GET or PATCH.' }); }
  if (!id) return json(res, 400, { error: 'Choose a work product.' });
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { return json(res, 400, { error: 'Invalid JSON.' }); } }
  const run = await updateArtifact(id, body?.status);
  return run ? json(res, 200, { run }) : json(res, 404, { error: 'Work product or decision not found.' });
}
