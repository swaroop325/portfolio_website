// Truthful wording for badge sources. CommonJS so node:test can load it.
const isCredly = (b) => /credly\.com/.test(b.url || '');

// Footer label of the share card. `badges` is a flat list.
function sourceLabel(badges) {
  const off = badges.filter((b) => !isCredly(b));
  if (off.length === 0) return 'Verified on Credly';
  const programmes = off.every((b) => /Community Builder|New Voices/i.test(b.name));
  if (!programmes) return `${badges.length - off.length} on Credly + ${off.length} more`;
  const names = off.map((b) => (/Community Builder/i.test(b.name) ? 'AWS Community Builder' : /New Voices/i.test(b.name) ? 'AWS New Voices' : b.name));
  const joined = names.length > 1 ? 'AWS programme badges' : names[0];
  return off.length === badges.length ? joined : `Credly + ${joined}`;
}

module.exports = { sourceLabel, isCredly };
