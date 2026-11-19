# 3D Portfolio Revamp: Design

## Intent
Rebuild swaroop325's portfolio as a cinematic, 3D-driven site. Recruiters should be curious enough to dig in. Engineers should be inspired by the craft. The badge wall must be screenshot-ready for LinkedIn. Content stays current by pulling from external sources instead of hand-typed data.

## Goals
- Real 3D (three.js via react-three-fiber), rich animation, distinctive visual identity.
- Live content: GitHub repos, Credly badges, Medium and dev.to posts.
- Badge wall with a fixed-ratio "share mode" and a Download PNG button.
- Fast on mid-range phones; graceful fallback with no WebGL or with reduced motion.

## Non-goals / anti-goals
- No second "Story" experience in v1 (planned as phase 2: scroll-driven 3D career journey behind a two-door gate, inspired by inacionakiti.com's entry choice).
- Not a copy of the reference site; its stack was not inspectable.
- Anti-goal: spectacle that hides the work. Proof of work must be reachable in one scroll.
- Do not dump all 93 repos; most are forks or old experiments.

## Constraints
- Keep Gatsby 5 and the Firebase deploy (GitHub Action), and keep the NFC/QR, share modal and navigation assistant features.
- All external data is fetched at build time into JSON (no runtime scraping, no CORS dependence). A scheduled workflow (daily) rebuilds the site.
- Sources: GitHub API (`swaroop325`, plus profile README), Credly `https://www.credly.com/users/swaroop-a-s.02bfb71a/badges.json` (30 badges, public), Medium RSS `https://medium.com/feed/@swaroop325`, dev.to API `https://dev.to/api/articles?username=swaroop325`. AWS Community Builder profile is JS-rendered and not scrapeable, so it is a hand-set badge.
- Build must not fail if a source is down: fall back to last-good cached JSON committed in the repo.

## Approaches considered
- **A. Gatsby + react-three-fiber, build-time data (chosen).** Keeps deploy and features; the cost is legacy SCSS and a slower build, so the new design is isolated from it.
- B. Rewrite on Next.js or Vite. Cleaner, but rebuilds working features for no visible gain.
- C. Embedded Spline scenes. Fast but heavy, and scenes cannot read live data.

Chosen autonomously because the user said "decide urself".

## Design (my calls)
- Sections: Hero (interactive 3D object), Selected Work (curated repos, with a pinned list plus an allow/deny filter: no forks, must have a description or an override), Writing (Medium and dev.to merged), Experience (from `portfolioData.js`), Badge Wall, Contact.
- Hero 3D: a particle or crystalline field reacting to cursor and scroll, with a small fixed-size scene for the badge wall.
- Badge Wall: badges rendered as 3D medallions tilting with the cursor. Groups: AWS Professional/Specialty, Associate, Foundational and Training, Microsoft, Other; expired badges are hidden. "Share mode" renders a fixed 1200×627 (and a 1080×1080) card layout that can be exported to PNG client-side.
- Motion: framer-motion for UI transitions; r3f for scenes; respect `prefers-reduced-motion`; lazy-load the 3D bundle; static fallback image when WebGL is unavailable.
- Visual direction: dark, high-contrast, one accent gradient; a type pairing chosen during the build via the ui-ux-pro-max guidance.
- Data layer: `scripts/fetch-content.js` writes `src/data/generated/{repos,badges,posts}.json`; Gatsby pages import them. Cached output is committed.

## Left to the builder
Exact palette and fonts, particle counts and performance budgets, curation list for repos, PNG export method (html-to-image vs canvas), and the schedule hour for the daily rebuild.

## Phasing
1. Data pipeline plus the badge wall (highest user value: LinkedIn).
2. Hero and the 3D main site.
3. Writing, work and polish, performance and accessibility pass.
4. (Later) Story door.
