const test = require('node:test');
const assert = require('node:assert');
const { curateRepos } = require('../repos');

const r = (name, extra = {}) => ({
  name, description: 'd', language: 'JS', stars: 0, url: 'u', fork: false,
  pushedAt: '2024-01-01', topics: [], ...extra,
});
const cur = (o = {}) => ({ pinned: [], deny: [], overrides: {}, ...o });

test('drops forks and null-description repos', () => {
  const out = curateRepos([r('a'), r('fork', { fork: true }), r('nodesc', { description: null })], cur());
  assert.deepStrictEqual(out.map((x) => x.name), ['a']);
});

test('applies overrides, which also rescues null descriptions', () => {
  const out = curateRepos(
    [r('a', { description: 'old' }), r('b', { description: null })],
    cur({ overrides: { a: { description: 'new' }, b: { description: 'given' } } }),
  );
  const by = Object.fromEntries(out.map((x) => [x.name, x.description]));
  assert.deepStrictEqual(by, { a: 'new', b: 'given' });
});

test('pinned first in pinned order, then pushedAt desc, deny excluded', () => {
  const out = curateRepos(
    [r('x', { pushedAt: '2020-01-01' }), r('new', { pushedAt: '2025-01-01' }), r('mid', { pushedAt: '2023-01-01' }), r('bad'), r('p1'), r('p2')],
    cur({ pinned: ['p2', 'p1', 'missing'], deny: ['bad'] }),
  );
  assert.deepStrictEqual(out.map((x) => x.name), ['p2', 'p1', 'new', 'mid', 'x']);
});

test('caps at 9', () => {
  const repos = Array.from({ length: 15 }, (_, i) => r('r' + i, { pushedAt: `2024-01-${String(i + 1).padStart(2, '0')}` }));
  assert.strictEqual(curateRepos(repos, cur()).length, 9);
});

test('real curation denies profile/site repos and describes every pinned repo it overrides', () => {
  const { curation } = require('../../data/curation');
  assert.ok(curation.deny.includes('swaroop325') && curation.deny.includes('portfolio_website'));
  for (const [name, o] of Object.entries(curation.overrides)) {
    assert.ok(curation.pinned.includes(name) && o.description.length <= 115, name);
  }
  const out = curateRepos([r('swaroop325'), r('portfolio_website'), r('llmonaws', { description: null })], curation);
  assert.deepStrictEqual(out.map((x) => x.name), ['llmonaws']);
});
