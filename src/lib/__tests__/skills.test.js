const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSkillGraph, matchRolesByTech, layoutConstellation } = require('../skills');

const skills = {
  'DevOps & Cloud': { color: '#ff9900', items: ['AWS', 'Docker', 'Kubernetes'] },
  Programming: { color: '#61dafb', items: ['Python', 'Node.js', 'React Native'] },
  Backend: { color: '#68a063', items: ['Node.js', 'GraphQL'] },
};

const badges = [
  { id: 'b1', name: 'AWS Certified Solutions Architect – Professional' },
  { id: 'b2', name: 'AWS Certified Cloud Practitioner' },
  { id: 'b3', name: 'KCNA: Kubernetes and Cloud Native Associate' },
  { id: 'b4', name: 'Microsoft Certified: Azure Fundamentals' },
];
const repos = [
  { name: 'a', language: 'Python', topics: [], fork: false },
  { name: 'b', language: 'python', topics: [], fork: false },
  { name: 'c', language: 'JavaScript', topics: ['react-native', 'ble'], fork: false },
  { name: 'forked', language: 'Python', topics: [], fork: true },
];

const skillNodes = (g) => g.nodes.filter((n) => n.kind === 'skill');
const node = (g, label) => skillNodes(g).find((n) => n.label === label);

test('one node per distinct skill, linked to every category that lists it', () => {
  const g = buildSkillGraph(skills, { badges, repos });
  const labels = skillNodes(g).map((n) => n.label);
  assert.deepEqual(labels.sort(), ['AWS', 'Docker', 'GraphQL', 'Kubernetes', 'Node.js', 'Python', 'React Native'].sort());
  const nodeJs = node(g, 'Node.js');
  const targets = g.links.filter((l) => l.source === nodeJs.id).map((l) => l.target);
  assert.deepEqual(targets.sort(), ['cat:Backend', 'cat:Programming']);
  assert.equal(nodeJs.category, 'Programming', 'first listing category is the home category');
});

test('category hub nodes exist and every skill links to its category', () => {
  const g = buildSkillGraph(skills, { badges, repos });
  const hubs = g.nodes.filter((n) => n.kind === 'category').map((n) => n.id);
  assert.deepEqual(hubs, ['cat:DevOps & Cloud', 'cat:Programming', 'cat:Backend']);
  assert.ok(g.links.some((l) => l.source === node(g, 'Docker').id && l.target === 'cat:DevOps & Cloud'));
  assert.equal(g.links.length, 8);
});

test('weights come from badge and repo evidence', () => {
  const g = buildSkillGraph(skills, { badges, repos });
  assert.equal(node(g, 'AWS').weight, 2, 'two AWS badges');
  assert.equal(node(g, 'Kubernetes').weight, 1);
  assert.deepEqual(node(g, 'Kubernetes').evidence.badges, ['b3']);
  assert.equal(node(g, 'Python').weight, 2, 'two non-fork Python repos, case-insensitive language');
  assert.deepEqual(node(g, 'Python').evidence.repos, ['a', 'b']);
  assert.deepEqual(node(g, 'React Native').evidence.repos, ['c'], 'repo topic react-native matches');
});

test('a skill with no evidence gets weight 1, never 0 or an invented value', () => {
  const g = buildSkillGraph(skills, { badges, repos });
  assert.equal(node(g, 'Docker').weight, 1);
  assert.equal(node(g, 'GraphQL').weight, 1);
  assert.deepEqual(node(g, 'Docker').evidence, { badges: [], repos: [] });
  const empty = buildSkillGraph(skills, {});
  assert.ok(skillNodes(empty).every((n) => n.weight === 1));
});

test('aliases add alternative spellings and labels are split into terms', () => {
  const g = buildSkillGraph(
    { Web: { items: ['HTML5/CSS3', 'AWS (ECS, S3)'] } },
    { badges, repos: [{ name: 'h', language: 'HTML', topics: [] }], aliases: { 'HTML5/CSS3': ['HTML', 'CSS'] } }
  );
  assert.equal(node(g, 'HTML5/CSS3').weight, 1);
  assert.deepEqual(node(g, 'HTML5/CSS3').evidence.repos, ['h']);
  assert.equal(node(g, 'AWS (ECS, S3)').weight, 2, 'the AWS term inside the label matches');
});

test('terms match whole words only', () => {
  const g = buildSkillGraph({ X: { items: ['Java', 'AI'] } }, {
    badges: [{ id: 'z', name: 'AWS Certified AI Practitioner' }, { id: 'y', name: 'Agentic AI Essentials' }],
    repos: [{ name: 'js', language: 'JavaScript', topics: [] }],
  });
  assert.equal(node(g, 'Java').weight, 1);
  assert.deepEqual(node(g, 'Java').evidence.repos, []);
  assert.deepEqual(node(g, 'AI').evidence.badges, ['z', 'y']);
});

test('accepts an array of {title, items} categories too', () => {
  const g = buildSkillGraph([{ title: 'A', items: ['Python'] }], { repos });
  assert.equal(node(g, 'Python').category, 'A');
});

const experiences = [
  { company: 'Ingram Micro', technologies: ['AWS', 'GenAI'] },
  { company: 'Activate Interactive', technologies: ['aws', 'React', 'Node.js'] },
  { company: 'Infosys Limited', technologies: ['React', 'Angular'] },
];

test('matchRolesByTech is case-insensitive and keeps data order', () => {
  assert.deepEqual(matchRolesByTech(experiences, 'aws'), ['Ingram Micro', 'Activate Interactive']);
  assert.deepEqual(matchRolesByTech(experiences, 'REACT'), ['Activate Interactive', 'Infosys Limited']);
  assert.deepEqual(matchRolesByTech(experiences, ' node.js '), ['Activate Interactive']);
});

test('matchRolesByTech matches whole entries and handles empty input', () => {
  assert.deepEqual(matchRolesByTech(experiences, 'Gen'), []);
  assert.deepEqual(matchRolesByTech(experiences, ''), []);
  assert.deepEqual(matchRolesByTech(undefined, 'AWS'), []);
  assert.deepEqual(matchRolesByTech([{ company: 'X' }], 'AWS'), []);
});

test('layoutConstellation places every node deterministically inside the unit box', () => {
  const g = buildSkillGraph(skills, { badges, repos });
  const a = layoutConstellation(g);
  const b = layoutConstellation(g);
  assert.deepEqual(a, b);
  assert.equal(Object.keys(a).length, g.nodes.length);
  for (const p of Object.values(a)) {
    assert.ok(p.x >= -1 && p.x <= 1 && p.y >= -1 && p.y <= 1, JSON.stringify(p));
  }
});

test('nodeRadius grows with evidence, is positive at the floor, and is sub-linear', () => {
  const { nodeRadius, shortSkill } = require('../skills');
  assert.ok(nodeRadius(1) > 0);
  assert.ok(nodeRadius(2) > nodeRadius(1));
  assert.ok(nodeRadius(28) / nodeRadius(1) < 5, 'a 28-repo language does not swamp the rest');
  assert.equal(nodeRadius(0), nodeRadius(1));
  assert.equal(shortSkill('AWS (ECS, S3)'), 'AWS');
});
