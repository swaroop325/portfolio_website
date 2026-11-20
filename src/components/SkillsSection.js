import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useInView, MotionConfig } from 'framer-motion'
import SceneGuard from './three/SceneGuard'
import { buildSkillGraph, layoutConstellation, nodeRadius, shortSkill } from '../lib/skills'
import { groupBadges } from '../lib/badges'
import { communityBuilderBadge } from '../data/curation'
import { skills as portfolioSkills } from '../data/portfolioData'
import badgesData from '../data/generated/badges.json'
import reposData from '../data/generated/repos.json'
import '../assets/css/sections.css'

// three/r3f live only in this lazy chunk; SceneGuard never renders it on the server.
const SkillConstellation = React.lazy(() => import('./three/SkillConstellation'))

// The owner's categories from portfolioData.js, with additions the GitHub
// profile README clearly lists (AI/ML & GenAI: AWS Bedrock, LLMs, RAG,
// LangChain, "machine learning"; Cloud: Azure, CDKTF; Programming: GraphQL).
const README_ADDITIONS = {
  'Backend Development': { append: ['GraphQL'] },
  'DevOps & Cloud': { append: ['Azure', 'CDKTF'] },
  'AI & Machine Learning': { prepend: ['AWS Bedrock', 'LLMs', 'RAG', 'LangChain'] },
}
const README_RENAMES = { 'ML Algorithms': 'Machine Learning' }
const SKILLS = Object.fromEntries(
  Object.entries(portfolioSkills).map(([title, c]) => {
    const add = README_ADDITIONS[title] || {}
    const items = [...(add.prepend || []), ...c.items.map((s) => README_RENAMES[s] || s), ...(add.append || [])]
    return [title, { color: c.color, items: [...new Set(items)] }]
  })
)

// Alternative spellings only: a repo language "HTML" is evidence for
// "HTML5/CSS3"; a certificate titled "AI Practitioner" certifies machine
// learning; the Agentic AI badges certify LLM agent work. Nothing here adds weight
// by itself: weight is still a count of real badges and repos.
const ALIASES = {
  'HTML5/CSS3': ['HTML', 'CSS'],
  'React.js': ['React'],
  Bash: ['Shell'],
  'Agile/Scrum': ['Scrum'],
  Kubernetes: ['KCNA'],
  'Machine Learning': ['AI Practitioner', 'AI Engineer', 'AI Fundamentals'],
  LLMs: ['Agentic AI'],
}

// Short names for the graphic only; chips and the panel use the owner's names.
const SHORT = {
  'Programming Languages': 'Languages',
  'Frontend Development': 'Frontend',
  'Backend Development': 'Backend',
  'DevOps & Cloud': 'Cloud & DevOps',
  Database: 'Data',
  'AI & Machine Learning': 'AI & ML',
  'Tools & Methodologies': 'Practices',
}

// Latest issue date in the data: a clock that is identical on the server and
// on the first client render (the real clock takes over after mount).
const DATA_DATE = new Date(badgesData.reduce((max, b) => (b.issuedAt && b.issuedAt > max ? b.issuedAt : max), '1970-01-01'))
const REPO_BY_NAME = Object.fromEntries(reposData.map((r) => [r.name, r]))

function buildModel(now) {
  const active = groupBadges([...badgesData, communityBuilderBadge], now).flatMap((g) => g.badges)
  const graph = buildSkillGraph(SKILLS, { badges: active, repos: reposData, aliases: ALIASES })
  const hubs = graph.nodes.filter((n) => n.kind === 'category')
  const skillNodes = graph.nodes.filter((n) => n.kind === 'skill')
  const badgeById = Object.fromEntries(active.map((b) => [b.id, b]))
  const colors = Object.fromEntries(hubs.map((h) => [h.category, h.color || '#00d4ff']))
  // Skills listed under a category (home or shared), with their evidence.
  const members = {}
  const evidence = {}
  for (const h of hubs) {
    const ids = new Set(graph.links.filter((l) => l.target === h.id).map((l) => l.source))
    const list = skillNodes.filter((n) => ids.has(n.id))
    members[h.category] = list
    evidence[h.category] = {
      members: list,
      badges: [...new Set(list.flatMap((m) => m.evidence.badges))].map((id) => badgeById[id]).filter(Boolean),
      repos: [...new Set(list.flatMap((m) => m.evidence.repos))]
        .map((n) => REPO_BY_NAME[n])
        .filter(Boolean)
        .sort((x, y) => y.stars - x.stars || String(y.pushedAt).localeCompare(String(x.pushedAt))),
    }
  }
  const score = (c) => evidence[c].badges.length + evidence[c].repos.length
  const defaultCat = hubs.reduce((best, h) => (score(h.category) > score(best) ? h.category : best), hubs[0].category)
  const proven = skillNodes.filter((n) => n.evidence.badges.length + n.evidence.repos.length > 0).length
  return { graph, layout: layoutConstellation(graph), hubs, skillNodes, colors, members, evidence, defaultCat, proven }
}
const INITIAL = buildModel(DATA_DATE)


