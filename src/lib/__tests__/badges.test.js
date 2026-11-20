const test = require('node:test');
const assert = require('node:assert');
const { groupBadges } = require('../badges');
const { communityBuilderBadge } = require('../../data/curation');

const AWS = 'Amazon Web Services Training and Certification';
const b = (name, issuer, extra = {}) => ({
  id: name, name, issuer, issuedAt: '2024-01-01', expiresAt: null, image: null, url: 'u', ...extra,
});
const NOW = new Date('2026-06-15T00:00:00Z');
const titleOf = (groups, name) =>
  (groups.find((g) => g.badges.some((x) => x.name === name)) || {}).title;

test('classifies by issuer and name patterns', () => {
  const groups = groupBadges([
    b('AWS Certified Solutions Architect – Professional', AWS),
    b('AWS Certified Advanced Networking – Specialty', AWS),
    b('AWS Certified Developer – Associate', AWS),
    b('AWS Certified Cloud Practitioner', AWS),
    b('AWS Agentic AI Demonstrated', AWS),
    b('AWS Knowledge: Cloud Essentials - Training Badge', AWS),
    b('KCNA: Kubernetes and Cloud Native Associate', 'The Linux Foundation'),
    b('Microsoft Certified: Azure Fundamentals', 'Microsoft'),
    b('Professional Scrum Master I', 'Scrum.org'),
  ], NOW);
  assert.deepStrictEqual(groups.map((g) => g.title), [
    'AWS Professional & Specialty', 'AWS Associate', 'AWS Foundational & Training', 'Microsoft', 'Other',
  ]);
  assert.strictEqual(titleOf(groups, 'AWS Certified Solutions Architect – Professional'), 'AWS Professional & Specialty');
  assert.strictEqual(titleOf(groups, 'AWS Certified Advanced Networking – Specialty'), 'AWS Professional & Specialty');
  assert.strictEqual(titleOf(groups, 'AWS Certified Developer – Associate'), 'AWS Associate');
  assert.strictEqual(titleOf(groups, 'AWS Certified Cloud Practitioner'), 'AWS Foundational & Training');
  assert.strictEqual(titleOf(groups, 'AWS Agentic AI Demonstrated'), 'AWS Foundational & Training');
  assert.strictEqual(titleOf(groups, 'AWS Knowledge: Cloud Essentials - Training Badge'), 'AWS Foundational & Training');
  assert.strictEqual(titleOf(groups, 'KCNA: Kubernetes and Cloud Native Associate'), 'Other');
  assert.strictEqual(titleOf(groups, 'Professional Scrum Master I'), 'Other');
});

test('drops expired badges, keeps null expiry, omits empty groups', () => {
  const yesterday = new Date(NOW.getTime() - 86400000).toISOString();
  const groups = groupBadges([
    b('Old MS', 'Microsoft', { expiresAt: yesterday }),
    b('Forever', 'Scrum.org', { expiresAt: null }),
  ], NOW);
  assert.deepStrictEqual(groups.map((g) => g.title), ['Other']);
  assert.deepStrictEqual(groups[0].badges.map((x) => x.name), ['Forever']);
});

test('sorts newest first within a group', () => {
  const groups = groupBadges([
    b('older', 'Microsoft', { issuedAt: '2022-01-01' }),
    b('newer', 'Microsoft', { issuedAt: '2024-01-01' }),
  ], NOW);
  assert.deepStrictEqual(groups[0].badges.map((x) => x.name), ['newer', 'older']);
});

test('defaults now and does not mutate input', () => {
  const input = [b('x', 'Microsoft', { expiresAt: '2000-01-01' })];
  assert.deepStrictEqual(groupBadges(input), []);
  assert.strictEqual(input.length, 1);
});

test('community builder badge passed in lands in Other', () => {
  const groups = groupBadges([communityBuilderBadge], NOW);
  assert.deepStrictEqual(groups.map((g) => g.title), ['Other']);
});

test('real generated badges group sensibly', () => {
  const badges = require('../../data/generated/badges.json');
  const now = new Date();
  const groups = groupBadges(badges, now);
  const titles = groups.map((g) => g.title);
  const order = ['AWS Professional & Specialty', 'AWS Associate', 'AWS Foundational & Training', 'Microsoft', 'Other'];
  assert.deepStrictEqual(titles, order.filter((t) => titles.includes(t)));
  assert.ok(titles.includes('AWS Professional & Specialty'));
  const live = badges.filter((x) => !x.expiresAt || new Date(x.expiresAt) > now);
  assert.strictEqual(groups.reduce((n, g) => n + g.badges.length, 0), live.length);
  assert.ok(groups.every((g) => g.badges.every((x) => !x.expiresAt || new Date(x.expiresAt) > now)));
});

test('hand-set badges (Community Builder, New Voices) both land in Other and are not dropped', () => {
  const { handSetBadges, awsNewVoicesBadge } = require('../../data/curation');
  const groups = groupBadges([b('AWS Certified Cloud Practitioner', AWS), ...handSetBadges], NOW);
  const other = groups.find((g) => g.title === 'Other');
  assert.deepStrictEqual(other.badges.map((x) => x.id).sort(), handSetBadges.map((x) => x.id).sort());
  assert.strictEqual(titleOf(groups, 'AWS New Voices'), 'Other');
  assert.strictEqual(awsNewVoicesBadge.url, null);
  assert.ok(handSetBadges.every((x) => x.hideDate === true));
});
