import test from 'node:test';
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';

process.env.AGENT_ARTIFACT_STORE_PATH = 'work/test-agent-artifacts.json';
const { saveArtifact, findArtifact, updateArtifact } = await import('../api/artifacts.js');

test('runtime artifact store shares a run and its approval state', async () => {
  await rm(process.env.AGENT_ARTIFACT_STORE_PATH, { force: true });
  await saveArtifact({ id: 'run-1', status: 'awaiting_approval', task: 'Draft a key-art direction' });
  assert.equal((await findArtifact('run-1')).task, 'Draft a key-art direction');
  assert.equal((await updateArtifact('run-1', 'approved')).status, 'approved');
  assert.equal(await updateArtifact('run-1', 'not-a-status'), null);
  await rm(process.env.AGENT_ARTIFACT_STORE_PATH, { force: true });
});