const CSS = `
.sk-grid { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: 1.5rem; align-items: start; }
.sk-chips { display: flex; flex-wrap: wrap; gap: .5rem; justify-content: center; margin: 0 0 1.5rem; }
.sk-chip { display: inline-flex; align-items: center; gap: .5rem; min-height: 44px; padding: 0 1rem; border-radius: 999px;
  font: 600 .85rem var(--font-display); color: var(--fg); cursor: pointer; background: rgba(255,255,255,.04);
  border: 1px solid var(--border); transition: background .2s, border-color .2s, box-shadow .2s; touch-action: manipulation; }
.sk-chip i { width: 9px; height: 9px; border-radius: 50%; background: var(--c); box-shadow: 0 0 8px var(--c); flex: none; }
.sk-chip:hover { border-color: var(--c); background: rgba(255,255,255,.07); }
.sk-chip[aria-pressed="true"] { border-color: var(--c); background: color-mix(in srgb, var(--c) 18%, transparent); box-shadow: 0 0 24px -6px var(--c); }
.sk-chip b { font: 500 .72rem var(--font-mono); color: var(--fg-subtle); }
.sk-chip:focus-visible, .sk-link:focus-visible, .sk-badge:focus-visible, .sk-repo:focus-visible { outline: 3px solid var(--accent-a); outline-offset: 3px; }
.sk-stage { position: relative; aspect-ratio: 4 / 3.3; border-radius: 22px; overflow: hidden; isolation: isolate;
  background: radial-gradient(120% 90% at 50% 45%, rgba(0,212,255,.08), transparent 60%), rgba(255,255,255,.02);
  border: 1px solid var(--border); }
.sk-stage::before { content: ''; position: absolute; inset: 0; z-index: -1;
  background-image: radial-gradient(rgba(180,220,255,.14) 1px, transparent 1.2px); background-size: 22px 22px;
  -webkit-mask-image: radial-gradient(70% 70% at 50% 50%, #000, transparent 80%); mask-image: radial-gradient(70% 70% at 50% 50%, #000, transparent 80%); }
.sk-stage canvas { display: block; }
.sk-svg { width: 100%; height: 100%; display: block; }
.sk-svg .hub { cursor: pointer; }
.sk-svg text { font-family: var(--font-display); pointer-events: none; }
.sk-legend { position: absolute; left: 1rem; bottom: .8rem; right: 1rem; display: flex; justify-content: space-between; gap: 1rem;
  font: .68rem var(--font-mono); color: var(--fg-subtle); pointer-events: none; }
@media (prefers-reduced-motion: no-preference) {
  .sk-svg .hub-ring { transform-box: fill-box; transform-origin: center; animation: sk-pulse 3.2s ease-in-out infinite; }
}
@keyframes sk-pulse { 50% { transform: scale(1.18); opacity: .35; } }
.sk-panel { padding: 1.6rem 1.5rem; border-radius: 22px; background: var(--surface-2); border: 1px solid var(--border);
  -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); position: relative; overflow: hidden; }
.sk-panel::before { content: ''; position: absolute; inset: 0 0 auto; height: 3px; background: linear-gradient(90deg, var(--c), transparent); }
.sk-kicker { font: .72rem var(--font-mono); letter-spacing: .1em; text-transform: uppercase; color: var(--c); }
.sk-panel h3 { font: 700 1.6rem/1.15 var(--font-display); letter-spacing: -.02em; color: var(--fg); margin: .35rem 0 .5rem; }
.sk-sum { color: var(--fg-muted); font-size: .92rem; line-height: 1.55; margin: 0 0 1.2rem; }
.sk-skills { list-style: none; padding: 0; margin: 0 0 1.4rem; display: flex; flex-wrap: wrap; gap: .45rem; }
.sk-skills li { display: inline-flex; align-items: center; gap: .45rem; padding: .38rem .7rem; border-radius: 10px;
  font-size: .85rem; color: var(--fg); background: rgba(255,255,255,.04); border: 1px solid var(--border); }
.sk-skills li.has-ev { border-color: color-mix(in srgb, var(--c) 55%, transparent); background: color-mix(in srgb, var(--c) 10%, transparent); }
.sk-skills li span { font: 600 .7rem var(--font-mono); color: var(--c); }
.sk-h4 { font: 600 .72rem var(--font-mono); letter-spacing: .1em; text-transform: uppercase; color: var(--fg-subtle); margin: 0 0 .7rem; }
.sk-badges { display: flex; flex-wrap: wrap; gap: .5rem; margin: 0 0 1.3rem; padding: 0; list-style: none; }
.sk-badge { display: block; width: 52px; height: 52px; border-radius: 12px; padding: 4px; background: rgba(255,255,255,.04);
  border: 1px solid var(--border); transition: transform .2s var(--ease-out), border-color .2s; }
.sk-badge:hover { transform: translateY(-3px); border-color: var(--c); }
.sk-badge img { width: 100%; height: 100%; object-fit: contain; display: block; }
.sk-repos { list-style: none; padding: 0; margin: 0 0 1rem; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 170px), 1fr)); gap: .45rem; }
.sk-repo { display: flex; align-items: center; gap: .5rem; min-height: 40px; padding: .4rem .7rem; border-radius: 10px;
  font: .8rem var(--font-mono); color: var(--fg); text-decoration: none; background: rgba(255,255,255,.03); border: 1px solid var(--border);
  overflow: hidden; transition: border-color .2s, background .2s; }
.sk-repo:hover { border-color: var(--c); background: rgba(255,255,255,.06); }
.sk-repo span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sk-repo small { margin-left: auto; color: var(--fg-subtle); font-size: .7rem; flex: none; }
.sk-link { display: inline-flex; align-items: center; min-height: 44px; font: .82rem var(--font-mono); color: var(--accent-a); text-decoration: none; }
.sk-link:hover { text-decoration: underline; }
.sk-sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; font-style: normal; }
.sk-cb { font: 700 .62rem var(--font-mono); display: flex; height: 100%; align-items: center; justify-content: center; text-align: center; }
.sk-none { color: var(--fg-muted); font-size: .9rem; line-height: 1.55; padding: .9rem 1rem; border-radius: 12px; border: 1px dashed var(--border); margin: 0 0 1rem; }
@media (max-width: 640px) {
  .sk-chips { margin-left: -1rem !important; margin-right: -1rem !important; padding-left: 1rem !important; padding-right: 1rem !important; }
}
.sk-panel { align-self: start; }
@media (max-width: 899px) {
  .sk-grid { grid-template-columns: minmax(0, 1fr); }
  .sk-stage { aspect-ratio: 1 / 1; }
  .sk-chips { justify-content: flex-start; flex-wrap: nowrap; overflow-x: auto; margin: 0 -1.5rem 1.25rem; padding: .25rem 1.5rem .5rem;
    scrollbar-width: none; scroll-snap-type: x proximity; }
  .sk-chips::-webkit-scrollbar { display: none; }
  .sk-chip { flex: none; scroll-snap-align: start; }
}
`

