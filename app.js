import { recommendStudio, classifyProject, compileStudio, kb } from "./logic.js";

const $ = (selector) => document.querySelector(selector);
let studio = restore("agency-compiler-studio") || recommendStudio({ studioName: $("#studio-name").value, teamSize: $("#team-size").value, focus: $("#studio-focus").value });
let liveResult = null;

function save() { localStorage.setItem("agency-compiler-studio", JSON.stringify(studio)); }
function restore(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } }
function escape(value) { const node = document.createElement("span"); node.textContent = value; return node.innerHTML.replaceAll('"', '&quot;').replaceAll("'", '&#39;'); }
function renderStudio() {
  $("#studio-result").hidden = false;
  $("#recommendation-title").textContent = studio.pattern;
  $("#roles").innerHTML = studio.roles.map((role, index) => `<div class="role"><input aria-label="Role title" data-field="title" data-index="${index}" value="${escape(role.title)}"><select aria-label="Runtime resolution" data-field="resolution" data-index="${index}"><option ${role.resolution === "human" ? "selected" : ""}>human</option><option ${role.resolution === "human + AI copilot" ? "selected" : ""}>human + AI copilot</option><option ${role.resolution === "AI-assisted" ? "selected" : ""}>AI-assisted</option><option ${role.resolution === "external service" ? "selected" : ""}>external service</option></select><small>${escape(role.mandate)}</small><button class="delete" data-remove="${index}" aria-label="Remove ${escape(role.title)}">×</button></div>`).join("");
  $("#evidence-list").innerHTML = studio.evidence.map((item) => `<p><strong>${escape(item.source)}</strong>${escape(item.claim)}</p>`).join("");
  save();
}
function renderManifest() {
  $("#compiled-result").hidden = false;
  $("#manifest").textContent = JSON.stringify(compileStudio(studio), null, 2);
}
function renderProject(project = classifyProject($("#project-brief").value)) {
  $("#project-result").hidden = false;
  $("#archetype").textContent = project.label;
  $("#confidence-bar").parentElement.hidden = project.confidence == null;
  $("#confidence-bar").style.width = `${project.confidence || 0}%`;
  $("#classification-rationale").textContent = `${project.confidence == null ? 'Model proposal · human review required' : 'Seeded demo classification'} · ${project.rationale}`;
  $("#pod-list").innerHTML = project.pod.map((item) => `<li>${escape(item)}</li>`).join("");
  $("#workflow-list").innerHTML = project.workflow.map((item) => `<li>${escape(item)}</li>`).join("");
  $("#artifact-list").innerHTML = project.artifacts.map((item) => `<li>${escape(item)}</li>`).join("");
  $("#gates").innerHTML = project.gates.map((item) => `<span>Gate · ${escape(item)}</span>`).join("");
  $("#telemetry").hidden = true;
  $("#simulate-button").disabled = false;
  $("#simulate-button").textContent = 'Simulate execution →';
  $("#project-result").scrollIntoView({ behavior: "smooth", block: "start" });
}
function renderTelemetry() {
  const empirical = kb.empirical.trailer;
  const metrics = [["on-time", "94%"], ["first review", "86%"], ["revision rounds", "1.4"], ["approval latency", "2.1d"]];
  $("#metrics").innerHTML = metrics.map(([label, value]) => `<div class="metric"><b>${value}</b><span>${label}</span></div>`).join("");
  $("#telemetry").hidden = false;
  $("#telemetry").scrollIntoView({ behavior: "smooth", block: "start" });
  $("#simulate-button").innerHTML = `Simulation complete <b>✓</b>`;
  $("#simulate-button").disabled = true;
  console.info("Seed benchmark:", empirical);
}

