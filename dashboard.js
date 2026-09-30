const $ = selector => document.querySelector(selector);
let state;
try { state = JSON.parse(localStorage.getItem('agency-owner-dashboard')); } catch {}
if (!state || !Array.isArray(state.runs) || !Array.isArray(state.activity) || !Array.isArray(state.paused)) state = { runs: [], activity: [], paused: [], modelPolicy: 'balanced' };
if (typeof state.modelPolicy !== 'string') state.modelPolicy = 'balanced';
let agents = [];
let runtime = { defaultPolicy: 'balanced', policies: [], studioCompiler: null };
const defaultBrief = 'Create a launch trailer campaign for an original sci-fi series. Deliver a 90-second master trailer, 30s and 15s cutdowns, campaign key art frames, and a social rollout package. Launch in six weeks.';

function save() { localStorage.setItem('agency-owner-dashboard', JSON.stringify(state)); }
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]); }
function money() { return state.runs.reduce((sum, run) => sum + (run.usage?.estimatedUsd || 0), 0); }
function log(message) { state.activity.unshift({ at: new Date().toISOString(), message }); state.activity = state.activity.slice(0, 40); save(); renderActivity(); }
function selectedPolicy() { return runtime.policies.find(policy => policy.id === state.modelPolicy) || runtime.policies.find(policy => policy.id === runtime.defaultPolicy); }
function renderModels() {
  const policy = selectedPolicy(); const select = $('#model-policy');
  if (!policy) { select.innerHTML = '<option>Model details unavailable</option>'; select.disabled = true; return; }
  if (state.modelPolicy !== policy.id) { state.modelPolicy = policy.id; save(); }
  select.disabled = false; select.innerHTML = runtime.policies.map(item => `<option value="${item.id}">${item.label} · ${item.modelLabel}</option>`).join(''); select.value = policy.id;
  $('#model-observability').textContent = `Team runs use ${policy.modelLabel} through Crusoe · $${policy.inputUsdPerMillion.toFixed(2)} input / $${policy.outputUsdPerMillion.toFixed(2)} output per 1M tokens. Studio compilation uses ${runtime.studioCompiler?.modelLabel || 'the configured compiler model'}.`;
}
function renderStats() { $('#agent-count').textContent = agents.length; $('#working-count').textContent = document.querySelectorAll('.is-working').length; $('#approval-count').textContent = state.runs.filter(run => run.status === 'awaiting_approval').length; $('#session-cost').textContent = `$${money().toFixed(6)}`; }
function renderActivity() { $('#activity-list').innerHTML = state.activity.length ? state.activity.map(item => `<li><time>${new Date(item.at).toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</time><span></span></li>`).join('') : '<li><span>No agent activity recorded in this browser.</span></li>'; [...$('#activity-list').querySelectorAll('li')].forEach((li, index) => { const item=state.activity[index]; if(item) li.lastElementChild.textContent=item.message; }); }
function renderDecisions() {
  const pending = state.runs.filter(run => ['awaiting_approval','approved','revision_requested'].includes(run.status));
  $('#decision-list').innerHTML = pending.length ? pending.map(run => `<article class="decision ${run.status === 'approved' ? 'approved' : run.status === 'revision_requested' ? 'revision' : ''}" data-run="${run.id}"><div class="decision-head"><h3>${escapeHtml(run.agentName)}: ${escapeHtml(run.task)}</h3><span class="state">${run.status.replaceAll('_',' ')}</span></div><pre></pre><footer><a class="view-artifact" href="/artifact.html?id=${encodeURIComponent(run.id)}">View artifact</a><button class="primary approve" type="button" ${run.status !== 'awaiting_approval' ? 'disabled' : ''}>Approve</button><button class="quiet revise" type="button" ${run.status !== 'awaiting_approval' ? 'disabled' : ''}>Request changes</button><small>${run.model ? `${run.model.modelLabel} · ` : ''}${run.usage ? `$${run.usage.estimatedUsd.toFixed(6)} estimated` : 'Usage unavailable'}</small></footer></article>`).join('') : '<p class="empty">No work is waiting. Assign a task to an agent above.</p>';
  pending.forEach(run => { const card=document.querySelector(`[data-run="${run.id}"]`); card.querySelector('pre').textContent=run.output; });
  renderStats();
}
function renderAgents() {
  const policy = selectedPolicy();
  const list=$('#agent-list'); list.innerHTML='';
  for(const agent of agents){ const row=$('#agent-template').content.firstElementChild.cloneNode(true); row.dataset.agent=agent.id; row.querySelector('.agent-avatar').textContent=agent.shortName.split(/\s+/).map(part=>part[0]).join('').slice(0,2); row.querySelector('h3').textContent=agent.shortName; row.querySelector('.purpose').textContent=agent.purpose; row.querySelector('.boundary').textContent=agent.boundary; row.querySelector('textarea').value=agent.assignment; row.querySelector('.agent-note').textContent=`Band identity ready · ${policy?.modelLabel || 'Model loading'} · Human approval on`; const paused=state.paused.includes(agent.id); if(paused){row.classList.add('is-paused');row.querySelector('.state').textContent='Paused';row.querySelector('.run-agent').disabled=true;row.querySelector('.pause-agent').textContent='Resume';} list.append(row); }
  renderStats();
}
async function loadAgents() {
  const button=$('#refresh-button'); button.disabled=true; $('#dashboard-status').textContent='Connecting to your Band roster…';
  try {
    const [response, artifactResponse] = await Promise.all([fetch('/api/agents'), fetch('/api/artifacts')]); const body=await response.json();
    if(!response.ok) throw new Error(body.error||'Could not load agents.');
    if (artifactResponse.ok) { const artifacts = await artifactResponse.json(); state.runs = artifacts.runs; save(); }
    agents=body.agents; runtime=body.runtime; renderModels(); renderAgents(); renderDecisions(); renderActivity(); $('#dashboard-status').textContent=`${agents.length} agents connected · Live assignments are ready.`;
  } finally { button.disabled=false; }
}
$('#refresh-button').addEventListener('click',async()=>{try{await loadAgents();log('Refreshed the Band agent roster.');}catch(error){$('#dashboard-status').textContent=error.message;}});
$('#agent-list').addEventListener('click',async event=>{
  const row=event.target.closest('.agent-row'); if(!row)return; const agent=agents.find(item=>item.id===row.dataset.agent);
  if(event.target.closest('.pause-agent')){const paused=state.paused.includes(agent.id);state.paused=paused?state.paused.filter(id=>id!==agent.id):[...state.paused,agent.id];save();log(`${agent.shortName} ${paused?'resumed':'paused'} by owner.`);renderAgents();return;}
  if(!event.target.closest('.run-agent'))return;
  const task=row.querySelector('textarea').value.trim(); if(!task)return;
  row.classList.add('is-working');row.querySelector('.state').textContent='Working';document.querySelectorAll('.run-agent').forEach(button=>button.disabled=true);renderStats();log(`${agent.shortName} started: ${task}`);
  try{const response=await fetch('/api/agents',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({agentId:agent.id,task,brief:defaultBrief,policy:state.modelPolicy}),signal:AbortSignal.timeout(65000)});const body=await response.json();if(!response.ok)throw new Error(body.error||'Agent run failed.');state.runs.unshift(body.run);save();log(`${agent.shortName} finished with ${body.run.model.modelLabel} and is waiting for your approval.`);renderDecisions();}
  catch(error){log(`${agent.shortName} stopped: ${error.name==='TimeoutError'?'request timed out':error.message}`);alert(error.message);} finally{renderAgents();}
});
$('#decision-list').addEventListener('click',async event=>{const card=event.target.closest('.decision');if(!card)return;const run=state.runs.find(item=>item.id===card.dataset.run);const status=event.target.closest('.approve')?'approved':event.target.closest('.revise')?'revision_requested':null;if(!status)return;const response=await fetch(`/api/artifacts?id=${encodeURIComponent(run.id)}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})});const body=await response.json();if(!response.ok){alert(body.error||'Could not record your decision.');return;}Object.assign(run,body.run);log(`Owner ${status === 'approved' ? 'approved' : 'requested changes from'} ${run.agentName}: ${run.task}`);save();renderDecisions();});
$('#clear-activity').addEventListener('click',()=>{state.activity=[];save();renderActivity();});
$('#model-policy').addEventListener('change',event=>{state.modelPolicy=event.target.value;save();const policy=selectedPolicy();renderModels();renderAgents();log(`Team run mode changed to ${policy.modelLabel}.`);});
renderActivity();renderDecisions();loadAgents().catch(error=>{$('#dashboard-status').textContent=error.message;});
