import React, { useMemo, useRef, useState } from 'react'
import { motion, useInView, useScroll, useReducedMotion, AnimatePresence, MotionConfig } from 'framer-motion'
import GFT from '../images/gft.jpeg'
import CFT from '../images/cft.jpeg'
import Infy from '../images/infy.jpeg'
import ACT from '../images/activate.jpeg'
import Ingram from '../images/ingram.jpeg'
import { experiences as experienceData, yearsOfExperience } from '../data/portfolioData'
import { matchRolesByTech } from '../lib/skills'
import '../assets/css/sections.css'

// Career facts live in portfolioData.js; this file only adds presentation.
// `fit: 'contain'` + white tile for wordmark logos that must not be cropped.
const LOGOS = {
  'Ingram Micro': { src: Ingram, fit: 'contain', bg: '#ffffff' },
  'Activate Interactive': { src: ACT },
  'Infosys Limited': { src: Infy },
  'Craftveda Technology': { src: CFT },
  'GoFrugal Technologies': { src: GFT },
}
const initials = (name) =>
  name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const hasDetails = (exp) => (exp.achievements && exp.achievements.length > 0) || (exp.positions && exp.positions.length > 1)

// Every technology across roles, most used first (ties alphabetical): deterministic.
const TECH = (() => {
  const count = new Map()
  for (const e of experienceData) for (const t of e.technologies || []) count.set(t, (count.get(t) || 0) + 1)
  return [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name, n]) => ({ name, n }))
})()
const TOP_TECH = 12

