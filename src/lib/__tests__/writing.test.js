const test = require('node:test');
const assert = require('node:assert');
const { formatDateUTC, latestPosts, availableFilters, validLinkedIn, hasWriting } = require('../writing');

const post = (source, date, title = `${source}-${date}`) => ({ title, url: `https://x/${title}`, date, source, image: null, excerpt: '' });

test('formatDateUTC is deterministic in UTC and tolerates bad input', () => {
  assert.strictEqual(formatDateUTC('2026-11-18T23:59:59.000Z'), 'Nov 18, 2026');
  assert.strictEqual(formatDateUTC('2026-01-01T00:00:00.000Z'), 'Jan 1, 2026');
  assert.strictEqual(formatDateUTC('nope'), '');
  assert.strictEqual(formatDateUTC(undefined), '');
});

test('latestPosts sorts newest first, filters by source and caps at the limit', () => {
  const posts = [post('medium', '2025-01-01'), post('devto', '2026-02-01'), post('medium', '2026-03-01')];
  assert.deepStrictEqual(latestPosts(posts, 'all').map((p) => p.date), ['2026-03-01', '2026-02-01', '2025-01-01']);
  assert.deepStrictEqual(latestPosts(posts, 'medium').map((p) => p.date), ['2026-03-01', '2025-01-01']);
  assert.deepStrictEqual(latestPosts(posts, 'devto').length, 1);
  assert.deepStrictEqual(latestPosts(posts, 'linkedin'), []);
  const many = Array.from({ length: 9 }, (_, i) => post('medium', `2026-0${i + 1}-01`));
  assert.strictEqual(latestPosts(many, 'all').length, 6);
  assert.strictEqual(latestPosts(many, 'all', 3).length, 3);
  assert.deepStrictEqual(latestPosts(undefined, 'all'), []);
});

test('validLinkedIn keeps only entries with a usable urn', () => {
  const list = [
    { urn: 'urn:li:activity:1234567890123', url: 'https://www.linkedin.com/feed/update/urn:li:activity:1234567890123/' },
    { urn: 'urn:li:person:1' },
    { url: 'https://www.linkedin.com/posts/x' },
    null,
  ];
  const out = validLinkedIn(list);
  assert.strictEqual(out.length, 1);
  assert.strictEqual(out[0].embedUrl, 'https://www.linkedin.com/embed/feed/update/urn:li:activity:1234567890123');
  assert.deepStrictEqual(validLinkedIn(undefined), []);
});

test('availableFilters hides sources with nothing to show', () => {
  const li = [{ urn: 'urn:li:share:1234567890123' }];
  assert.deepStrictEqual(availableFilters([post('medium', '2026-01-01')], []).map((f) => f.id), ['all', 'medium']);
  assert.deepStrictEqual(
    availableFilters([post('medium', '2026-01-01'), post('devto', '2026-01-01')], li).map((f) => f.id),
    ['all', 'medium', 'devto', 'linkedin']
  );
});

test('hasWriting is false only when there is nothing at all', () => {
  assert.strictEqual(hasWriting([], []), false);
  assert.strictEqual(hasWriting([], [{ urn: 'bad' }]), false);
  assert.strictEqual(hasWriting([post('medium', '2026-01-01')], []), true);
  assert.strictEqual(hasWriting([], [{ urn: 'urn:li:share:1234567890123' }]), true);
});

test('validLinkedIn always uses the url rebuilt from the validated urn', () => {
  const [item] = validLinkedIn([{ urn: 'urn:li:activity:1234567890123', url: 'javascript:alert(1)' }]);
  assert.match(item.url, /^https:\/\/www\.linkedin\.com\//);
});
