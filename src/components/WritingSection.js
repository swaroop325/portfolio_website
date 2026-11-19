import React, { useMemo, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import TiltCard from './TiltCard'
import LinkedInEmbed from './LinkedInEmbed'
import { availableFilters, formatDateUTC, hasWriting, latestPosts, validLinkedIn } from '../lib/writing'
import postsData from '../data/generated/posts.json'
import linkedinData from '../data/linkedin-posts.json'
import '../assets/css/sections.css'

const SOURCE_LABEL = { medium: 'Medium', devto: 'dev.to' }
const PROFILES = [
  { href: 'https://medium.com/@swaroop325', label: 'More on Medium' },
  { href: 'https://dev.to/swaroop325', label: 'More on dev.to' },
]

const Arrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 17 17 7M8 7h9v9" />
  </svg>
)

function PostImage({ post, source }) {
  const [failed, setFailed] = useState(false)
  if (!post.image || failed) {
    return (
      <div className="wr-ph" aria-hidden="true">
        <span>{source}</span>
      </div>
    )
  }
  return <img src={post.image} alt="" loading="lazy" decoding="async" width="1000" height="420" onError={() => setFailed(true)} />
}

function PostCard({ post }) {
  const source = SOURCE_LABEL[post.source] || post.source
  const date = formatDateUTC(post.date)
  return (
    <TiltCard
      as="a"
      className="wr-card"
      href={post.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${post.title}, on ${source}${date ? `, ${date}` : ''} (opens in a new tab)`}
      max={5}
    >
      <div className="wr-media">
        <PostImage post={post} source={source} />
      </div>
      <div className="wr-body">
        <div className="wr-meta">
          <span className={`wr-src wr-src-${post.source}`}>{source}</span>
          {date && <time dateTime={post.date}>{date}</time>}
        </div>
        <h4>{post.title}</h4>
        {post.excerpt && <p>{post.excerpt}</p>}
      </div>
    </TiltCard>
  )
}

export default function WritingSection({ posts = postsData, linkedin = linkedinData }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const [filter, setFilter] = useState('all')

  const liPosts = useMemo(() => validLinkedIn(linkedin), [linkedin])
  const filters = useMemo(() => availableFilters(posts, linkedin), [posts, linkedin])
  const shown = useMemo(() => latestPosts(posts, filter), [posts, filter])
  const showLinkedIn = liPosts.length > 0 && (filter === 'all' || filter === 'linkedin')

  if (!hasWriting(posts, linkedin)) return null

  const countFor = (id) =>
    id === 'all'
      ? (Array.isArray(posts) ? posts.length : 0) + liPosts.length
      : id === 'linkedin'
      ? liPosts.length
      : posts.filter((p) => p.source === id).length

  return (
    <section id="writing" ref={ref} className="sx" aria-labelledby="writing-heading">
      <div className="sx-wrap">
        <motion.header
          className="sx-head"
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="sx-tag">{'<writing>'}</div>
          <h2 id="writing-heading" className="sx-title">
            Writing
          </h2>
          <p className="sx-lede">Notes from building on AWS, GenAI and DevOps, cross-posted to Medium and dev.to.</p>
        </motion.header>

        {filters.length > 2 && (
          <div className="wr-filters" role="group" aria-label="Filter writing by source">
            {filters.map((f) => (
              <button key={f.id} type="button" className="wr-chip" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
                {f.label}
                <span aria-hidden="true">{countFor(f.id)}</span>
              </button>
            ))}
          </div>
        )}

        <motion.div key={filter} initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ duration: 0.35 }}>
          {shown.length > 0 && (
            <div className="wr-grid">
              {shown.map((p) => (
                <div key={p.url} className="tc-cell">
                  <PostCard post={p} />
                </div>
              ))}
            </div>
          )}

          {showLinkedIn && (
            <div className="wr-li-block">
              {filter === 'all' && shown.length > 0 && (
                <div className="sx-sub">
                  <h3>
                    <span className="sx-dot" aria-hidden="true" />
                    On LinkedIn <small>{liPosts.length}</small>
                  </h3>
                </div>
              )}
              <div className="wr-li-grid">
                {liPosts.map((p) => (
                  <LinkedInEmbed key={p.urn} post={p} />
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {filter !== 'linkedin' && shown.length > 0 && (
          <div className="wr-more">
            {PROFILES.filter((l) => filter === 'all' || l.href.includes(filter === 'devto' ? 'dev.to' : filter)).map((l) => (
              <a key={l.href} className="sx-link" href={l.href} target="_blank" rel="noopener noreferrer">
                {l.label} <Arrow />
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
