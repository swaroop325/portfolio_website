# 3D Portfolio Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the portfolio as a 3D-driven site whose repos, badges and articles are pulled from GitHub, Credly, Medium and dev.to at build time, with a screenshot-ready badge wall.

**Architecture:** A Node script fetches and normalizes external data into committed JSON under `src/data/generated/`; pure functions in `src/lib/` curate and group it (unit-tested with `node:test`); React components render it, with react-three-fiber scenes lazy-loaded behind a WebGL/reduced-motion guard. Existing Gatsby 5 + Firebase deploy stays.

**Tech Stack:** Gatsby 5, React 18, framer-motion 11, three + @react-three/fiber + @react-three/drei, html-to-image, node:test (Node 20+; CI uses 20).

**Spec:** `docs/superpowers/specs/2026-11-19-3d-portfolio-revamp-design.md`

## Global Constraints

- Keep Gatsby 5 and Firebase Hosting deploy (`.github/workflows/firebase-deploy.yml`); keep NFC/QR, `SharingModal`, `ScrollAssistant`.
- All external data fetched at build time only; no runtime calls to Credly/GitHub/Medium/dev.to.
- Sources: GitHub user `swaroop325`; Credly `https://www.credly.com/users/swaroop-a-s.02bfb71a/badges.json`; Medium RSS `https://medium.com/feed/@swaroop325`; dev.to `https://dev.to/api/articles?username=swaroop325`.
- A failing source must never fail the build: keep the last committed JSON.
- Expired badges hidden; forks excluded from Selected Work.
- Share-mode card sizes: 1200×627 and 1080×1080.
- Respect `prefers-reduced-motion`; static fallback when WebGL is unavailable; every `window`/`document` use is SSR-guarded (the repo already had hydration fixes).
- AWS Community Builder (DevTools) is a hand-set badge, not fetched.

## Review Focus

- Credly returns 0 badges or an HTTP error: the wall shows cached badges, not an empty page.
- A badge has no `expires_at_date`, or expiry is in the past: no expiry means keep; past means hide.
- A repo has `description: null` and is not in the pinned list: excluded from Selected Work.
- Medium RSS item has no image or contains HTML entities in the title: still renders a clean card.
- A visitor has no WebGL, or reduced motion on: the page is fully usable with 2D fallbacks.
- PNG export when a badge image fails to load (Credly CDN down): export still completes, with a text placeholder.

## File Structure

- `scripts/fetch-content.js`: orchestrates the fetches and writes the JSON (CLI, no logic worth testing beyond the lib).
- `scripts/lib/normalize.js`: pure normalizers: `normalizeBadges`, `normalizeRepos`, `normalizePosts`.
- `scripts/lib/__tests__/normalize.test.js`: tests for the above, against fixtures in `scripts/lib/__tests__/fixtures/`.
- `src/data/generated/{badges,repos,posts}.json`: committed cache.
- `src/data/curation.js`: pinned repos, deny list, repo overrides, hand-set badges.
- `src/lib/badges.js`: `groupBadges`. `src/lib/repos.js`: `curateRepos`. Tests are colocated in `src/lib/__tests__/`.
- `src/components/three/SceneGuard.js`: lazy-loads a scene only when WebGL is available and motion is allowed.
- `src/components/three/HeroScene.js`, `src/components/three/BadgeMedallion.js`.
- `src/components/BadgeWall.js`, `src/components/BadgeShareCard.js`, `src/lib/exportPng.js`.
- `src/components/WorkSection.js`, `src/components/WritingSection.js`; modify `HeroSection.js`, `ModernNav.js`, `src/pages/index.js`, `src/data/portfolioData.js`, `.github/workflows/`.

---

### Task 1: Content normalizers and fetch script

**Files:**
- Create: `scripts/lib/normalize.js`, `scripts/fetch-content.js`, `scripts/lib/__tests__/normalize.test.js`, fixtures `credly.json`, `github-repos.json`, `medium.xml`, `devto.json` (trimmed real samples)
- Modify: `package.json` (add `"test": "node --test scripts src"`, `"fetch-content": "node scripts/fetch-content.js"`, and `"prebuild": "node scripts/fetch-content.js"`)

**Interfaces:**
- Produces: `normalizeBadges(credlyJson) -> Badge[]`, `Badge = {id, name, issuer, issuedAt: 'YYYY-MM-DD', expiresAt: string|null, image, url}`; `normalizeRepos(ghJson) -> Repo[]`, `Repo = {name, description, language, stars, url, fork, pushedAt, topics}`; `normalizePosts(mediumXml, devtoJson) -> Post[]`, `Post = {title, url, date, source: 'medium'|'devto', image|null, excerpt}` sorted newest first.

