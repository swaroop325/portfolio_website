const test = require('node:test');
const assert = require('node:assert');
const { parseLinkedInUrl, addLinkedInPost } = require('../linkedin');

const EMBED = 'https://www.linkedin.com/embed/feed/update/';

test('parses a /posts/ activity URL into an activity urn', () => {
  const r = parseLinkedInUrl(
    'https://www.linkedin.com/posts/swaroop-a-s-7ab296b8_aws-genai-activity-7262345678901234567-AbCd'
  );
  assert.deepStrictEqual(r, {
    urn: 'urn:li:activity:7262345678901234567',
    url: 'https://www.linkedin.com/posts/swaroop-a-s-7ab296b8_aws-genai-activity-7262345678901234567-AbCd',
    embedUrl: `${EMBED}urn:li:activity:7262345678901234567`,
  });
});

test('parses /posts/ share and ugcPost URLs', () => {
  assert.strictEqual(
    parseLinkedInUrl('https://www.linkedin.com/posts/someone_title-share-7100000000000000001-xY_z').urn,
    'urn:li:share:7100000000000000001'
  );
  assert.strictEqual(
    parseLinkedInUrl('https://www.linkedin.com/posts/someone_title-ugcPost-7100000000000000002-Qq9w').urn,
    'urn:li:ugcPost:7100000000000000002'
  );
});

test('strips tracking params and fragments from the canonical url', () => {
  const r = parseLinkedInUrl(
    'https://www.linkedin.com/posts/someone_x-activity-7262345678901234567-AbCd/?utm_source=share&utm_medium=member_desktop&rcm=ACoAA#comments'
  );
  assert.strictEqual(r.urn, 'urn:li:activity:7262345678901234567');
  assert.strictEqual(r.url, 'https://www.linkedin.com/posts/someone_x-activity-7262345678901234567-AbCd');
});

test('parses /feed/update/ URLs, plain and percent-encoded', () => {
  const plain = parseLinkedInUrl('https://www.linkedin.com/feed/update/urn:li:activity:7262345678901234567/?trk=x');
  assert.deepStrictEqual(plain, {
    urn: 'urn:li:activity:7262345678901234567',
    url: 'https://www.linkedin.com/feed/update/urn:li:activity:7262345678901234567/',
    embedUrl: `${EMBED}urn:li:activity:7262345678901234567`,
  });
  assert.strictEqual(
    parseLinkedInUrl('https://linkedin.com/feed/update/urn%3Ali%3Ashare%3A7100000000000000001').urn,
    'urn:li:share:7100000000000000001'
  );
});

test('accepts an embed URL and a mobile/country subdomain', () => {
  assert.strictEqual(
    parseLinkedInUrl('https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7100000000000000002?compact=1').urn,
    'urn:li:ugcPost:7100000000000000002'
  );
  assert.strictEqual(
    parseLinkedInUrl('https://sg.linkedin.com/posts/someone_x-activity-7262345678901234567-AbCd').urn,
    'urn:li:activity:7262345678901234567'
  );
});

test('accepts a bare urn', () => {
  assert.deepStrictEqual(parseLinkedInUrl('  urn:li:share:7100000000000000001 '), {
    urn: 'urn:li:share:7100000000000000001',
    url: 'https://www.linkedin.com/feed/update/urn:li:share:7100000000000000001/',
    embedUrl: `${EMBED}urn:li:share:7100000000000000001`,
  });
});

test('returns null for garbage and non-post URLs', () => {
  const bad = [
    undefined,
    null,
    42,
    '',
    'not a url',
    'urn:li:person:123',
    'urn:li:activity:abc',
    'https://www.linkedin.com/in/swaroop-a-s-7ab296b8/',
    'https://www.linkedin.com/posts/someone_title-no-id-here',
    'https://www.linkedin.com/feed/',
    'https://evil.example.com/posts/someone_x-activity-7262345678901234567-AbCd',
    'https://linkedin.com.evil.example/feed/update/urn:li:activity:7262345678901234567',
    'javascript:alert(1)',
    'ftp://www.linkedin.com/feed/update/urn:li:activity:7262345678901234567',
  ];
  for (const input of bad) assert.strictEqual(parseLinkedInUrl(input), null, String(input));
});

test('addLinkedInPost appends a parsed post and keeps a note', () => {
  const r = addLinkedInPost([], 'https://www.linkedin.com/feed/update/urn:li:activity:1234567890123/', 'Bedrock talk');
  assert.strictEqual(r.added, true);
  assert.deepStrictEqual(r.list, [
    { urn: 'urn:li:activity:1234567890123', url: 'https://www.linkedin.com/feed/update/urn:li:activity:1234567890123/', note: 'Bedrock talk' },
  ]);
});

test('addLinkedInPost dedupes by urn and refuses invalid input without mutating', () => {
  const list = [{ urn: 'urn:li:activity:1234567890123', url: 'https://www.linkedin.com/feed/update/urn:li:activity:1234567890123/' }];
  const dup = addLinkedInPost(list, 'https://www.linkedin.com/posts/x_y-activity-1234567890123-abcd?utm_source=share');
  assert.strictEqual(dup.added, false);
  assert.match(dup.reason, /already/i);
  assert.strictEqual(dup.list, list);

  const bad = addLinkedInPost(list, 'https://example.com');
  assert.strictEqual(bad.added, false);
  assert.match(bad.reason, /not a linkedin post/i);
  assert.strictEqual(list.length, 1);
});
