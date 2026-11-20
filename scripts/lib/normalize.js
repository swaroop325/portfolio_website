const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decodeEntities(str) {
  return String(str || '')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, n) => (n.toLowerCase() in NAMED ? NAMED[n.toLowerCase()] : m));
}

function stripCdata(str) {
  const m = /^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/.exec(str);
  return m ? { text: m[1], cdata: true } : { text: str, cdata: false };
}

function tagValue(block, tag) {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`);
  const m = re.exec(block);
  if (!m) return '';
  const { text, cdata } = stripCdata(m[1]);
  return cdata ? text : decodeEntities(text);
}

// Fetched URLs end up in href/src, so only https is accepted.
function safeUrl(u) {
  return typeof u === 'string' && /^https:\/\//i.test(u.trim()) ? u.trim() : null;
}

function toIsoDate(value) {
  const d = new Date(value);
  return isNaN(d) ? null : d.toISOString().slice(0, 10);
}

function normalizeBadges(credlyJson) {
  const list = credlyJson && Array.isArray(credlyJson.data) ? credlyJson.data : [];
  return list.map(b => {
    const tpl = b.badge_template || {};
    const entity =
      b.issuer && Array.isArray(b.issuer.entities) && b.issuer.entities[0]
        ? b.issuer.entities[0].entity || {}
        : {};
    return {
      id: b.id,
      name: tpl.name || '',
      issuer: entity.name || '',
      issuedAt: b.issued_at_date || toIsoDate(b.issued_at),
      expiresAt: b.expires_at_date || null,
      image: safeUrl(b.image_url || tpl.image_url),
      url: safeUrl(tpl.url) || `https://www.credly.com/badges/${b.id}`,
    };
  });
}

function normalizeRepos(ghJson) {
  const list = Array.isArray(ghJson) ? ghJson : [];
  return list.map(r => ({
    name: r.name,
    description: r.description || null,
    language: r.language || null,
    stars: r.stargazers_count || 0,
    url: safeUrl(r.html_url),
    fork: !!r.fork,
    pushedAt: r.pushed_at || null,
    topics: Array.isArray(r.topics) ? r.topics : [],
  })).filter(r => r.url);
}

function excerptFrom(html, max = 200) {
  const text = decodeEntities(String(html || '').replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? text.slice(0, max - 1).trimEnd() + '…' : text;
}

function parseMedium(xml) {
  if (!xml) return [];
  const items = String(xml).match(/<item>[\s\S]*?<\/item>/g) || [];
  return items
    .map(item => {
      const content = tagValue(item, 'content:encoded');
      const srcs = [...content.matchAll(/<img[^>]*\ssrc=["']([^"']+)["']/gi)]
        .map(m => decodeEntities(m[1]))
        .filter(u => !u.includes('/_/stat'));
      const image = srcs.find(u => u.includes('cdn-images')) || srcs[0] || null;
      const link = tagValue(item, 'link').trim();
      const date = new Date(tagValue(item, 'pubDate'));
      return {
        title: decodeEntities(tagValue(item, 'title')).trim(),
        url: safeUrl(link.split('?')[0]),
        date: isNaN(date) ? null : date.toISOString(),
        source: 'medium',
        image: safeUrl(image),
        excerpt: excerptFrom(content),
      };
    })
    .filter(p => p.title && p.url);
}

function parseDevto(json) {
  const list = Array.isArray(json) ? json : [];
  return list
    .map(a => {
      const date = new Date(a.published_at || a.published_timestamp);
      return {
        title: decodeEntities(a.title).trim(),
        url: safeUrl(a.url),
        date: isNaN(date) ? null : date.toISOString(),
        source: 'devto',
        image: safeUrl(a.cover_image || a.social_image),
        excerpt: excerptFrom(a.description),
      };
    })
    .filter(p => p.title && p.url);
}

function normalizePosts(mediumXml, devtoJson) {
  return [...parseMedium(mediumXml), ...parseDevto(devtoJson)].sort(
    (a, b) => new Date(b.date || 0) - new Date(a.date || 0)
  );
}

const byDateDesc = (a, b) => new Date(b.date || 0) - new Date(a.date || 0);

// Keeps existing posts from any source that failed or came back empty.
// failedSources: array of 'medium' | 'devto'.
function mergePosts(fresh, existing, failedSources) {
  const failed = new Set(failedSources || []);
  if (failed.has('medium') && failed.has('devto')) return []; // caller skips the write
  const kept = (Array.isArray(existing) ? existing : []).filter(p => failed.has(p.source));
  return [...(fresh || []).filter(p => !failed.has(p.source)), ...kept].sort(byDateDesc);
}

module.exports = { normalizeBadges, normalizeRepos, normalizePosts, mergePosts, decodeEntities };