- [ ] **Step 1: Write failing tests** in `normalize.test.js`: `normalizeBadges` on the Credly fixture returns 30 items, the first `name` is `'AWS Partner: Forward Deployed Engineer (FDE) - Validated'`, `issuedAt` is `'2026-11-12'`; a badge with `expires_at_date: null` has `expiresAt === null`; `normalizeBadges({data: []})` returns `[]`. `normalizeRepos` maps `stargazers_count` to `stars`. `normalizePosts` decodes `&amp;`/`&#39;` in titles, merges both sources sorted by date desc, and gives `image: null` when no image exists.
- [ ] **Step 2: Run** `node --test scripts` and expect FAIL (module missing).
- [ ] **Step 3: Implement** the three functions in `scripts/lib/normalize.js` (CommonJS). Parse the Medium RSS with a small regex/`<item>` splitter (no new dependency); take the image from the first `<img src>` in `content:encoded`.
- [ ] **Step 4: Run** `node --test scripts` and expect all PASS.
- [ ] **Step 5: Implement `scripts/fetch-content.js`**: fetch each source with a 15 s timeout (global `fetch`), normalize, and write `src/data/generated/*.json`. On any error or an empty result, log a warning and leave the existing file untouched; always exit 0. GitHub requests send `Authorization: Bearer $GITHUB_TOKEN` when set. Run it once, and commit the generated JSON.
- [ ] **Step 6: Verify** `npm run fetch-content` prints 3 source summaries and `badges.json` has 30 entries. Then commit `feat: content pipeline`.

### Task 2: Curation and grouping (pure logic)

**Files:**
- Create: `src/data/curation.js`, `src/lib/badges.js`, `src/lib/repos.js`, `src/lib/__tests__/badges.test.js`, `src/lib/__tests__/repos.test.js`

**Interfaces:**
- Consumes: `Badge`, `Repo` from Task 1.
- Produces: `groupBadges(badges, now = new Date()) -> {title: string, badges: Badge[]}[]` in this order: `AWS Professional & Specialty`, `AWS Associate`, `AWS Foundational & Training`, `Microsoft`, `Other`; expired badges dropped; each group newest first; empty groups omitted. `curateRepos(repos, curation) -> Repo[]` where `curation = {pinned: string[], deny: string[], overrides: Record<string,{description}>}`; pinned first in the pinned order, then non-fork repos with a description (or an override), sorted by `pushedAt` desc, excluding the deny list, capped at 9.

- [ ] **Step 1: Write failing tests**: "AWS Certified Solutions Architect – Professional" lands in the Professional group, "Cloud Practitioner" in Foundational, "KCNA" in Other; a badge expired yesterday is dropped while `expiresAt: null` is kept; `curateRepos` drops forks and null-description repos, applies overrides, puts pinned repos first, and caps at 9.
- [ ] **Step 2: Run** `node --test src` and expect FAIL.
- [ ] **Step 3: Implement** in the files above (classification by issuer plus name patterns: `/Professional|Specialty/`, `/Associate/`, `/Practitioner|Training Badge|Demonstrated|Knowledge/`). Seed `curation.js` with pinned `['llmonaws','spammerLLM','SandraCore','cloudbox','S.U.N.D.A.Y','cv-processor','mac-llm-inference']` and a hand-set AWS Community Builder badge object.
- [ ] **Step 4: Run** `node --test src` and expect PASS.
- [ ] **Step 5: Commit** `feat: badge grouping and repo curation`.

### Task 3: 3D foundation and guard

