// Parse public LinkedIn post URLs into the urn that LinkedIn's official
// embed iframe accepts. CommonJS so node:test and the CLI can load it.

const EMBED_BASE = 'https://www.linkedin.com/embed/feed/update/';
const TYPES = { activity: 'activity', share: 'share', ugcpost: 'ugcPost' };

const URN_RE = /^urn:li:(activity|share|ugcPost):(\d{6,})$/i;
// /posts/<slug>-activity-<id>-<suffix>; the id is a long run of digits.
const POSTS_RE = /-(activity|share|ugcPost)-(\d{6,})(?:-|$)/i;

const toUrn = (type, id) => `urn:li:${TYPES[type.toLowerCase()]}:${id}`;
const feedUrl = (urn) => `https://www.linkedin.com/feed/update/${urn}/`;
const result = (urn, url) => ({ urn, url, embedUrl: `${EMBED_BASE}${urn}` });

function parseUrn(str) {
  const m = URN_RE.exec(str);
  return m ? toUrn(m[1], m[2]) : null;
}

function isLinkedInHost(host) {
  return host === 'linkedin.com' || host.endsWith('.linkedin.com');
}

function parseLinkedInUrl(input) {
  if (typeof input !== 'string') return null;
  const raw = input.trim();
  if (!raw) return null;

  if (/^urn:/i.test(raw)) {
    const urn = parseUrn(raw);
    return urn ? result(urn, feedUrl(urn)) : null;
  }

  let u;
  try {
    u = new URL(raw);
  } catch (e) {
    return null;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  if (!isLinkedInHost(u.hostname.toLowerCase())) return null;

  let path;
  try {
    path = decodeURIComponent(u.pathname);
  } catch (e) {
    return null;
  }

  // /feed/update/<urn>[/] and /embed/feed/update/<urn>
  const feed = /^\/(?:embed\/)?feed\/update\/([^/]+)\/?$/.exec(path);
  if (feed) {
    const urn = parseUrn(feed[1]);
    return urn ? result(urn, feedUrl(urn)) : null;
  }

  // /posts/<slug>-<type>-<id>-<suffix>[/]
  const posts = /^\/posts\/([^/]+)\/?$/.exec(path);
  if (posts) {
    const m = POSTS_RE.exec(posts[1]);
    if (!m) return null;
    return result(toUrn(m[1], m[2]), `https://www.linkedin.com/posts/${posts[1]}`);
  }

  return null;
}

// Pure helper for scripts/add-linkedin.js: never mutates `list`.
function addLinkedInPost(list, input, note) {
  const parsed = parseLinkedInUrl(input);
  if (!parsed) {
    return { list, added: false, reason: `Not a LinkedIn post URL or urn: ${input}` };
  }
  const existing = list.find((p) => p.urn === parsed.urn);
  if (existing) {
    return { list, added: false, reason: `Already listed: ${parsed.urn}`, post: existing };
  }
  const post = { urn: parsed.urn, url: parsed.url };
  if (note && String(note).trim()) post.note = String(note).trim();
  return { list: [...list, post], added: true, post };
}

module.exports = { parseLinkedInUrl, addLinkedInPost, EMBED_BASE };
