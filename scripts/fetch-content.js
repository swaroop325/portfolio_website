const fs = require('node:fs');
const path = require('node:path');
const { normalizeBadges, normalizeRepos, normalizePosts, mergePosts } = require('./lib/normalize');

const OUT_DIR = path.join(__dirname, '..', 'src', 'data', 'generated');
const TIMEOUT_MS = 15000;
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const URLS = {
  credly: 'https://www.credly.com/users/swaroop-a-s.02bfb71a/badges.json',
  github: 'https://api.github.com/users/swaroop325/repos?per_page=100',
  medium: 'https://medium.com/feed/@swaroop325',
  devto: 'https://dev.to/api/articles?username=swaroop325',
};

async function get(url, { json = true, headers = {} } = {}) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, ...headers },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return json ? res.json() : res.text();
}

function write(file, data) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, file), JSON.stringify(data, null, 2) + '\n');
}

// Runs one source; on error or empty result, warns and keeps the existing file.
async function run(label, file, task) {
  try {
    const data = await task();
    if (!Array.isArray(data) || data.length === 0) {
      console.warn(`[fetch-content] WARN ${label}: empty result, keeping existing ${file}`);
      return;
    }
    write(file, data);
    console.log(`[fetch-content] ${label}: wrote ${data.length} items to ${file}`);
  } catch (err) {
    console.warn(`[fetch-content] WARN ${label}: ${err.message}, keeping existing ${file}`);
  }
}

// Credly pages at 48 badges; follow metadata.next_page_url (bounded). A failure
// on any page throws, so the caller keeps the existing file rather than writing
// a silently truncated list.
async function getAllCredly(maxPages = 10) {
  const first = await get(URLS.credly);
  const data = Array.isArray(first && first.data) ? [...first.data] : [];
  let next = first && first.metadata && first.metadata.next_page_url;
  for (let page = 1; next && page < maxPages; page++) {
    const url = new URL(next, URLS.credly).href;
    if (new URL(url).origin !== new URL(URLS.credly).origin) break;
    const json = await get(url);
    if (Array.isArray(json && json.data)) data.push(...json.data);
    next = json && json.metadata && json.metadata.next_page_url;
  }
  return { data };
}

async function main() {
  const ghHeaders = { Accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) ghHeaders.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  await run('badges (Credly)', 'badges.json', async () =>
    normalizeBadges(await getAllCredly())
  );
  await run('repos (GitHub)', 'repos.json', async () =>
    normalizeRepos(await get(URLS.github, { headers: ghHeaders }))
  );
  await run('posts (Medium + dev.to)', 'posts.json', async () => {
    const [medium, devto] = await Promise.allSettled([
      get(URLS.medium, { json: false }),
      get(URLS.devto),
    ]);
    if (medium.status === 'rejected') console.warn(`[fetch-content] WARN medium: ${medium.reason.message}`);
    if (devto.status === 'rejected') console.warn(`[fetch-content] WARN devto: ${devto.reason.message}`);
    const mediumXml = medium.status === 'fulfilled' ? medium.value : '';
    const devtoJson = devto.status === 'fulfilled' ? devto.value : [];
    const fresh = normalizePosts(mediumXml, devtoJson);
    const failed = ['medium', 'devto'].filter(src => !fresh.some(p => p.source === src));
    let existing = [];
    try {
      existing = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'posts.json'), 'utf8'));
    } catch (e) {}
    if (failed.length) console.warn(`[fetch-content] WARN keeping existing posts for: ${failed.join(', ')}`);
    return mergePosts(fresh, existing, failed);
  });
}

main()
  .catch(err => console.warn(`[fetch-content] WARN unexpected: ${err.message}`))
  .finally(() => process.exit(0));
