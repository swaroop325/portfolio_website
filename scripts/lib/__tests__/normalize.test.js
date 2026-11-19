const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { normalizeBadges, normalizeRepos, normalizePosts, mergePosts } = require('../normalize');

const fx = name => fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');
const credly = JSON.parse(fx('credly.json'));
const repos = JSON.parse(fx('github-repos.json'));
const medium = fx('medium.xml');
const devto = JSON.parse(fx('devto.json'));

test('normalizeBadges maps the Credly fixture', () => {
  const badges = normalizeBadges(credly);
  assert.strictEqual(badges.length, 30);
  assert.strictEqual(badges[0].name, 'AWS Partner: Forward Deployed Engineer (FDE) - Validated');
  assert.strictEqual(badges[0].issuedAt, '2026-11-12');
  assert.strictEqual(badges[0].issuer, 'Amazon Web Services Training and Certification');
  assert.ok(badges[0].image.startsWith('https://'));
  assert.ok(badges[0].url.startsWith('https://'));
  assert.ok(badges[0].id);
});

test('normalizeBadges sets expiresAt null when no expiry', () => {
  const raw = { data: [{ ...credly.data[0], expires_at_date: null }] };
  assert.strictEqual(normalizeBadges(raw)[0].expiresAt, null);
  assert.strictEqual(normalizeBadges(credly)[0].expiresAt, '2027-11-12');
});

test('normalizeBadges handles empty or missing data', () => {
  assert.deepStrictEqual(normalizeBadges({ data: [] }), []);
  assert.deepStrictEqual(normalizeBadges(null), []);
});

test('normalizeRepos maps stargazers_count to stars', () => {
  const out = normalizeRepos(repos);
  assert.strictEqual(out.length, repos.length);
  assert.strictEqual(out[0].stars, repos[0].stargazers_count);
  assert.strictEqual(out[0].url, repos[0].html_url);
  assert.strictEqual(out[0].pushedAt, repos[0].pushed_at);
  assert.ok(Array.isArray(out[0].topics));
  assert.deepStrictEqual(normalizeRepos(null), []);
});

test('normalizePosts merges sources newest first', () => {
  const posts = normalizePosts(medium, devto);
  assert.ok(posts.length >= 2);
  assert.deepStrictEqual(new Set(posts.map(p => p.source)), new Set(['medium', 'devto']));
  for (let i = 1; i < posts.length; i++) {
    assert.ok(new Date(posts[i - 1].date) >= new Date(posts[i].date));
  }
  const m = posts.find(p => p.source === 'medium');
  for (const p of posts) {
    assert.ok(p.image === null || !p.image.includes('/_/stat'), 'tracking pixel leaked');
  }
  assert.ok(m.image === null || m.image.includes('cdn-images'));
  assert.ok(m.excerpt.length > 0 && !m.excerpt.includes('<'));
});

test('normalizePosts decodes entities and nulls missing images', () => {
  const xml = `<rss><channel><item><title><![CDATA[Tom &amp; Jerry&#39;s &quot;Plan&quot;]]></title>
<link>https://medium.com/p/1?source=rss</link><pubDate>Tue, 17 Nov 2026 09:17:34 GMT</pubDate>
<content:encoded><![CDATA[<p>No image here</p>]]></content:encoded></item></channel></rss>`;
  const dev = [{ title: 'A &amp; B', url: 'https://dev.to/x', description: 'd', published_at: '2026-11-18T07:39:57Z', cover_image: null, social_image: null }];
  const posts = normalizePosts(xml, dev);
  assert.strictEqual(posts[0].source, 'devto');
  assert.strictEqual(posts[0].title, 'A & B');
  assert.strictEqual(posts[0].image, null);
  assert.strictEqual(posts[1].title, 'Tom & Jerry\'s "Plan"');
  assert.strictEqual(posts[1].image, null);
});

test('normalizePosts tolerates empty input', () => {
  assert.deepStrictEqual(normalizePosts('', []), []);
  assert.deepStrictEqual(normalizePosts(null, null), []);
});

test('normalizePosts skips Medium tracking pixels', () => {
  const xml = `<rss><channel><item><title>T</title><link>https://medium.com/p/1</link>
<pubDate>Tue, 17 Nov 2026 09:17:34 GMT</pubDate><content:encoded><![CDATA[<img src="https://medium.com/_/stat?event=x" width="1"><img src="https://cdn-images-1.medium.com/max/1/a.png">]]></content:encoded></item>
<item><title>U</title><link>https://medium.com/p/2</link><pubDate>Tue, 16 Nov 2026 09:17:34 GMT</pubDate>
<content:encoded><![CDATA[<img src="https://medium.com/_/stat?event=y">]]></content:encoded></item></channel></rss>`;
  const [a, b] = normalizePosts(xml, []);
  assert.strictEqual(a.image, 'https://cdn-images-1.medium.com/max/1/a.png');
  assert.strictEqual(b.image, null);
});

const P = (source, date, title = source + date) => ({ title, url: 'https://x/' + title, date, source, image: null, excerpt: '' });

test('mergePosts keeps existing Medium posts when Medium fails', () => {
  const existing = [P('medium', '2026-01-01'), P('devto', '2026-02-01')];
  const fresh = [P('devto', '2026-03-01')];
  const out = mergePosts(fresh, existing, ['medium']);
  assert.deepStrictEqual(out.map(p => p.date), ['2026-03-01', '2026-01-01']);
  assert.ok(out.some(p => p.source === 'medium'));
});

test('mergePosts keeps existing dev.to posts when dev.to fails', () => {
  const existing = [P('medium', '2026-01-01'), P('devto', '2026-02-01')];
  const fresh = [P('medium', '2026-03-01')];
  const out = mergePosts(fresh, existing, ['devto']);
  assert.deepStrictEqual(out.map(p => p.source), ['medium', 'devto']);
  assert.strictEqual(out[1].date, '2026-02-01');
});

test('mergePosts with nothing failed returns fresh only', () => {
  const out = mergePosts([P('medium', '2026-03-01')], [P('devto', '2026-02-01')], []);
  assert.strictEqual(out.length, 1);
});

test('mergePosts returns empty (no write) when both sources fail', () => {
  const existing = [P('medium', '2026-01-01'), P('devto', '2026-02-01')];
  assert.deepStrictEqual(mergePosts([], existing, ['medium', 'devto']), []);
});
