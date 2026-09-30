const $ = selector => document.querySelector(selector);
const id = new URLSearchParams(location.search).get('id');
let state;
try { state = JSON.parse(localStorage.getItem('agency-owner-dashboard')); } catch {}
if (!state || !Array.isArray(state.runs) || !Array.isArray(state.activity)) state = { runs: [], activity: [] };
const run = state.runs.find(item => item.id === id);

function save() { localStorage.setItem('agency-owner-dashboard', JSON.stringify(state)); }
function log(message) { state.activity.unshift({ at: new Date().toISOString(), message }); state.activity = state.activity.slice(0, 40); save(); }
function appendInline(parent, text) {
  for (const part of text.split(/(\*\*[^*]+\*\*)/g)) {
    if (part.startsWith('**') && part.endsWith('**')) { const strong = document.createElement('strong'); strong.textContent = part.slice(2, -2); parent.append(strong); }
    else parent.append(document.createTextNode(part));
  }
}
function renderOutput(output) {
  const decision = output.match(/OWNER DECISION NEEDED:\s*([\s\S]*)$/i);
  const body = decision ? output.slice(0, decision.index).trim() : output;
  $('#artifact-output').replaceChildren(...body.split(/\n{2,}/).filter(Boolean).map(text => { const paragraph = document.createElement('p'); appendInline(paragraph, text); return paragraph; }));
  $('#artifact-decision').textContent = decision?.[1]?.trim() || 'Review the work product and decide whether it is ready to move forward.';
}
function render() {
  if (!run) { $('#artifact-status').hidden = true; $('#artifact-empty').hidden = false; return; }
  $('#artifact-status').hidden = true; $('#artifact-view').hidden = false;
  $('#artifact-title').textContent = run.task;
  $('#artifact-subtitle').textContent = `${run.agentName} prepared this work for the current project.`;
  $('#artifact-state').textContent = run.status.replaceAll('_', ' ');
  $('#artifact-agent').textContent = `Prepared by ${run.agentName}`;
  $('#artifact-model').textContent = run.model?.modelLabel || 'Model details unavailable';
  $('#artifact-usage').textContent = run.usage ? `$${run.usage.estimatedUsd.toFixed(6)} estimated` : 'Usage unavailable';
  $('#review-reel').href = `/review-reel.html?id=${encodeURIComponent(run.id)}`;
  renderOutput(run.output);
  const waiting = run.status === 'awaiting_approval';
  $('#approve-work').disabled = !waiting; $('#revise-work').disabled = !waiting;
  $('#review-note').textContent = waiting ? 'Choose one outcome. You can return to the dashboard at any time.' : `This work is marked ${run.status.replaceAll('_', ' ')} in this browser.`;
}
$('#approve-work').addEventListener('click', () => { if (run?.status !== 'awaiting_approval') return; run.status = 'approved'; log(`Owner approved ${run.agentName}'s work: ${run.task}`); render(); });
$('#revise-work').addEventListener('click', () => { if (run?.status !== 'awaiting_approval') return; run.status = 'revision_requested'; log(`Owner requested changes from ${run.agentName}: ${run.task}`); render(); });
render();
