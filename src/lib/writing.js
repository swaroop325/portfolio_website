// Pure helpers for the Writing section. CommonJS so node:test can load it.
const { parseLinkedInUrl } = require('../../scripts/lib/linkedin');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DEFAULT_LIMIT = 6;

// Formatted by hand in UTC so the server render and the browser always agree.
function formatDateUTC(iso) {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return '';
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

const time = (p) => {
  const t = new Date(p.date).getTime();
  return Number.isNaN(t) ? 0 : t;
};

function latestPosts(posts, filter = 'all', limit = DEFAULT_LIMIT) {
  if (!Array.isArray(posts) || filter === 'linkedin') return [];
  return posts
    .filter((p) => p && (filter === 'all' || p.source === filter))
    .slice()
    .sort((a, b) => time(b) - time(a))
    .slice(0, limit);
}

function validLinkedIn(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((p) => p && typeof p.urn === 'string')
    .map((p) => {
      const parsed = parseLinkedInUrl(p.urn);
      return parsed ? { ...p, urn: parsed.urn, url: parsed.url, embedUrl: parsed.embedUrl } : null;
    })
    .filter(Boolean);
}

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'medium', label: 'Medium' },
  { id: 'devto', label: 'dev.to' },
  { id: 'builder', label: 'AWS Builder' },
  { id: 'linkedin', label: 'LinkedIn' },
];

function availableFilters(posts, linkedin) {
  const list = Array.isArray(posts) ? posts : [];
  const counts = {
    medium: list.filter((p) => p && p.source === 'medium').length,
    devto: list.filter((p) => p && p.source === 'devto').length,
    builder: list.filter((p) => p && p.source === 'builder').length,
    linkedin: validLinkedIn(linkedin).length,
  };
  return FILTERS.filter((f) => f.id === 'all' || counts[f.id] > 0);
}

function hasWriting(posts, linkedin) {
  return (Array.isArray(posts) && posts.length > 0) || validLinkedIn(linkedin).length > 0;
}

module.exports = { formatDateUTC, latestPosts, validLinkedIn, availableFilters, hasWriting, DEFAULT_LIMIT };