$("#team-size").addEventListener("input", (event) => { $("#team-size-output").textContent = `${event.target.value} ${event.target.value === "1" ? "person" : "people"}`; });
$("#studio-form").addEventListener("submit", (event) => { event.preventDefault(); studio = recommendStudio({ studioName: $("#studio-name").value, teamSize: $("#team-size").value, focus: $("#studio-focus").value }); renderStudio(); $("#studio-result").scrollIntoView({ behavior: "smooth", block: "start" }); });
$("#roles").addEventListener("change", (event) => { const { index, field } = event.target.dataset; if (index !== undefined) { studio.roles[index][field] = event.target.value; save(); renderManifest(); } });
$("#roles").addEventListener("click", (event) => { const index = event.target.dataset.remove; if (index !== undefined) { studio.roles.splice(index, 1); renderStudio(); renderManifest(); } });
$("#add-role").addEventListener("click", () => { const input = $("#new-role"); const title = input.value.trim(); if (!title) return; studio.roles.push({ id: crypto.randomUUID(), title, resolution: "human + AI copilot", mandate: "Custom capability" }); input.value = ""; renderStudio(); });
$("#compile-button").addEventListener("click", renderManifest);
$("#project-button").addEventListener("click", () => renderProject());
$("#simulate-button").addEventListener("click", renderTelemetry);

renderStudio();

$('#live-button').addEventListener('click', async () => {
  const button = $('#live-button');
  const code = $('#access-code').value.trim();
  if (!code) { $('#live-status').textContent = 'Enter your private demo access code first.'; $('#access-code').focus(); return; }
  button.disabled = true;
  $('#live-status').textContent = 'Calling Crusoe · generating your studio, project plan, and draft…';
  try {
    const response = await fetch('/api/compile', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-demo-access-code': code },
      body: JSON.stringify({ studioName: $('#studio-name').value, focus: $('#studio-focus').value, teamSize: Number($('#team-size').value), brief: $('#project-brief').value }),
      signal: AbortSignal.timeout(65000) });
    let result;
    try { result = await response.json(); } catch { throw new Error('Live API unavailable. Open the latest deployment or use npm run dev.'); }
    if (!response.ok) throw new Error(result.error || 'Generation failed.');
    liveResult = result;
    sessionStorage.setItem('agency-demo-code', code);
    studio = { studioName: result.input.studioName, teamSize: result.input.teamSize, focus: result.input.focus, ...result.studio,
      generation: result.generation,
      evidence: [
        { source: 'Structural KB · expert seed', claim: 'Small studios combine direction, production, and client management. Recommendations below are model proposals.' },
        { source: 'Project Success KB · expert seed', claim: 'Align strategy before production and require human approvals. No measured success rate is claimed.' },
        { source: 'Platform Empirical KB · no real data', claim: 'Simulated metrics do not establish performance evidence and are not supplied to the model.' }
      ] };
    renderStudio(); renderManifest(); renderProject(result.project);
    $('#artifact-title').textContent = result.sampleArtifact.title;
    $('#artifact-content').textContent = result.sampleArtifact.content;
    $('#live-artifact').hidden = false;
    $('#download-button').hidden = false;
    const { usage, model, durationMs } = result.generation;
    const receipt = `${model} · ${(durationMs / 1000).toFixed(1)}s · ${usage ? `${usage.inputTokens} input + ${usage.outputTokens} output tokens · estimated $${usage.estimatedUsd.toFixed(6)}` : 'Token usage not returned by provider'}`;
    $('#generation-receipt').textContent = receipt;
    $('#live-status').textContent = `Live compilation complete. ${receipt}. Edit the recommendations below or download the generated model. Account balance is not tracked here.`;
  } catch (error) { $('#live-status').textContent = error.name === 'TimeoutError' ? 'Request timed out. No automatic retry; try again when ready.' : error.message; }
  finally { button.disabled = false; }
});
$('#download-button').addEventListener('click', () => {
  if (!liveResult) return;
  const payload = { ...liveResult, editedStudio: studio, manifest: compileStudio(studio) };
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'agency-compiler-model.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