// 2D constellation: the SSR / no-WebGL / reduced-motion view. Same layout as
// the 3D scene; hubs are clickable with a pointer, while the chip row above is
// the keyboard path (so this SVG stays out of the tab order).
function FlatConstellation({ m, active, preview, onSelect, onPreview }) {
  const focus = preview || active
  const P = (id) => m.layout[id]
  const focusIds = new Set(m.members[focus].map((n) => n.id))
  const hubIndex = Object.fromEntries(m.hubs.map((h, i) => [h.category, i]))
  return (
    <svg className="sk-svg" viewBox="-1.12 -1.08 2.24 2.16" aria-hidden="true" data-skill-fallback="">
      <defs>
        {m.hubs.map((h, i) => (
          <radialGradient key={h.id} id={`skg-${i}`}>
            <stop offset="0%" stopColor={m.colors[h.category]} stopOpacity="0.55" />
            <stop offset="100%" stopColor={m.colors[h.category]} stopOpacity="0" />
          </radialGradient>
        ))}
      </defs>
      {m.graph.links.map((l) => {
        const a = P(l.source)
        const b = P(l.target)
        const cat = l.target.slice(4)
        const on = cat === focus
        return (
          <line key={`${l.source}>${l.target}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            stroke={m.colors[cat]} strokeWidth={on ? 0.006 : 0.003} strokeOpacity={on ? 0.75 : 0.18} />
        )
      })}
      {m.skillNodes.map((n) => {
        const p = P(n.id)
        const on = focusIds.has(n.id)
        const r = nodeRadius(n.weight) * 0.55
        return (
          <g key={n.id} opacity={on ? 1 : 0.35}>
            <title>{`${n.label}: ${n.evidence.badges.length + n.evidence.repos.length} public proof`}</title>
            {n.weight > 1 && <circle cx={p.x} cy={p.y} r={r * 2.6} fill={`url(#skg-${hubIndex[n.category]})`} />}
            <circle cx={p.x} cy={p.y} r={r} fill={m.colors[n.category]} />
            {on && n.evidence.badges.length + n.evidence.repos.length > 0 && (
              <text x={p.x + p.lx * (r + 0.025)} y={p.y + p.ly * (r + 0.025) + 0.018}
                textAnchor={Math.abs(p.lx) < 0.35 ? 'middle' : p.lx > 0 ? 'start' : 'end'} fontSize="0.056" fill="#f4f7fb"
                stroke="#07070f" strokeWidth="0.012" paintOrder="stroke">
                {shortSkill(n.label)}
              </text>
            )}
          </g>
        )
      })}
      {m.hubs.map((h, i) => {
        const p = P(h.id)
        const on = h.category === focus
        return (
          <g key={h.id} className="hub" onClick={() => onSelect(h.category)}
            onPointerEnter={(e) => e.pointerType === 'mouse' && onPreview(h.category)}
            onPointerLeave={() => onPreview(null)}>
            <circle cx={p.x} cy={p.y} r={0.16} fill={`url(#skg-${i})`} opacity={on ? 1 : 0.45} />
            <circle className={on ? 'hub-ring' : undefined} cx={p.x} cy={p.y} r={0.075} fill="none" stroke={m.colors[h.category]} strokeWidth="0.006" />
            <circle cx={p.x} cy={p.y} r={on ? 0.05 : 0.04} fill={m.colors[h.category]} />
            <circle cx={p.x} cy={p.y} r={0.13} fill="transparent" />
            <text x={p.x + p.lx * 0.13} y={p.y + p.ly * 0.13 + 0.024} textAnchor="middle" fontSize="0.072" fontWeight="700"
              fill={on ? '#ffffff' : '#b4bfd0'} stroke="#07070f" strokeWidth="0.014" paintOrder="stroke">
              {SHORT[h.category] || h.category}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

function EvidencePanel({ m, category }) {
  const ev = m.evidence[category]
  const color = m.colors[category]
  const shownRepos = ev.repos.slice(0, 6)
  const proven = ev.members.filter((x) => x.evidence.badges.length + x.evidence.repos.length > 0).length
  return (
    <div className="sk-panel" style={{ '--c': color }} id="skills-panel">
      <div className="sk-kicker">{plural(ev.members.length, 'skill', 'skills')} · {proven} with public evidence</div>
      <h3>{category}</h3>
      <p className="sk-sum">
        {ev.badges.length || ev.repos.length
          ? `Backed by ${plural(ev.badges.length, 'active credential', 'active credentials')} and ${plural(ev.repos.length, 'public repo', 'public repos')}.`
          : 'Used in client work (see Experience). No public badge or repo evidence yet.'}
      </p>
      <ul className="sk-skills" aria-label={`${category} skills`}>
        {ev.members.map((x) => {
          const n = x.evidence.badges.length + x.evidence.repos.length
          return (
            <li key={x.id} className={n ? 'has-ev' : undefined}>
              {x.label}
              {n > 0 && (
                <span>
                  {n}
                  <em className="sk-sr"> pieces of evidence</em>
                </span>
              )}
            </li>
          )
        })}
      </ul>
      {ev.badges.length > 0 && (
        <>
          <h4 className="sk-h4">Matching credentials</h4>
          <ul className="sk-badges">
            {ev.badges.slice(0, 10).map((b) => (
              <li key={b.id}>
                <a className="sk-badge" href={b.url} target="_blank" rel="noopener noreferrer" aria-label={`${b.name} (opens in a new tab)`} title={b.name}>
                  {b.image ? (
                    <img src={b.image} alt="" width="44" height="44" loading="lazy" decoding="async" />
                  ) : (
                    <span className="sk-cb" style={{ color }}>AWS CB</span>
                  )}
                </a>
              </li>
            ))}
          </ul>
          {ev.badges.length > 10 && (
            <a className="sk-link" href="#badges">+{ev.badges.length - 10} more on the badge wall</a>
          )}
        </>
      )}
      {ev.repos.length > 0 && (
        <>
          <h4 className="sk-h4">Matching repositories</h4>
          <ul className="sk-repos">
            {shownRepos.map((r) => (
              <li key={r.name}>
                <a className="sk-repo" href={r.url} target="_blank" rel="noopener noreferrer">
                  <span>{r.name}</span>
                  {r.language && <small>{r.language}</small>}
                  <em className="sk-sr"> on GitHub (opens in a new tab)</em>
                </a>
              </li>
            ))}
          </ul>
          {ev.repos.length > shownRepos.length && (
            <a className="sk-link" href="https://github.com/swaroop325?tab=repositories" target="_blank" rel="noopener noreferrer">
              +{ev.repos.length - shownRepos.length} more on GitHub
              <em className="sk-sr"> (opens in a new tab)</em>
            </a>
          )}
        </>
      )}
    </div>
  )
}

const SkillsSection = () => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const [now, setNow] = useState(null)
  useEffect(() => setNow(new Date()), [])
  const m = useMemo(() => (now ? buildModel(now) : INITIAL), [now])

  const [active, setActive] = useState(INITIAL.defaultCat)
  const [preview, setPreview] = useState(null)
  const shown = preview || active

  const select = (cat) => {
    setActive(cat)
    setPreview(null)
  }

  return (
    <MotionConfig reducedMotion="user">
      <section id="skills" ref={ref} className="sx" aria-labelledby="skills-title">
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div className="sx-wrap">
          <motion.div className="sx-head" initial={{ opacity: 0, y: 24 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }}>
            <div className="sx-tag">{'<skills>'}</div>
            <h2 id="skills-title" className="sx-title">Skills, by evidence</h2>
            <p className="sx-lede">
              {m.skillNodes.length} skills in {m.hubs.length} clusters. A node grows with public proof (active
              badges and GitHub repos that use it), not with self-ratings. Pick a cluster to see the proof.
            </p>
          </motion.div>

          <div className="sk-chips" role="group" aria-label="Skill clusters">
            {m.hubs.map((h) => (
              <button key={h.id} type="button" className="sk-chip" style={{ '--c': m.colors[h.category] }}
                aria-pressed={active === h.category} aria-controls="skills-panel" onClick={() => select(h.category)}>
                <i aria-hidden="true" />
                {h.category}
                <b>{m.members[h.category].length}</b>
              </button>
            ))}
          </div>
          <p className="sk-sr" aria-live="polite">Showing {active}</p>

          <div className="sk-grid">
            <div className="sk-stage">
              <SceneGuard fallback={<FlatConstellation m={m} active={active} preview={preview} onSelect={select} onPreview={setPreview} />}>
                <SkillConstellation graph={m.graph} layout={m.layout} colors={m.colors} short={SHORT} active={active}
                  preview={preview} onSelect={select} onPreview={setPreview} />
              </SceneGuard>
              <div className="sk-legend" aria-hidden="true">
                <span>node size = evidence</span>
                <span>{m.proven}/{m.skillNodes.length} proven publicly</span>
              </div>
            </div>
            <EvidencePanel m={m} category={shown} />
          </div>
        </div>
      </section>
    </MotionConfig>
  )
}

export default SkillsSection
