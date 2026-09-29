import { recommendStudio, classifyProject, compileStudio, kb } from "./logic.js";

const $ = (selector) => document.querySelector(selector);
let studio = restore("agency-compiler-studio") || recommendStudio({ studioName: $("#studio-name").value, teamSize: $("#team-size").value, focus: $("#studio-focus").value });

function save() { localStorage.setItem("agency-compiler-studio", JSON.stringify(studio)); }
function restore(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } }
function escape(value) { const node = document.createElement("span"); node.textContent = value; return node.innerHTML; }
function renderStudio() {
  $("#studio-result").hidden = false;
  $("#recommendation-title").textContent = studio.pattern;
  $("#roles").innerHTML = studio.roles.map((role, index) => `<div class="role"><input aria-label="Role title" data-field="title" data-index="${index}" value="${escape(role.title)}"><select aria-label="Runtime resolution" data-field="resolution" data-index="${index}"><option ${role.resolution === "human" ? "selected" : ""}>human</option><option ${role.resolution === "human + AI copilot" ? "selected" : ""}>human + AI copilot</option><option ${role.resolution === "AI-assisted" ? "selected" : ""}>AI-assisted</option><option ${role.resolution === "external service" ? "selected" : ""}>external service</option></select><small>${escape(role.mandate)}</small><button class="delete" data-remove="${index}" aria-label="Remove ${escape(role.title)}">×</button></div>`).join("");
  $("#evidence-list").innerHTML = studio.evidence.map((item) => `<p><strong>${item.source}</strong>${item.claim}</p>`).join("");
  save();
}
function renderManifest() {
  $("#compiled-result").hidden = false;
  $("#manifest").textContent = JSON.stringify(compileStudio(studio), null, 2);
}
function renderProject() {
  const project = classifyProject($("#project-brief").value);
  $("#project-result").hidden = false;
  $("#archetype").textContent = project.label;
  $("#confidence-bar").style.width = `${project.confidence}%`;
  $("#classification-rationale").textContent = `${project.confidence}% confidence · ${project.rationale}`;
  $("#pod-list").innerHTML = project.pod.map((item) => `<li>${item}</li>`).join("");
  $("#workflow-list").innerHTML = project.workflow.map((item) => `<li>${item}</li>`).join("");
  $("#artifact-list").innerHTML = project.artifacts.map((item) => `<li>${item}</li>`).join("");
  $("#gates").innerHTML = project.gates.map((item) => `<span>Gate · ${item}</span>`).join("");
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
$("#project-button").addEventListener("click", renderProject);
$("#simulate-button").addEventListener("click", renderTelemetry);

renderStudio();