const CSS = `
.xp-filter { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: .5rem; margin: 0 auto .75rem; max-width: 980px; }
.xp-filter-label { font: .75rem var(--font-mono); letter-spacing: .08em; text-transform: uppercase; color: var(--fg-subtle); margin-right: .25rem; }
.xp-chip { display: inline-flex; align-items: center; gap: .4rem; min-height: 40px; padding: 0 .85rem; border-radius: 999px; cursor: pointer;
  font: 600 .82rem var(--font-display); color: var(--fg); background: rgba(255,255,255,.04); border: 1px solid var(--border);
  transition: background .2s, border-color .2s, color .2s; touch-action: manipulation; }
.xp-chip small { font: 500 .7rem var(--font-mono); color: var(--fg-subtle); }
.xp-chip:hover { border-color: rgba(0,212,255,.6); background: rgba(0,212,255,.08); }
.xp-chip[aria-pressed="true"] { background: var(--accent-gradient); color: var(--on-accent); border-color: transparent; }
.xp-chip[aria-pressed="true"] small { color: var(--on-accent); }
.xp-clear { min-height: 34px; }
.xp-more { background: transparent; border-style: dashed; color: var(--fg-muted); }
.xp-status { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: .5rem; text-align: center; min-height: 40px; margin: 0 auto 2.5rem; font: .85rem var(--font-mono); color: var(--fg-muted); }
.xp-status b { color: var(--accent-b); font-weight: 600; }
.xp-chip:focus-visible, .xp-toggle:focus-visible { outline: 3px solid var(--accent-a); outline-offset: 3px; }

.xp-track { position: relative; max-width: 980px; margin: 0 auto; }
.xp-list { list-style: none; margin: 0; padding: 0 0 0 3.25rem; display: grid; gap: 1.25rem; }
.xp-rail { position: absolute; left: 1rem; top: .5rem; bottom: .5rem; width: 2px; background: rgba(255,255,255,.08); border-radius: 2px; }
.xp-fill { position: absolute; inset: 0; transform-origin: 50% 0; background: linear-gradient(180deg, var(--accent-a), var(--accent-b)); border-radius: 2px;
  box-shadow: 0 0 12px rgba(0,212,255,.5); }
.xp-item { position: relative; }
.xp-dot { position: absolute; left: calc(-3.25rem + 1rem - 7px); top: 1.9rem; width: 16px; height: 16px; border-radius: 50%;
  background: var(--bg); border: 2px solid rgba(255,255,255,.25); transition: border-color .25s, background .25s, box-shadow .25s; }
.xp-item.is-open .xp-dot, .xp-item.is-hit .xp-dot { border-color: var(--accent-a); background: var(--accent-a); box-shadow: 0 0 0 5px rgba(0,212,255,.15), 0 0 16px var(--accent-a); }
.xp-item.is-current .xp-dot { border-color: var(--accent-b); background: var(--accent-b); box-shadow: 0 0 0 5px rgba(0,255,136,.14), 0 0 16px var(--accent-b); }
@media (prefers-reduced-motion: no-preference) {
  .xp-item.is-current .xp-dot::after { content: ''; position: absolute; inset: -6px; border-radius: 50%; border: 1px solid var(--accent-b); animation: xp-ping 2.4s ease-out infinite; }
}
@keyframes xp-ping { from { transform: scale(.6); opacity: .9; } to { transform: scale(1.9); opacity: 0; } }

.xp-card { position: relative; padding: 1.4rem 1.5rem 1.25rem; border-radius: 18px; background: var(--surface-2); border: 1px solid var(--border);
  -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); transition: border-color .25s, background .25s, opacity .25s, box-shadow .25s, transform .25s var(--ease-out); }
.xp-card.can-open { cursor: pointer; }
.xp-card:hover { border-color: rgba(0,212,255,.35); }
.xp-item.is-open .xp-card { background: linear-gradient(160deg, rgba(0,212,255,.07), rgba(0,255,136,.025) 60%, rgba(255,255,255,.02)); border-color: rgba(0,212,255,.35); }
.xp-item.is-hit .xp-card { border-color: var(--accent-b); box-shadow: 0 18px 50px -26px rgba(0,255,136,.6); }
.xp-item.is-dim .xp-card { opacity: .5; }
.xp-head { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 1rem; align-items: center; }
.xp-logo { width: 56px; height: 56px; border-radius: 14px; overflow: hidden; display: flex; align-items: center; justify-content: center;
  border: 1px solid rgba(255,255,255,.14); flex: none; }
.xp-logo img { width: 100%; height: 100%; display: block; }
.xp-logo span { font: 800 1.15rem var(--font-display); color: var(--on-accent); }
.xp-role { font: 700 1.25rem/1.2 var(--font-display); letter-spacing: -.01em; color: var(--fg); margin: 0; }
.xp-co { margin: .2rem 0 0; font-weight: 600; color: var(--accent-a); font-size: .98rem; }
.xp-when { text-align: right; font: .78rem/1.5 var(--font-mono); color: var(--fg-muted); white-space: nowrap; }
.xp-when span { display: block; color: var(--fg-subtle); }
.xp-now { display: inline-block; margin-bottom: .2rem; padding: .1rem .5rem; border-radius: 999px; font: 600 .66rem var(--font-mono);
  letter-spacing: .08em; text-transform: uppercase; color: var(--accent-b); border: 1px solid rgba(0,255,136,.4); background: rgba(0,255,136,.08); }
.xp-desc { color: var(--fg-muted); line-height: 1.6; font-size: .95rem; margin: .9rem 0 .8rem; }
.xp-tech { display: flex; flex-wrap: wrap; gap: .35rem; list-style: none; margin: 0; padding: 0; }
.xp-tech li { font: .72rem var(--font-mono); color: var(--fg-muted); padding: .28rem .55rem; border-radius: 8px; background: rgba(255,255,255,.04);
  border: 1px solid var(--border); transition: color .2s, border-color .2s, background .2s; }
.xp-tech li.is-hit { color: var(--on-accent); background: var(--accent-b); border-color: transparent; font-weight: 600; }
.xp-toggle { display: inline-flex; align-items: center; gap: .45rem; min-height: 44px; margin-top: .6rem; padding: 0 .2rem; background: none; border: 0;
  cursor: pointer; font: 600 .82rem var(--font-mono); color: var(--accent-a); }
.xp-toggle svg { width: 16px; height: 16px; transition: transform .25s var(--ease-out); }
.xp-toggle[aria-expanded="true"] svg { transform: rotate(180deg); }
.xp-body { overflow: hidden; }
.xp-body-in { padding-top: .6rem; display: grid; gap: 1.1rem; }
.xp-sub { font: 600 .7rem var(--font-mono); letter-spacing: .1em; text-transform: uppercase; color: var(--fg-subtle); margin: 0 0 .55rem; }
.xp-pos { list-style: none; margin: 0; padding: 0 0 0 1rem; border-left: 2px solid rgba(0,212,255,.3); display: grid; gap: .45rem; }
.xp-pos li { font-size: .92rem; color: var(--fg); }
.xp-pos small { font: .75rem var(--font-mono); color: var(--fg-subtle); margin-left: .5rem; }
.xp-pos em { display: block; font-style: normal; font-size: .8rem; color: var(--fg-subtle); }
.xp-ach { margin: 0; padding: 0; list-style: none; display: grid; gap: .5rem; }
.xp-ach li { position: relative; padding-left: 1.2rem; color: var(--fg-muted); line-height: 1.55; font-size: .93rem; }
.xp-ach li::before { content: ''; position: absolute; left: 0; top: .6em; width: 7px; height: 7px; border-radius: 2px; background: var(--accent-gradient); transform: rotate(45deg); }
@media (max-width: 640px) {
  .xp-list { padding-left: 2rem; }
  .xp-rail { left: .45rem; }
  .xp-dot { left: calc(-2rem + .45rem - 7px); top: 1.55rem; width: 14px; height: 14px; }
  .xp-card { padding: 1.15rem 1.1rem 1rem; }
  .xp-head { grid-template-columns: auto minmax(0, 1fr); gap: .8rem; }
  .xp-when { grid-column: 1 / -1; text-align: left; white-space: normal; }
  .xp-when span { display: inline; margin-left: .5rem; }
  .xp-logo { width: 46px; height: 46px; border-radius: 12px; }
  .xp-role { font-size: 1.1rem; }
  .xp-filter { justify-content: flex-start; }
}
`

