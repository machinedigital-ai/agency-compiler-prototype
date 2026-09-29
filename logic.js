export const kb = {
  structural: {
    entertainment: {
      pattern: "CD-led boutique studio",
      roles: [
        ["Creative Director", "human + AI copilot", "Creative direction & final quality"],
        ["Producer / Project Lead", "human", "Client rhythm, scope & approvals"],
        ["Art Director", "human + AI copilot", "Key art, visual systems & continuity"],
        ["Production Assistant", "AI-assisted", "Research, scheduling & deliverable prep"]
      ],
      capabilities: ["Creative direction", "Visual development", "Production planning", "Client approvals", "Reference research"]
    }
  },
  project: {
    trailer: {
      label: "Trailer Campaign",
      confidence: 92,
      rationale: "The brief signals a time-based entertainment launch with trailer, cutdowns, and campaign assets.",
      pod: ["Project Lead", "Creative Director", "Art Director", "Trailer Editor", "Motion / Finishing", "Research + Asset Ops"],
      workflow: ["Brief alignment", "Audience + reference research", "Narrative / cut strategy", "Visual development", "Edit + sound pass", "Client review", "Versioning + delivery"],
      artifacts: ["Campaign strategy one-pager", "Reference board", "Trailer cut map", "Key art frames", "Master trailer", "15s / 30s cutdowns", "Delivery manifest"],
      gates: ["Strategy approved", "Creative route selected", "Picture lock", "Final delivery approved"]
    }
  },
  empirical: {
    trailer: { onTime: 89, firstReview: 81, revisions: 1.6, note: "Small entertainment teams with a dedicated strategy gate show fewer major revision rounds in this seeded platform sample." }
  }
};

export function recommendStudio({ studioName, teamSize, focus }) {
  const source = kb.structural.entertainment;
  const roles = source.roles.map(([title, resolution, mandate], index) => ({ id: `${index}-${title}`, title, resolution, mandate }));
  return {
    studioName: studioName.trim() || "Untitled Entertainment Studio",
    teamSize: Number(teamSize) || 3,
    focus: focus.trim() || "Entertainment creative and trailer campaigns",
    pattern: source.pattern,
    roles,
    capabilities: source.capabilities,
    evidence: [
      { source: "Structural KB", claim: "A CD-led model keeps a small entertainment studio creatively coherent while combining operational coverage." },
      { source: "Project Success KB", claim: "Trailer campaigns benefit from early narrative and reference alignment before production." },
      { source: "Platform Empirical KB", claim: kb.empirical.trailer.note }
    ]
  };
}

export function classifyProject(brief) {
  const text = brief.toLowerCase();
  const terms = ["trailer", "film", "teaser", "cutdown", "entertainment", "launch"];
  const matches = terms.filter((term) => text.includes(term)).length;
  const archetype = kb.project.trailer;
  return { ...archetype, confidence: Math.min(98, archetype.confidence + Math.max(0, matches - 2) * 2) };
}

export function compileStudio(studio) {
  return {
    id: `studio-model-${studio.studioName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "untitled"}-v1`,
    version: "1.0.0",
    privacy: "private",
    model: studio.studioName,
    instance: `${studio.studioName} / demo instance`,
    capabilities: [...new Set([...studio.capabilities, ...studio.roles.map(({ title }) => title)])],
    resolutions: studio.roles.map(({ title, resolution }) => ({ capability: title, resolution })),
    approvals: ["Creative Director", "Producer / Project Lead"],
    knowledgeScopes: ["Structural KB", "Project Success KB", "Platform Empirical KB (anonymized)"]
  };
}

if (typeof process !== "undefined" && process.argv[1]?.endsWith("logic.js")) {
  const studio = recommendStudio({ studioName: "Northstar", teamSize: 3, focus: "Trailers" });
  const project = classifyProject("Launch trailer with 30 second cutdowns");
  const compiled = compileStudio(studio);
  console.assert(studio.roles.length === 4, "expected default studio roles");
  console.assert(project.label === "Trailer Campaign", "expected trailer classification");
  console.assert(compiled.resolutions.every((item) => item.resolution), "capability resolution required");
  console.log("logic checks passed");
}
