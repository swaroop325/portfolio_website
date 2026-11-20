const GROUP_TITLES = [
  'AWS Professional & Specialty',
  'AWS Associate',
  'AWS Foundational & Training',
  'Microsoft',
  'Other',
];

const isAws = (b) => /Amazon Web Services|^AWS\b/i.test(b.issuer || '');

function classify(b) {
  if (GROUP_TITLES.includes(b.group)) return b.group;
  const name = b.name || '';
  if (/Community Builder/i.test(name)) return 'Other';
  if (isAws(b)) {
    if (/Professional|Specialty/.test(name)) return 'AWS Professional & Specialty';
    if (/Associate/.test(name)) return 'AWS Associate';
    // Practitioner, Training Badge, Demonstrated, Knowledge and any other AWS badge
    return 'AWS Foundational & Training';
  }
  if (/Microsoft/i.test(b.issuer || '')) return 'Microsoft';
  return 'Other';
}

function groupBadges(badges, now = new Date()) {
  const t = now.getTime();
  const live = badges.filter((b) => !b.expiresAt || new Date(b.expiresAt).getTime() > t);
  const buckets = new Map(GROUP_TITLES.map((title) => [title, []]));
  live.forEach((b) => buckets.get(classify(b)).push(b));
  return GROUP_TITLES
    .map((title) => ({
      title,
      badges: buckets.get(title).slice().sort((a, b) => new Date(b.issuedAt) - new Date(a.issuedAt)),
    }))
    .filter((g) => g.badges.length > 0);
}

module.exports = { groupBadges };