**Files:**
- Create: `src/components/three/SceneGuard.js`, `src/lib/capabilities.js`, `src/lib/__tests__/capabilities.test.js`
- Modify: `package.json` (add `three`, `@react-three/fiber@8`, `@react-three/drei@9`, `html-to-image`; install with `npm i --legacy-peer-deps`, since the repo's CI already uses it)

**Interfaces:**
- Produces: `canRender3D({win}) -> boolean` (false if `win` is undefined, or no WebGL context, or `matchMedia('(prefers-reduced-motion: reduce)').matches`). `<SceneGuard fallback={node}>{lazy 3D child}</SceneGuard>` renders `fallback` on the server and until mounted, and when `canRender3D` is false; otherwise Suspense-loads the child.

- [ ] **Step 1: Write failing tests** for `canRender3D`, with fake `win` objects: undefined gives false; reduced motion gives false; a `document.createElement('canvas').getContext` that returns null gives false; a working one gives true.
- [ ] **Step 2: Run** `node --test src` and expect FAIL.
- [ ] **Step 3: Implement** `capabilities.js` and `SceneGuard.js` (state set in `useEffect` so SSR output equals the fallback).
- [ ] **Step 4: Run** the tests and expect PASS. Then run `npm run build` and confirm the SSR build succeeds (three imports must only occur inside lazily-loaded modules).
- [ ] **Step 5: Commit** `feat: 3D scene guard`.

### Task 4: Badge wall with 3D medallions and share mode

**Files:**
- Create: `src/components/BadgeWall.js`, `src/components/BadgeShareCard.js`, `src/components/three/BadgeMedallion.js`, `src/lib/exportPng.js`, `src/lib/__tests__/exportPng.test.js`
- Modify: `src/pages/index.js` (add the section with id `badges`)

**Interfaces:**
- Consumes: `groupBadges`, `SceneGuard`, `badges.json`, `curation.js`.
- Produces: `<BadgeWall />` (the section); `<BadgeShareCard size="wide"|"square" groups={...} />` (fixed 1200×627 / 1080×1080, inline sizes so export is deterministic); `exportCardPng(node, {width, height, filename}) -> Promise<void>` that triggers a download. Images that fail to load are replaced by a text placeholder and the export still completes.

- [ ] **Step 1: Write failing test** for `exportCardPng`'s image-fallback helper `inlineImagesOrPlaceholder(node, loader) -> Promise<void>`: with a loader that rejects for one image, the promise resolves and that `<img>` is replaced by a placeholder element.
- [ ] **Step 2: Run** and expect FAIL.
- [ ] **Step 3: Implement** `exportPng.js` (using `html-to-image` `toPng`, `pixelRatio: 2`), `BadgeMedallion.js` (a textured disc using `useTexture`, tilt toward the pointer with `useFrame`), `BadgeWall.js` (counts header "30 credentials", grouped grid; each tile is a 2D image by default and uses a medallion scene on hover and for the featured row, behind `SceneGuard`), `BadgeShareCard.js`. The wall has a Share Mode toggle that shows the card with "Download PNG" buttons for both sizes.
- [ ] **Step 4: Run** the tests, then `npm run develop` and visually confirm: wall renders with 3D on; reduced motion shows 2D; both PNG downloads have the correct pixel dimensions (1200×627, 1080×1080 at 1x).
- [ ] **Step 5: Commit** `feat: badge wall with share mode`.

### Task 4b: Badge filters (added after user request)

**Files:**
- Create: `src/lib/badgeFilter.js`, `src/lib/__tests__/badgeFilter.test.js`
- Modify: `src/components/BadgeWall.js`, `src/components/BadgeShareCard.js` (only to accept already-filtered groups and counts)

**Interfaces:**
- Consumes: `groupBadges` output `{title, badges}[]` (group titles exactly `AWS Professional & Specialty`, `AWS Associate`, `AWS Foundational & Training`, `Microsoft`, `Other`).
- Produces (CommonJS): `filterGroups(groups, {vendor: 'all'|'aws'|'microsoft'|'other', level: 'all'|'professional'|'associate'|'foundational'}) -> groups` (`vendor` selects groups whose title starts with `AWS`, equals `Microsoft`, or equals `Other`; `level` only applies when vendor is `aws`); `parseFilter(hash) -> {vendor, level}` (unknown or malformed input -> all/all); `serializeFilter({vendor, level}) -> string` (e.g. `filter=aws&level=professional`, empty string for all/all).

- [ ] **Step 1: Write failing tests**: `filterGroups(g, {vendor:'aws'})` keeps exactly the three AWS groups and removes Microsoft and Other; `{vendor:'aws', level:'professional'}` keeps only `AWS Professional & Specialty`; `level` is ignored when vendor is `microsoft`; `{vendor:'all'}` returns the input unchanged; an unknown vendor yields all; `parseFilter('#badges?filter=aws')` -> `{vendor:'aws', level:'all'}`; garbage -> all/all; serialize/parse round trip.
- [ ] **Step 2: Run** `npm test` and expect FAIL.
- [ ] **Step 3: Implement** `badgeFilter.js`.
- [ ] **Step 4: Run** `npm test` and expect PASS.
- [ ] **Step 5: UI**: filter chips (All, AWS, Microsoft, Other) above the wall; when AWS is selected, a second chip row for level. Chips are real buttons with `aria-pressed`, keyboard operable, visible focus. State initialises from `window.location.hash` after mount (SSR renders All) and updates it with `history.replaceState`. The share card, its counts (e.g. "20 AWS credentials") and its source wording derive from the filtered groups, and an empty filter result shows a friendly empty state with a reset button; exported filename includes the filter (e.g. `badges-aws-wide.png`). Verify in headless Chrome that AWS-only produces a PNG containing only AWS badges.
- [ ] **Step 6: Commit** `feat: badge filters`.

### Task 5: Hero scene and visual system

**Files:**
- Create: `src/components/three/HeroScene.js`, `src/assets/css/theme.css`
- Modify: `src/components/HeroSection.js`, `gatsby-browser.js` (import the theme), `src/components/CodeBackground.js` (retire or tone down so it does not fight the 3D hero)

**Interfaces:**
- Consumes: `SceneGuard`. Produces: `<HeroScene />`, an interactive particle/crystal field reacting to pointer and scroll progress; theme CSS variables `--bg`, `--fg`, `--accent-a`, `--accent-b`, `--surface`.

- [ ] **Step 1: Implement** the hero scene (instanced points; pointer parallax; scroll fades it out; a particle count lowered on `navigator.hardwareConcurrency <= 4` or small screens) and the hero copy: name, "AI/ML Architect @ Ingram Micro", a one-line hook, and CTAs to Work and Badges. The fallback is a CSS gradient mesh.
- [ ] **Step 2: Choose type and palette** using the ui-ux-pro-max skill, dark and high-contrast, with one accent gradient; define the variables in `theme.css`.
- [ ] **Step 3: Verify** at 390px and 1440px widths in `npm run develop` (no horizontal scroll, text contrast ≥ 4.5:1, the scene pauses when the tab is hidden), and confirm a Lighthouse performance score of at least 80 on mobile emulation.
- [ ] **Step 4: Commit** `feat: 3D hero and theme`.

### Task 6: Work and Writing sections

**Files:**
- Create: `src/components/WorkSection.js`, `src/components/WritingSection.js`
- Modify: `src/pages/index.js`, `src/components/ModernNav.js` (add `work`, `writing`, `badges` entries; keep the active-section list in `index.js` in sync)

**Interfaces:**
- Consumes: `curateRepos`, `repos.json`, `posts.json`. Produces: the sections with ids `work` and `writing`.

- [ ] **Step 1: Implement** `WorkSection` (curated repo cards: name, description, language chip, stars, link; the existing client projects from `portfolioData.js` render above them as case-study cards) and `WritingSection` (latest 6 posts with image or a gradient placeholder, a source tag, and the date). Tilt-on-hover with framer-motion.
- [ ] **Step 2: Verify** the section ids match `ModernNav` and the scroll-spy list; with `posts.json` as `[]` the Writing section hides itself rather than rendering an empty block.
- [ ] **Step 3: Commit** `feat: work and writing sections`.

### Task 7: Content accuracy and Certifications consolidation

**Files:**
- Modify: `src/data/portfolioData.js`, `src/components/CertificationsSection.js` (replace it with the badge wall, or turn it into a link to it), `src/pages/index.js`

- [ ] **Step 1:** Update the current role in `portfolioData.js` to AI/ML Architect at Ingram Micro (Singapore, since Sep 2026), with Activate Interactive as the previous role, matching the GitHub profile README; use its wording for the summary. Flag the final wording to the user for confirmation rather than inventing achievements.
- [ ] **Step 2:** Remove the hand-typed `certifications` list and its component usage, since Credly is now the source.
- [ ] **Step 3: Verify** `npm run build` succeeds and the site has no leftover references (`grep -r "CertificationsSection" src`). Commit `chore: single source for credentials`.

### Task 8: Scheduled rebuild and CI

**Files:**
- Modify: `.github/workflows/firebase-deploy.yml`

- [ ] **Step 1:** Add `schedule: - cron: '0 1 * * *'` (daily) and `workflow_dispatch`; add a "Fetch content" step before the build, with `GITHUB_TOKEN` in the env; add `npm test` before the build.
- [ ] **Step 2:** Keep the PR preview and push-to-master deploy conditions; the scheduled run deploys to `live` like a push on master.
- [ ] **Step 3: Verify** with `act` or by pushing a branch PR: the workflow passes, and the preview URL shows the badge wall. Commit `ci: daily content refresh`.

### Task 9: Performance and accessibility pass

- [ ] **Step 1:** Confirm the three.js chunk loads only after the first paint (check the network panel), and total JS stays under 350 KB gzipped before the 3D chunk.
- [ ] **Step 2:** Keyboard-test navigation; badge tiles have alt text equal to the badge name; the share buttons have labels; focus rings are visible; reduced motion verified.
- [ ] **Step 3:** Run `npm run build && npx gatsby serve` and re-run Lighthouse (mobile): performance ≥ 80, accessibility ≥ 95. Fix any regressions found, then commit `perf: budgets and a11y`.

---

**Deferred (phase 2, separate plan):** the "Story" door, a scroll-driven 3D career journey behind a two-door entry gate.
