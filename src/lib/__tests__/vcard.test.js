const test = require('node:test');
const assert = require('node:assert/strict');
const { buildVCard, escapeValue } = require('../vcard');

const base = {
  name: 'Swaroop A.S.',
  title: 'AI/ML Architect',
  email: 'me@example.com',
  phone: '+65-84116034',
  url: 'https://example.com',
  org: 'Ingram Micro',
};

test('is a vCard 3.0 that begins BEGIN:VCARD and ends END:VCARD', () => {
  const v = buildVCard(base);
  assert.ok(v.startsWith('BEGIN:VCARD\r\nVERSION:3.0\r\n'));
  assert.ok(v.trimEnd().endsWith('END:VCARD'));
  assert.ok(v.endsWith('\r\n'), 'every line ends with CRLF');
  const lines = v.trimEnd().split('\r\n');
  assert.ok(lines.includes('FN:Swaroop A.S.'));
  assert.ok(lines.includes('N:A.S.;Swaroop;;;'));
  assert.ok(lines.includes('ORG:Ingram Micro'));
  assert.ok(lines.includes('TITLE:AI/ML Architect'));
  assert.ok(lines.includes('EMAIL;TYPE=INTERNET:me@example.com'));
  assert.ok(lines.includes('TEL;TYPE=CELL:+65-84116034'));
  assert.ok(lines.includes('URL:https://example.com'));
});

test('escapes a comma in the title', () => {
  const v = buildVCard({ ...base, title: 'Architect, AI/ML' });
  assert.ok(v.includes('TITLE:Architect\\, AI/ML\r\n'));
});

test('escapes backslash, semicolon and newlines', () => {
  assert.equal(escapeValue('a\\b;c,d\ne\r\nf'), 'a\\\\b\\;c\\,d\\ne\\nf');
  const v = buildVCard({ ...base, org: 'A;B', title: 'line1\nline2' });
  assert.ok(v.includes('ORG:A\\;B\r\n'));
  assert.ok(v.includes('TITLE:line1\\nline2\r\n'));
  assert.equal(v.split('\r\n').filter((l) => l.startsWith('TITLE')).length, 1, 'no raw newline inside a value');
});

test('omits empty fields and accepts several URLs', () => {
  const v = buildVCard({ name: 'Solo', url: ['https://a.example', 'https://b.example'] });
  assert.ok(!v.includes('TITLE:'));
  assert.ok(!v.includes('EMAIL'));
  assert.ok(!v.includes('TEL'));
  assert.ok(v.includes('N:;Solo;;;'));
  assert.equal(v.split('\r\n').filter((l) => l.startsWith('URL:')).length, 2);
});
