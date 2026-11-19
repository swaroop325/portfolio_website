const MAX_REPOS = 9;

function curateRepos(repos, curation) {
  const { pinned = [], deny = [], overrides = {} } = curation;
  const withOverride = (r) =>
    overrides[r.name] && overrides[r.name].description
      ? { ...r, description: overrides[r.name].description }
      : r;
  const allowed = repos.filter((r) => !deny.includes(r.name)).map(withOverride);
  const pinnedRepos = pinned.map((n) => allowed.find((r) => r.name === n)).filter(Boolean);
  const rest = allowed
    .filter((r) => !pinned.includes(r.name) && !r.fork && r.description)
    .sort((a, b) => new Date(b.pushedAt) - new Date(a.pushedAt));
  return [...pinnedRepos, ...rest].slice(0, MAX_REPOS);
}

module.exports = { curateRepos };
