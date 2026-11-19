import React, { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import TiltCard from './TiltCard'
import { curateRepos } from '../lib/repos'
import { formatDateUTC } from '../lib/writing'
import { curation } from '../data/curation'
import { projects as caseStudies } from '../data/portfolioData'
import reposData from '../data/generated/repos.json'
import '../assets/css/sections.css'

const GITHUB = 'https://github.com/swaroop325'

const LANG_COLORS = {
  Python: '#3572A5',
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Go: '#00ADD8',
  Java: '#b07219',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Shell: '#89e051',
  Dart: '#00B4AB',
  Kotlin: '#A97BFF',
  Swift: '#F05138',
}

const Arrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 17 17 7M8 7h9v9" />
  </svg>
)
const RepoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z" />
    <path d="M8 7h8" />
  </svg>
)
const Star = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true">
    <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" />
  </svg>
)
const Bolt = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true">
    <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
  </svg>
)

const monthYear = (iso) => formatDateUTC(iso).replace(/ \d+,/, '')

const rise = (inView, i = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: inView ? { opacity: 1, y: 0 } : {},
  transition: { duration: 0.5, delay: Math.min(i, 8) * 0.06, ease: [0.22, 1, 0.36, 1] },
})

function CaseCard({ project }) {
  return (
    <TiltCard as="article" className={`ws-case${project.featured ? ' is-featured' : ''}`} max={project.featured ? 5 : 7}>
      <div className="ws-client">{project.client}</div>
      <h4>{project.title}</h4>
      <p>{project.description}</p>
      {project.impact && (
        <div className="ws-impact">
          <Bolt /> {project.impact}
        </div>
      )}
      <ul className="ws-chips" aria-label="Technologies">
        {project.technologies.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </TiltCard>
  )
}

function RepoCard({ repo }) {
  const updated = monthYear(repo.pushedAt)
  return (
    <TiltCard
      as="a"
      className="ws-repo"
      href={repo.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${repo.name}${repo.language ? `, ${repo.language}` : ''} repository on GitHub (opens in a new tab)`}
    >
      <div className="ws-repo-top">
        <span className="ws-ico">
          <RepoIcon />
        </span>
        <span className="ws-ico ws-ico-go">
          <Arrow />
        </span>
      </div>
      <h4>{repo.name}</h4>
      {repo.description && <p>{repo.description}</p>}
      <ul className="ws-meta">
        {repo.language && (
          <li>
            <span className="ws-lang-dot" style={{ background: LANG_COLORS[repo.language] || '#8792a6' }} aria-hidden="true" />
            {repo.language}
          </li>
        )}
        {repo.stars > 0 && (
          <li aria-label={`${repo.stars} stars`}>
            <Star /> {repo.stars}
          </li>
        )}
        {updated && <li>Updated {updated}</li>}
      </ul>
    </TiltCard>
  )
}

export default function WorkSection({ repos = reposData, projects = caseStudies }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const curated = curateRepos(Array.isArray(repos) ? repos : [], curation)
  const featured = projects.filter((p) => p.featured)
  const others = projects.filter((p) => !p.featured)

  return (
    <section id="work" ref={ref} className="sx" aria-labelledby="work-heading">
      <div className="sx-wrap">
        <motion.header className="sx-head" {...rise(inView)}>
          <div className="sx-tag">{'<work>'}</div>
          <h2 id="work-heading" className="sx-title">
            Selected Work
          </h2>
          <p className="sx-lede">
            Client platforms I architected or led for Singapore government agencies and enterprises, then the code I
            build in the open.
          </p>
        </motion.header>

        {projects.length > 0 && (
          // id="projects" keeps old #projects links and the scroll assistant working.
          <div id="projects" className="ws-block">
            <div className="sx-sub">
              <h3>
                <span className="sx-dot" aria-hidden="true" />
                Client case studies <small>{projects.length}</small>
              </h3>
            </div>
            {featured.length > 0 && (
              <div className="ws-grid ws-grid-featured">
                {featured.map((p, i) => (
                  <motion.div key={p.title} {...rise(inView, i)} className="tc-cell">
                    <CaseCard project={p} />
                  </motion.div>
                ))}
              </div>
            )}
            <div className="ws-grid">
              {others.map((p, i) => (
                <motion.div key={p.title} {...rise(inView, featured.length + i)} className="tc-cell">
                  <CaseCard project={p} />
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {curated.length > 0 && (
          <div className="ws-block">
            <div className="sx-sub">
              <h3>
                <span className="sx-dot" aria-hidden="true" />
                Open source <small>{curated.length}</small>
              </h3>
              <a className="sx-link" href={GITHUB} target="_blank" rel="noopener noreferrer">
                All repositories on GitHub <Arrow />
              </a>
            </div>
            <div className="ws-grid">
              {curated.map((r, i) => (
                <motion.div key={r.name} {...rise(inView, i)} className="tc-cell">
                  <RepoCard repo={r} />
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
