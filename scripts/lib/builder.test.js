const test = require('node:test');
const assert = require('node:assert');
const { parseBuilderEntry, parseBuilderPage } = require('./builder');

test('accepts only https builder.aws.com content urls', () => {
  assert.ok(parseBuilderEntry('https://builder.aws.com/content/3MMCO02e5UFoUdoOVkxZ8trB9Vz/some-slug'));
  assert.equal(parseBuilderEntry('http://builder.aws.com/content/abc'), null);
  assert.equal(parseBuilderEntry('https://evil.com/content/abc'), null);
  assert.equal(parseBuilderEntry('https://builder.aws.com/community/@x'), null);
  assert.equal(parseBuilderEntry(42), null);
});
test('keeps a valid date and drops a bad one', () => {
  assert.equal(parseBuilderEntry({ url: 'https://builder.aws.com/content/abc', date: '2026-05-01' }).date, '2026-05-01T00:00:00.000Z');
  assert.equal(parseBuilderEntry({ url: 'https://builder.aws.com/content/abc', date: 'nope' }).date, '');
});
test('reads og meta, strips the site suffix, ignores the generic card image', () => {
  const html = '<meta property="og:title" content="A &amp; B | AWS Builder Center"/><meta property="og:description" content="Desc"/><meta property="og:image" content="https://builder.aws.com/assets/og-x.png"/>';
  const p = parseBuilderPage(html, parseBuilderEntry('https://builder.aws.com/content/abc'));
  assert.equal(p.title, 'A & B');
  assert.equal(p.excerpt, 'Desc');
  assert.equal(p.image, '');
  assert.equal(p.source, 'builder');
});
test('no title means no post', () => {
  assert.equal(parseBuilderPage('<html></html>', parseBuilderEntry('https://builder.aws.com/content/abc')), null);
});
