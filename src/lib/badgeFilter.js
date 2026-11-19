const VENDORS = ['all', 'aws', 'microsoft', 'other'];
const LEVELS = {
  professional: 'AWS Professional & Specialty',
  associate: 'AWS Associate',
  foundational: 'AWS Foundational & Training',
};
const ALL = { vendor: 'all', level: 'all' };

function normalize(filter) {
  const vendor = filter && VENDORS.includes(filter.vendor) ? filter.vendor : 'all';
  const level = vendor === 'aws' && filter && Object.prototype.hasOwnProperty.call(LEVELS, filter.level) ? filter.level : 'all';
  return { vendor, level };
}

function filterGroups(groups, filter) {
  const { vendor, level } = normalize(filter);
  if (vendor === 'all') return groups;
  if (vendor === 'aws') {
    return groups.filter((g) => (level === 'all' ? g.title.startsWith('AWS') : g.title === LEVELS[level]));
  }
  return groups.filter((g) => g.title === (vendor === 'microsoft' ? 'Microsoft' : 'Other'));
}

function parseFilter(hash) {
  if (typeof hash !== 'string') return { ...ALL };
  const q = hash.indexOf('?');
  if (q === -1) return { ...ALL };
  try {
    const p = new URLSearchParams(hash.slice(q + 1));
    return normalize({ vendor: p.get('filter'), level: p.get('level') });
  } catch (e) {
    return { ...ALL };
  }
}

function serializeFilter(filter) {
  const { vendor, level } = normalize(filter);
  if (vendor === 'all') return '';
  return level === 'all' ? `filter=${vendor}` : `filter=${vendor}&level=${level}`;
}

// Noun phrase for the share card header, e.g. "AWS credentials".
function filterNoun(filter) {
  const { vendor, level } = normalize(filter);
  if (vendor === 'all') return 'credentials';
  if (vendor === 'aws') return level === 'all' ? 'AWS credentials' : `${LEVELS[level]} credentials`;
  return vendor === 'microsoft' ? 'Microsoft credentials' : 'other credentials';
}

module.exports = { filterGroups, parseFilter, serializeFilter, filterNoun, LEVELS };
