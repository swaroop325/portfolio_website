// Pure helpers for the Skills and Experience sections. CommonJS so node:test
// can load them; no React, no DOM.
//
// Weights are evidence only: how many active badges and non-fork repos match
// a skill. There are deliberately no self-rated levels anywhere in here.

const norm = (s) => String(s == null ? '' : s).trim().toLowerCase();
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// "AWS (ECS, S3)" -> ["AWS (ECS, S3)", "AWS", "ECS", "S3"]; "HTML5/CSS3" -> [.., "HTML5", "CSS3"].
function termsFor(label, aliases) {
  const parts = String(label)
    .split(/[/(),]/)
    .map((t) => t.trim())
    .filter(Boolean);
  const extra = (aliases && aliases[label]) || [];
  return [...new Set([label, ...parts, ...extra].map(norm).filter(Boolean))];
}

// Whole-word, case-insensitive: "AI" matches "Certified AI Practitioner",
// "Java" does not match "JavaScript".
function mentions(text, term) {
  const re = new RegExp(`(^|[^a-z0-9+#])${escapeRe(term)}($|[^a-z0-9+#])`, 'i');
  return re.test(String(text || ''));
}

// Repo evidence is the language or a topic (topics are kebab-case, so
// "react-native" counts for "React Native"). Forks are not the owner's work.
function repoMatches(repo, terms) {
  if (!repo || repo.fork) return false;
  const lang = norm(repo.language);
  const topics = (repo.topics || []).map((t) => norm(t).replace(/-/g, ' '));
  return terms.some((t) => t === lang || topics.includes(t.replace(/-/g, ' ')));
}

function toCategories(skills) {
  if (Array.isArray(skills)) return skills.map((c) => ({ title: c.title, color: c.color, items: c.items || [] }));
  return Object.keys(skills || {}).map((title) => ({ title, color: skills[title].color, items: skills[title].items || [] }));
}

const catId = (title) => `cat:${title}`;
const skillId = (label) => `skill:${norm(label)}`;

/**
 * buildSkillGraph(skills, {badges, repos, aliases}) -> {nodes, links}
 * skills: {[category]: {color, items: string[]}} or [{title, color, items}].
 * nodes: category hubs ({kind:'category'}) then one node per distinct skill
 *   ({kind:'skill', weight, evidence: {badges: id[], repos: name[]}}).
 * links: {source: skillId, target: categoryId} for every category listing it.
 */
function buildSkillGraph(skills, { badges = [], repos = [], aliases = {} } = {}) {
  const cats = toCategories(skills);
  const hubs = cats.map((c) => ({ id: catId(c.title), label: c.title, category: c.title, kind: 'category', color: c.color }));
  const byId = new Map();
  const links = [];

  for (const c of cats) {
    for (const label of c.items) {
      const id = skillId(label);
      if (!byId.has(id)) {
        const terms = termsFor(label, aliases);
        const evidence = {
          badges: badges.filter((b) => terms.some((t) => mentions(b.name, t))).map((b) => b.id),
          repos: repos.filter((r) => repoMatches(r, terms)).map((r) => r.name),
        };
        const count = evidence.badges.length + evidence.repos.length;
        byId.set(id, { id, label, category: c.title, kind: 'skill', weight: Math.max(1, count), evidence });
      }
      const link = { source: id, target: catId(c.title) };
      if (!links.some((l) => l.source === link.source && l.target === link.target)) links.push(link);
    }
  }

  // Hub weight is the sum of its home skills (presentation only).
  for (const h of hubs) {
    h.weight = [...byId.values()].filter((n) => n.category === h.category).reduce((s, n) => s + n.weight, 0) || 1;
  }
  return { nodes: [...hubs, ...byId.values()], links };
}

/** Company names whose `technologies` include `tech` (case-insensitive, whole entry), in data order. */
function matchRolesByTech(experiences, tech) {
  const want = norm(tech);
  if (!want || !Array.isArray(experiences)) return [];
  const out = [];
  for (const e of experiences) {
    if ((e.technologies || []).some((t) => norm(t) === want) && !out.includes(e.company)) out.push(e.company);
  }
  return out;
}

// Small deterministic hash -> [0, 1) so layouts are identical on server and client.
function unit(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

/**
 * layoutConstellation(graph) -> {[nodeId]: {x, y, z, lx, ly}} with x, y in [-1, 1].
 * Hubs sit on a ring; each hub's skills fan OUTWARD from it on two alternating
 * radii so clusters read as separate constellations. (lx, ly) is a unit
 * direction for placing the node's label: skills label away from their hub,
 * hubs label toward the centre.
 */
function layoutConstellation(graph) {
  const hubs = graph.nodes.filter((n) => n.kind === 'category');
  const pos = {};
  const R = 0.58;
  hubs.forEach((h, i) => {
    // Offset half a step so one hub sits at the bottom and two share the top.
    const n = Math.max(1, hubs.length);
    const a = -Math.PI / 2 + Math.PI / n + (i / n) * Math.PI * 2;
    pos[h.id] = { x: Math.cos(a) * R, y: Math.sin(a) * R, z: 0, lx: -Math.cos(a), ly: -Math.sin(a), angle: a };
  });
  const clamp = (v) => Math.max(-1, Math.min(1, v));
  for (const h of hubs) {
    const members = graph.nodes.filter((n) => n.kind === 'skill' && n.category === h.category);
    const { x, y, angle } = pos[h.id];
    const spread = Math.min(2.0, 0.3 * members.length);
    members.forEach((m, j) => {
      const t = members.length === 1 ? 0 : j / (members.length - 1) - 0.5;
      const a = angle + t * spread;
      const r = (j % 2 ? 0.46 : 0.3) + 0.03 * unit(m.id);
      pos[m.id] = {
        x: clamp(x + Math.cos(a) * r),
        y: clamp(y + Math.sin(a) * r),
        z: (unit(`${m.id}z`) - 0.5) * 0.9,
        lx: Math.cos(a),
        ly: Math.sin(a),
      };
    });
  }
  for (const id of Object.keys(pos)) delete pos[id].angle;
  return pos;
}

// Presentation helpers shared by the 2D and 3D constellations.
// Radius grows with log2 of the evidence so one 28-repo language does not swamp the rest.
const nodeRadius = (weight) => 0.03 + 0.016 * Math.log2(Math.max(1, weight) + 1);
const shortSkill = (label) => String(label).replace(/ \(.*\)$/, '');

module.exports = { buildSkillGraph, matchRolesByTech, layoutConstellation, nodeRadius, shortSkill };
