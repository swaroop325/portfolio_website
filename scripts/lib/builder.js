// AWS Builder Center has no public per-author feed (the profile page is a
// JS app behind an authenticated API), so the owner lists post URLs in
// src/data/builder-posts.json and this reads each page's public meta tags.
const { decodeEntities } = require('./normalize');

const HOST = 'builder.aws.com';

// Accepts a URL string or { url, date?, title? }. Only https builder.aws.com/content/... is allowed.
function parseBuilderEntry(entry) {
  const obj = typeof entry === 'string' ? { url: entry } : entry;
  if (!obj || typeof obj.url !== 'string') return null;
  let u;
  try { u = new URL(obj.url.trim()); } catch (e) { return null; }
  if (u.protocol !== 'https:' || u.hostname !== HOST || !/^\/content\/[A-Za-z0-9]+/.test(u.pathname)) return null;
  const date = typeof obj.date === 'string' && !Number.isNaN(new Date(obj.date).getTime()) ? new Date(obj.date).toISOString() : '';
  return { url: `https://${HOST}${u.pathname}`, date, title: typeof obj.title === 'string' ? obj.title : '' };
}

const meta = (html, key) => {
  const re = new RegExp(`<meta[^>]+(?:property|name)="${key}"[^>]+content="([^"]*)"`, 'i');
  const m = re.exec(html);
  return m ? decodeEntities(m[1]).trim() : '';
};

function parseBuilderPage(html, entry) {
  const raw = meta(html, 'og:title');
  const title = (entry.title || raw.replace(/\s*\|\s*AWS Builder Center\s*$/i, '')).trim();
  if (!title) return null;
  const image = meta(html, 'og:image');
  return {
    source: 'builder',
    title,
    url: entry.url,
    date: entry.date,
    excerpt: meta(html, 'og:description').slice(0, 220),
    // The default Builder Center card is a generic logo, not a post image.
    image: /^https:\/\//.test(image) && !/\/assets\/og-/.test(image) ? image : '',
  };
}

module.exports = { parseBuilderEntry, parseBuilderPage };
