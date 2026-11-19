// vCard 3.0 (RFC 2426) for the "Save contact" button. CommonJS for node:test.

// Text values escape backslash, comma, semicolon and newlines.
function escapeValue(v) {
  return String(v)
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\r\n|\r|\n/g, '\\n');
}

// "Swaroop A.S." -> family "A.S.", given "Swaroop". One word -> given name only.
function structuredName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return `;${escapeValue(parts[0] || '')};;;`;
  const family = parts.pop();
  return `${escapeValue(family)};${escapeValue(parts.join(' '))};;;`;
}

/** buildVCard({name, title, email, phone, url, org}) -> string; `url` may be a string or an array. */
function buildVCard({ name, title, email, phone, url, org } = {}) {
  const lines = ['BEGIN:VCARD', 'VERSION:3.0', `N:${structuredName(name)}`, `FN:${escapeValue(name || '')}`];
  if (org) lines.push(`ORG:${escapeValue(org)}`);
  if (title) lines.push(`TITLE:${escapeValue(title)}`);
  if (email) lines.push(`EMAIL;TYPE=INTERNET:${escapeValue(email)}`);
  if (phone) lines.push(`TEL;TYPE=CELL:${escapeValue(phone)}`);
  // URLs are URI values, not text: only strip characters that would break the line.
  for (const u of [].concat(url || [])) if (u) lines.push(`URL:${String(u).replace(/[\r\n]/g, '')}`);
  lines.push('END:VCARD');
  return `${lines.join('\r\n')}\r\n`;
}

module.exports = { buildVCard, escapeValue };
