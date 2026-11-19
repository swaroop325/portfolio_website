const test = require('node:test');
const assert = require('node:assert');
const { filterGroups, parseFilter, serializeFilter, filterNoun } = require('../badgeFilter');

const g = (title, n) => ({ title, badges: Array.from({ length: n }, (_, i) => ({ id: `${title}-${i}` })) });
const groups = [
  g('AWS Professional & Specialty', 2),
  g('AWS Associate', 3),
  g('AWS Foundational & Training', 4),
  g('Microsoft', 1),
  g('Other', 1),
];
const titles = (gs) => gs.map((x) => x.title);

test('aws keeps exactly the three AWS groups', () => {
  assert.deepStrictEqual(titles(filterGroups(groups, { vendor: 'aws' })), [
    'AWS Professional & Specialty', 'AWS Associate', 'AWS Foundational & Training',
  ]);
});
test('aws + level narrows to one group', () => {
  assert.deepStrictEqual(titles(filterGroups(groups, { vendor: 'aws', level: 'professional' })), ['AWS Professional & Specialty']);
  assert.deepStrictEqual(titles(filterGroups(groups, { vendor: 'aws', level: 'associate' })), ['AWS Associate']);
  assert.deepStrictEqual(titles(filterGroups(groups, { vendor: 'aws', level: 'foundational' })), ['AWS Foundational & Training']);
});
test('level is ignored unless vendor is aws', () => {
  assert.deepStrictEqual(titles(filterGroups(groups, { vendor: 'microsoft', level: 'associate' })), ['Microsoft']);
  assert.deepStrictEqual(titles(filterGroups(groups, { vendor: 'other', level: 'associate' })), ['Other']);
});
test('all and unknown vendor return everything', () => {
  assert.strictEqual(filterGroups(groups, { vendor: 'all' }), groups);
  assert.deepStrictEqual(filterGroups(groups, { vendor: 'nope' }), groups);
  assert.deepStrictEqual(filterGroups(groups), groups);
});
test('unknown level on aws means all AWS', () => {
  assert.strictEqual(filterGroups(groups, { vendor: 'aws', level: 'zzz' }).length, 3);
});
test('parseFilter', () => {
  assert.deepStrictEqual(parseFilter('#badges?filter=aws'), { vendor: 'aws', level: 'all' });
  assert.deepStrictEqual(parseFilter('#badges?filter=aws&level=professional'), { vendor: 'aws', level: 'professional' });
  assert.deepStrictEqual(parseFilter('#badges?filter=microsoft&level=associate'), { vendor: 'microsoft', level: 'all' });
  for (const bad of ['', '#', '#badges', '#badges?filter=%E0%A4%A', '#badges?filter=evil', '#badges?filter=aws&level=x', null, undefined, 42, '?&&=']) {
    const r = parseFilter(bad);
    assert.ok(r.vendor === 'all' || r.vendor === 'aws');
    if (r.vendor === 'all') assert.deepStrictEqual(r, { vendor: 'all', level: 'all' });
  }
  assert.deepStrictEqual(parseFilter('#badges?filter=evil'), { vendor: 'all', level: 'all' });
  assert.deepStrictEqual(parseFilter('#badges?filter=aws&level=x'), { vendor: 'aws', level: 'all' });
  assert.deepStrictEqual(parseFilter(null), { vendor: 'all', level: 'all' });
});
test('serializeFilter and round trip', () => {
  assert.strictEqual(serializeFilter({ vendor: 'all', level: 'all' }), '');
  assert.strictEqual(serializeFilter({ vendor: 'aws', level: 'all' }), 'filter=aws');
  assert.strictEqual(serializeFilter({ vendor: 'aws', level: 'professional' }), 'filter=aws&level=professional');
  assert.strictEqual(serializeFilter({ vendor: 'microsoft', level: 'associate' }), 'filter=microsoft');
  for (const f of [{ vendor: 'aws', level: 'associate' }, { vendor: 'other', level: 'all' }, { vendor: 'all', level: 'all' }]) {
    assert.deepStrictEqual(parseFilter(`#badges?${serializeFilter(f)}`), f);
  }
});
test('filterNoun', () => {
  assert.strictEqual(filterNoun({ vendor: 'all' }), 'credentials');
  assert.strictEqual(filterNoun({ vendor: 'aws', level: 'all' }), 'AWS credentials');
  assert.strictEqual(filterNoun({ vendor: 'aws', level: 'associate' }), 'AWS Associate credentials');
  assert.strictEqual(filterNoun({ vendor: 'microsoft' }), 'Microsoft credentials');
});
