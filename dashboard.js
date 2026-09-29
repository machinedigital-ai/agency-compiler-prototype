const $ = selector => document.querySelector(selector);
let state;
try { state = JSON.parse(localStorage.getItem('agency-owner-dashboard')); } catch {}
if (!state || !Array.isArray(state.runs) || !Array.isArray(state.activity) || !Array.isArray(state.paused)) state = { runs: [], activity: [], paused: [] };
let code = sessionStorage.getItem('agency-demo-code') || '';
let agents = [];
const defaultBrief = 'Create a launch trailer campaign for an original sci-fi series. Deliver a 90-second master trailer, 30s and 15s cutdowns, campaign key art frames, and a social rollout package. Launch in six weeks.';

function save() { localStorage.setItem('agency-owner-dashboard', JSON.stringify(state)); }
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]); }
function money() { return state.runs.reduce((sum, run) => sum + (run.usage?.estimatedUsd || 0), 0); }
function log(message) { state.activity.unshift({ at: new Date().toISOString(), message }); state.activity = state.activity.slice(0, 40); save(); renderActivity(); }
function renderStats() { $('#agent-count').textContent = agents.length; $('#working-count').textContent = document.querySelectorAll('.is-working').length; $('#approval-count').textContent = state.runs.filter(run => run.status === 'awaiting_approval').length; $('#session-cost').textContent = `$${money().toFixed(6)}`; }
function renderActivity() { $('#activity-list').innerHTML = state.activity.length ? state.activity.map(item => `<li><time>${new Date(item.at).toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</time><span></span></li>`).join('') : '<li><span>No agent activity recorded in this browser.</span></li>'; [...$('#activity-list').querySelectorAll('li')].forEach((li, index) => { const item=state.activity[index]; if(item) li.lastElementChild.textContent=item.message; }); }
function renderDecisions() {
  const pending = state.runs.filter(run => ['awaiting_approval','approved','revision_requested'].includes(run.status));
  $('#decision-list').innerHTML = pending.length ? pending.map(run => `<article class="decision ${run.status === 'approved' ? 'approved' : run.status === 'revision_requested' ? 'revision' : ''}" data-run="${run.id}"><div class="decision-head"><h3>${escapeHtml(run.agentName)}: ${escapeHtml(run.task)}</h3><span class="state">${run.status.replaceAll('_',' ')}</span></div><pre></pre><footer><button class="primary approve" type="button" ${run.status !== 'awaiting_approval' ? 'disabled' : ''}>Approve</button><button class="quiet revise" type="button" ${run.status !== 'awaiting_approval' ? 'disabled' : ''}>Request changes</button><small>${run.usage ? `$${run.usage.estimatedUsd.toFixed(6)} estimated` : 'Usage unavailable'}</small></footer></article>`).join('') : '<p class="empty">No work is waiting. Assign a task to an agent above.</p>';
  pending.forEach(run => { const card=document.querySelector(`[data-run="${run.id}"]`); card.querySelector('pre').textContent=run.output; });
  renderStats();
}
function renderAgents() {
  const list=$('#agent-list'); list.innerHTML='';
  for(const agent of agents){ const row=$('#agent-template').content.firstElementChild.cloneNode(true); row.dataset.agent=agent.id; row.querySelector('.agent-avatar').textContent=agent.shortName.split(/\s+/).map(part=>part[0]).join('').slice(0,2); row.querySelector('h3').textContent=agent.shortName; row.querySelector('.purpose').textContent=agent.purpose; row.querySelector('.boundary').textContent=agent.boundary; row.querySelector('textarea').value=agent.assignment; const paused=state.paused.includes(agent.id); if(paused){row.classList.add('is-paused');row.querySelector('.state').textContent='Paused';row.querySelector('.run-agent').disabled=true;row.querySelector('.pause-agent').textContent='Resume';} list.append(row); }
  renderStats();
}
async function loadAgents() {
  $('#access-status').textContent='Connecting to your Band roster…';
  const response=await fetch('/api/agents',{headers:{'x-demo-access-code':code}}); const body=await response.json();
  if(!response.ok) throw new Error(body.error||'Could not load agents.');
  agents=body.agents; sessionStorage.setItem('agency-demo-code',code); $('#access-panel').hidden=true; $('#owner-view').hidden=false; renderAgents(); renderDecisions(); renderActivity(); $('#access-status').textContent='';
}
$('#unlock-button').addEventListener('click',async()=>{code=$('#dashboard-code').value.trim();try{await loadAgents();}catch(error){$('#access-status').textContent=error.message;}});
$('#refresh-button').addEventListener('click',async()=>{if(!code){$('#access-panel').hidden=false;$('#dashboard-code').focus();return;}try{await loadAgents();log('Refreshed the Band agent roster.');}catch(error){alert(error.message);}});
$('#agent-list').addEventListener('click',async event=>{
  const row=event.target.closest('.agent-row'); if(!row)return; const agent=agents.find(item=>item.id===row.dataset.agent);
  if(event.target.closest('.pause-agent')){const paused=state.paused.includes(agent.id);state.paused=paused?state.paused.filter(id=>id!==agent.id):[...state.paused,agent.id];save();log(`${agent.shortName} ${paused?'resumed':'paused'} by owner.`);renderAgents();return;}
  if(!event.target.closest('.run-agent'))return;
  const task=row.querySelector('textarea').value.trim(); if(!task)return;
  row.classList.add('is-working');row.querySelector('.state').textContent='Working';row.querySelector('.run-agent').disabled=true;renderStats();log(`${agent.shortName} started: ${task}`);
  try{const response=await fetch('/api/agents',{method:'POST',headers:{'Content-Type':'application/json','x-demo-access-code':code},body:JSON.stringify({agentId:agent.id,task,brief:defaultBrief}),signal:AbortSignal.timeout(65000)});const body=await response.json();if(!response.ok)throw new Error(body.error||'Agent run failed.');state.runs.unshift(body.run);save();log(`${agent.shortName} finished and is waiting for your approval.`);renderDecisions();}
  catch(error){log(`${agent.shortName} stopped: ${error.name==='TimeoutError'?'request timed out':error.message}`);alert(error.message);} finally{renderAgents();}
});
$('#decision-list').addEventListener('click',event=>{const card=event.target.closest('.decision');if(!card)return;const run=state.runs.find(item=>item.id===card.dataset.run);if(event.target.closest('.approve')){run.status='approved';log(`Owner approved ${run.agentName}'s work: ${run.task}`);}else if(event.target.closest('.revise')){run.status='revision_requested';log(`Owner requested changes from ${run.agentName}: ${run.task}`);}else return;save();renderDecisions();});
$('#clear-activity').addEventListener('click',()=>{state.activity=[];save();renderActivity();});
renderActivity();renderDecisions();if(code)loadAgents().catch(()=>{$('#access-panel').hidden=false;$('#owner-view').hidden=true;});
