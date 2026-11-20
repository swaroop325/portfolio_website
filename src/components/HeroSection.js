import React, { useRef } from 'react'
import SceneGuard from './three/SceneGuard'
import ProfileImage from '../images/profile.png'

// three/r3f live only in this lazy chunk; SceneGuard never renders it on the server.
const HeroScene = React.lazy(() => import('./three/HeroScene'))

const ANIM_CSS = `
@media (prefers-reduced-motion: no-preference) {
  .hx-rise { animation: hx-rise .8s var(--ease-out) both; animation-delay: var(--d, 0s); }
  .hx-rise-soft { animation: hx-rise-soft .9s var(--ease-out) both; animation-delay: var(--d, 0s); }
  .hx-stage canvas { animation: hx-fade 1.4s ease-out both; }
}
@keyframes hx-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes hx-rise-soft { from { transform: translateY(10px); } to { transform: none; } }
@keyframes hx-fade { from { opacity: 0; } to { opacity: 1; } }
`

// Scroll to the first section that exists. `#work` arrives in a later task;
// until then "See my work" falls back to `#projects`.
const scrollToFirst = (ids) => (e) => {
  if (typeof document === 'undefined') return
  const el = ids.map((id) => document.getElementById(id)).find(Boolean)
  if (!el) return
  e.preventDefault()
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  if (window.history && window.history.replaceState) window.history.replaceState(null, '', `#${el.id}`)
}

const Arrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)
const Medal = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="9" r="6" />
    <path d="M8.5 14 7 22l5-3 5 3-1.5-8" />
  </svg>
)
const Share = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
  </svg>
)

const HeroSection = ({ onOpenShareModal }) => {
  const sectionRef = useRef(null)
  const portraitRef = useRef(null)

  return (
    <section id="hero" ref={sectionRef} className="hx" aria-labelledby="hero-name">
      <style dangerouslySetInnerHTML={{ __html: ANIM_CSS }} />
      <SceneGuard fallback={<div className="hx-stage" aria-hidden="true"><div className="hx-mesh" data-hero-fallback="" /></div>}>
        <HeroScene targetRef={sectionRef} anchorRef={portraitRef} />
      </SceneGuard>

      <div className="hx-inner">
        <div>
          <div className="hx-eyebrow hx-rise" style={{ '--d': '0.05s' }}>
            <span className="hx-dot" aria-hidden="true" />
            AWS Community Builder · Singapore
          </div>

          <h1 id="hero-name" className="hx-name hx-rise-soft">
            Swaroop <span className="hx-grad">A.S</span>
          </h1>

          <p className="hx-role hx-rise-soft" style={{ '--d': '0.15s' }}>
            AI/ML Architect <span className="hx-at">@</span> Ingram Micro
          </p>

          <p className="hx-hook hx-rise-soft" style={{ '--d': '0.25s' }}>
            I design and build <strong>AI-powered cloud systems on AWS</strong>, from ML and generative AI
            platforms to the DevOps that ships them. 7+ years delivering for{' '}
            <strong>Singapore government agencies</strong> and enterprise teams.
          </p>

          <div className="hx-ctas hx-rise" style={{ '--d': '0.35s' }}>
            <a className="hx-btn hx-btn-primary" href="#work" onClick={scrollToFirst(['work', 'projects'])}>
              See my work <Arrow />
            </a>
            <a className="hx-btn hx-btn-secondary" href="#badges" onClick={scrollToFirst(['badges'])}>
              <Medal /> Credentials
            </a>
            <button type="button" className="hx-btn hx-btn-ghost" onClick={onOpenShareModal}>
              <Share /> Share contact
            </button>
          </div>

          <ul className="hx-facts hx-rise" style={{ '--d': '0.45s' }} aria-label="Focus areas">
            <li><b>AWS</b> cloud architecture</li>
            <li><b>AI/ML</b> &amp; GenAI</li>
            <li><b>DevOps</b> &amp; platform</li>
          </ul>
        </div>

        <div ref={portraitRef} className="hx-portrait hx-rise-soft" style={{ '--d': '0.2s' }}>
          <div className="hx-ring" aria-hidden="true" />
          <img className="hx-photo" src={ProfileImage} alt="Swaroop A.S" width="400" height="400" fetchpriority="high" />
          <div className="hx-tag" aria-hidden="true">
            <i>●</i> building with AWS + AI
          </div>
        </div>
      </div>

      <div className="hx-scroll" aria-hidden="true">
        scroll
        <span />
      </div>
    </section>
  )
}

export default HeroSection