const Chevron = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m6 9 6 6 6-6" />
  </svg>
)

function Logo({ company }) {
  const logo = LOGOS[company]
  if (!logo) {
    return (
      <div className="xp-logo" style={{ background: 'var(--accent-gradient)' }}>
        <span role="img" aria-label={company}>{initials(company)}</span>
      </div>
    )
  }
  const contain = logo.fit === 'contain'
  return (
    <div className="xp-logo" style={{ background: logo.bg || 'transparent' }}>
      <img src={logo.src} alt={company} width="56" height="56" loading="lazy" decoding="async"
        style={{ objectFit: contain ? 'contain' : 'cover', padding: contain ? 3 : 0 }} />
    </div>
  )
}

function RoleCard({ exp, index, open, onToggle, tech, hits }) {
  const id = `xp-${slug(exp.company)}`
  const expandable = hasDetails(exp)
  const isCurrent = /present/i.test(exp.period)
  const hit = Boolean(tech) && hits.includes(exp.company)
  const cls = ['xp-item', open && 'is-open', isCurrent && 'is-current', hit && 'is-hit', tech && !hit && 'is-dim'].filter(Boolean).join(' ')
  const count = (exp.achievements || []).length

  // Pointer convenience: clicking the card toggles it. The button is the
  // keyboard path; clicks on it (or on links) are left to it.
  const onCardClick = (e) => {
    if (!expandable || e.target.closest('button, a')) return
    if (typeof window !== 'undefined' && window.getSelection && String(window.getSelection())) return
    onToggle(index)
  }

  return (
    <li className={cls}>
      <span className="xp-dot" aria-hidden="true" />
      <motion.article
        className={`xp-card${expandable ? ' can-open' : ''}`}
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        onClick={onCardClick}
        aria-labelledby={`${id}-role`}
      >
        <div className="xp-head">
          <Logo company={exp.company} />
          <div>
            <h3 id={`${id}-role`} className="xp-role">{exp.role}</h3>
            <p className="xp-co">{exp.company}</p>
          </div>
          <div className="xp-when">
            {isCurrent && <div className="xp-now">Current</div>}
            {exp.period}
            <span>{exp.location}</span>
          </div>
        </div>
        <p className="xp-desc">{exp.description}</p>
        <ul className="xp-tech" aria-label={`Technologies at ${exp.company}`}>
          {exp.technologies.map((t) => (
            <li key={t} className={tech && t.toLowerCase() === tech.toLowerCase() ? 'is-hit' : undefined}>{t}</li>
          ))}
        </ul>
        {expandable && (
          <button type="button" className="xp-toggle" aria-expanded={open} aria-controls={`${id}-body`} onClick={() => onToggle(index)}>
            {open ? 'Hide details' : count ? `Show ${count} highlights` : 'Show roles'}
            <Chevron />
          </button>
        )}
        {expandable && (
          <div id={`${id}-body`}>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  className="xp-body"
                  key="body"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="xp-body-in">
                    {exp.positions && exp.positions.length > 1 && (
                      <div>
                        <h4 className="xp-sub">Roles held</h4>
                        <ol className="xp-pos">
                          {exp.positions.map((p) => (
                            <li key={p.title}>
                              {p.title}
                              <small>{p.period}</small>
                              {p.note && <em>{p.note}</em>}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                    {count > 0 && (
                      <div>
                        <h4 className="xp-sub">Highlights</h4>
                        <ul className="xp-ach">
                          {exp.achievements.map((a) => (
                            <li key={a}>{a}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.article>
    </li>
  )
}

const ExperienceSection = () => {
  const ref = useRef(null)
  const listRef = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: listRef, offset: ['start 75%', 'end 60%'] })

  // Open the first role that has details (deterministic for SSR).
  const [open, setOpen] = useState(() => new Set([experienceData.findIndex(hasDetails)]))
  const [tech, setTech] = useState(null)
  const [showAll, setShowAll] = useState(false)
  const hits = useMemo(() => (tech ? matchRolesByTech(experienceData, tech) : []), [tech])

  const toggle = (i) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  const pick = (name) => setTech((cur) => (cur === name ? null : name))
  const chips = showAll ? TECH : TECH.slice(0, TOP_TECH)
  // Keep a picked chip visible even when the list is collapsed.
  const shown = tech && !chips.some((c) => c.name === tech) ? [...chips, TECH.find((c) => c.name === tech)] : chips

  return (
    <MotionConfig reducedMotion="user">
      <section id="experience" ref={ref} className="sx" aria-labelledby="experience-title">
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div className="sx-wrap">
          <motion.div className="sx-head" initial={{ opacity: 0, y: 24 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }}>
            <div className="sx-tag">{'<experience>'}</div>
            <h2 id="experience-title" className="sx-title">Work Experience</h2>
            <p className="sx-lede">
              {yearsOfExperience} years building and leading enterprise systems for Singapore government agencies and
              enterprise teams. Pick a technology to see where I used it.
            </p>
          </motion.div>

          <div className="xp-filter" role="group" aria-label="Highlight roles by technology">
            <span className="xp-filter-label" aria-hidden="true">Tech</span>
            {shown.map((c) => (
              <button key={c.name} type="button" className="xp-chip" aria-pressed={tech === c.name} onClick={() => pick(c.name)}>
                {c.name}
                {c.n > 1 && <small>×{c.n}</small>}
              </button>
            ))}
            {TECH.length > TOP_TECH && (
              <button type="button" className="xp-chip xp-more" aria-expanded={showAll} onClick={() => setShowAll((v) => !v)}>
                {showAll ? 'Fewer' : `+${TECH.length - TOP_TECH} more`}
              </button>
            )}
          </div>
          <div className="xp-status">
            <span aria-live="polite">
              {tech ? (
                <>
                  <b>{tech}</b>: used at {hits.join(', ')}
                </>
              ) : (
                'All roles shown'
              )}
            </span>
            {tech && (
              <button type="button" className="xp-chip xp-clear" onClick={() => setTech(null)}>
                Clear
              </button>
            )}
          </div>

          <div className="xp-track" ref={listRef}>
            <div className="xp-rail" aria-hidden="true">
              <motion.div className="xp-fill" style={{ scaleY: reduce ? 1 : scrollYProgress }} />
            </div>
            <ol className="xp-list">
              {experienceData.map((exp, i) => (
                <RoleCard key={exp.company} exp={exp} index={i} open={open.has(i)} onToggle={toggle} tech={tech} hits={hits} />
              ))}
            </ol>
          </div>
        </div>
      </section>
    </MotionConfig>
  )
}

export default ExperienceSection
