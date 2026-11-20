import React, { useEffect, useRef, useState } from 'react'
import { motion, useInView, useMotionValue, useSpring, useReducedMotion, MotionConfig } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { contact } from '../data/portfolioData'
import { buildVCard } from '../lib/vcard'
import '../assets/css/sections.css'

const NAME = 'Swaroop A.S.'
const WEBSITE = `https://${contact.website.replace(/^https?:\/\//, '')}`
const LINKS = [
  { name: 'LinkedIn', handle: 'swaroop-a-s', url: 'https://www.linkedin.com/in/swaroop-a-s-7ab296b8/', mark: 'in', color: '#4c9dff', note: 'Connect professionally' },
  { name: 'GitHub', handle: '@swaroop325', url: 'https://github.com/swaroop325', mark: 'gh', color: '#e6edf3', note: 'Code and experiments' },
  { name: 'Medium', handle: '@swaroop325', url: 'https://medium.com/@swaroop325', mark: 'M', color: '#f4f7fb', note: 'Long-form writing' },
  { name: 'dev.to', handle: 'swaroop325', url: 'https://dev.to/swaroop325', mark: 'DEV', color: '#c9d1ff', note: 'Hands-on posts' },
  { name: 'Credly', handle: 'swaroop-a-s', url: 'https://www.credly.com/users/swaroop-a-s.02bfb71a', mark: 'cr', color: '#ff6b00', note: 'Verified credentials' },
  { name: 'AWS Community Builder', handle: '@swaroop325', url: 'https://builder.aws.com/community/@swaroop325', mark: 'aws', color: '#ff9900', note: 'DevTools category' },
]
const VCARD = buildVCard({
  name: NAME,
  title: 'AI/ML Architect',
  org: 'Ingram Micro',
  email: contact.email,
  phone: contact.phone,
  url: [WEBSITE, LINKS[0].url, LINKS[1].url],
})

const CSS = `
.ct-grid { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: 1.25rem; align-items: stretch; }
.ct-card { position: relative; padding: 1.6rem; border-radius: 20px; background: var(--surface-2); border: 1px solid var(--border);
  -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); overflow: hidden; min-width: 0; }
.ct-card.is-main { background: linear-gradient(150deg, rgba(0,212,255,.1), rgba(0,255,136,.04) 55%, rgba(255,255,255,.02)); border-color: rgba(0,212,255,.3); }
.ct-card.is-main::after { content: ''; position: absolute; width: 340px; height: 340px; right: -120px; top: -160px; border-radius: 50%;
  background: radial-gradient(circle, rgba(0,212,255,.22), transparent 65%); pointer-events: none; }
.ct-kicker { font: .72rem var(--font-mono); letter-spacing: .1em; text-transform: uppercase; color: var(--fg-subtle); margin: 0 0 .6rem; display: flex; align-items: center; gap: .5rem; }
.ct-kicker i { width: 8px; height: 8px; border-radius: 50%; background: var(--accent-b); box-shadow: 0 0 10px var(--accent-b); }
.ct-big { display: block; font: 700 clamp(1.15rem, 3.6vw, 1.9rem)/1.2 var(--font-display); letter-spacing: -.02em; color: var(--fg);
  overflow-wrap: anywhere; margin: 0 0 1.2rem; user-select: all; -webkit-user-select: all; }
.ct-mid { display: block; font: 600 1.1rem var(--font-mono); color: var(--fg); margin: 0 0 1rem; overflow-wrap: anywhere; user-select: all; -webkit-user-select: all; }
.ct-row { display: flex; flex-wrap: wrap; gap: .6rem; position: relative; z-index: 1; }
.ct-btn { display: inline-flex; align-items: center; justify-content: center; gap: .5rem; min-height: 46px; padding: 0 1.15rem; border-radius: 12px;
  font: 600 .92rem var(--font-display); text-decoration: none; cursor: pointer; border: 1px solid rgba(0,212,255,.45); color: var(--fg);
  background: rgba(7,7,15,.5); transition: background .2s, border-color .2s, box-shadow .2s; touch-action: manipulation; }
.ct-btn:hover { border-color: var(--accent-a); background: rgba(0,212,255,.1); }
.ct-btn.is-primary { background: var(--accent-gradient); color: var(--on-accent); border-color: transparent; box-shadow: 0 8px 30px -10px rgba(0,212,255,.6); }
.ct-btn.is-primary:hover { box-shadow: 0 14px 40px -12px rgba(0,255,136,.65); }
.ct-btn svg { width: 17px; height: 17px; flex: none; }
.ct-btn:focus-visible, .ct-link:focus-visible { outline: 3px solid var(--accent-a); outline-offset: 3px; }
.ct-msg { min-height: 1.5em; margin: .8rem 0 0; font: .82rem var(--font-mono); color: var(--fg-muted); position: relative; z-index: 1; }
.ct-msg.is-ok { color: var(--accent-b); }
.ct-msg.is-warn { color: #ffd166; }
.ct-side { display: grid; gap: 1.25rem; }
.ct-card.is-main { display: flex; flex-direction: column; }
.ct-qr { margin: auto 0 0; padding-top: 1.25rem; display: flex; align-items: center; gap: 1rem; position: relative; z-index: 1; }
.ct-qr-box { padding: 8px; border-radius: 14px; background: #fff; line-height: 0; box-shadow: 0 0 0 1px rgba(0,212,255,.35), 0 18px 40px -18px rgba(0,212,255,.6); }
.ct-qr figcaption { font: .78rem/1.5 var(--font-mono); color: var(--fg-subtle); max-width: 14rem; }
.ct-links { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .85rem; margin-top: 1.25rem; list-style: none; padding: 0; }
.ct-link { position: relative; display: flex; flex-direction: column; gap: .55rem; height: 100%; padding: 1.1rem 1.1rem 1rem; border-radius: 16px;
  text-decoration: none; color: inherit; background: var(--surface-2); border: 1px solid var(--border); overflow: hidden;
  transition: border-color .25s, background .25s, transform .25s var(--ease-out), box-shadow .25s; }
.ct-link::before { content: ''; position: absolute; inset: 0 0 auto; height: 2px; background: linear-gradient(90deg, var(--c), transparent); opacity: .7; }
.ct-link:hover { border-color: color-mix(in srgb, var(--c) 70%, transparent); background: rgba(255,255,255,.06); box-shadow: 0 20px 50px -30px var(--c); }
@media (prefers-reduced-motion: no-preference) { .ct-link:hover { transform: translateY(-3px); } }
.ct-mark { width: 40px; height: 40px; border-radius: 11px; display: inline-flex; align-items: center; justify-content: center; flex: none;
  font: 800 .8rem var(--font-display); letter-spacing: -.02em; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--c) 40%, transparent); }
.ct-mark svg { width: 20px; height: 20px; }
.ct-link b { font: 700 1rem var(--font-display); color: var(--fg); display: flex; align-items: center; gap: .35rem; }
.ct-link b svg { width: 14px; height: 14px; color: var(--fg-subtle); transition: color .2s, transform .2s var(--ease-out); }
.ct-link:hover b svg { color: var(--c); transform: translate(2px, -2px); }
.ct-link small { font: .75rem var(--font-mono); color: var(--fg-subtle); overflow-wrap: anywhere; }
.ct-link .ct-note { font-size: .85rem; color: var(--fg-muted); }
.ct-sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
.ct-foot { margin-top: 3.5rem; padding-top: 1.75rem; border-top: 1px solid var(--border); display: flex; flex-wrap: wrap; gap: .75rem 1.5rem;
  justify-content: space-between; font: .8rem var(--font-mono); color: var(--fg-subtle); }
.ct-foot b { color: var(--fg-muted); font-weight: 500; }
@media (max-width: 899px) {
  .ct-qr { display: none; }
  .ct-grid { grid-template-columns: minmax(0, 1fr); }
  .ct-links { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 420px) {
  .ct-card { padding: 1.3rem 1.15rem; }
  .ct-row .ct-btn { flex: 1 1 auto; }
  .ct-link { padding: .95rem .9rem .9rem; }
}
`

const Icon = ({ d, fill }) => (
  <svg viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'} stroke={fill ? 'none' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {[].concat(d).map((p) => (
      <path key={p} d={p} />
    ))}
  </svg>
)
const COPY = ['M9 9h11v11H9z', 'M5 15H4V4h11v1']
const CHECK = 'M20 6 9 17l-5-5'
const MAIL = ['M4 5h16v14H4z', 'm4 7 8 6 8-6']
const DOWNLOAD = ['M12 4v11', 'm7 10 5 5 5-5', 'M5 20h14']
const QR = ['M4 4h6v6H4z', 'M14 4h6v6h-6z', 'M4 14h6v6H4z', 'M14 14h2v2h-2zM18 18h2v2h-2zM14 18h2v2h-2zM18 14h2v2h-2z']
const PHONE = 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z'
const OUT = 'M7 17 17 7M8 7h9v9'
const GH =
  'M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z'

// Magnetic pull toward the pointer (mouse only); inert under reduced motion.
function Magnetic({ as = 'button', className, children, ...rest }) {
  const reduce = useReducedMotion()
  const x = useSpring(useMotionValue(0), { stiffness: 300, damping: 20, mass: 0.5 })
  const y = useSpring(useMotionValue(0), { stiffness: 300, damping: 20, mass: 0.5 })
  const Tag = as === 'a' ? motion.a : motion.button
  const onPointerMove = (e) => {
    if (reduce || e.pointerType !== 'mouse') return
    const r = e.currentTarget.getBoundingClientRect()
    x.set(((e.clientX - r.left) / r.width - 0.5) * 10)
    y.set(((e.clientY - r.top) / r.height - 0.5) * 8)
  }
  const reset = () => {
    x.set(0)
    y.set(0)
  }
  return (
    <Tag className={className} style={reduce ? undefined : { x, y }} onPointerMove={onPointerMove} onPointerLeave={reset} onBlur={reset} {...rest}>
      {children}
    </Tag>
  )
}

// Selects the text of `el` so the visitor can copy it by hand.
function selectText(el) {
  try {
    const range = document.createRange()
    range.selectNodeContents(el)
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)
    return true
  } catch (e) {
    return false
  }
}

// Clipboard API first; then the legacy copy command on a selection; otherwise
// leave the text selected and tell the visitor how to copy it.
async function copyFrom(el, text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return 'copied'
    }
  } catch (e) {
    /* permission denied or unsupported: fall through */
  }
  const selected = el ? selectText(el) : false
  try {
    if (selected && document.execCommand && document.execCommand('copy')) return 'copied'
  } catch (e) {
    /* not allowed */
  }
  return selected ? 'selected' : 'failed'
}

function useStatus() {
  const [status, setStatus] = useState({ text: '', tone: '' })
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  const show = (text, tone, ms = 4000) => {
    clearTimeout(timer.current)
    setStatus({ text, tone })
    if (ms) timer.current = setTimeout(() => setStatus({ text: '', tone: '' }), ms)
  }
  return [status, show]
}

const shortcut = () =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? '⌘C' : 'Ctrl+C'

function CopyButton({ targetRef, text, label, onResult }) {
  const [done, setDone] = useState(false)
  useEffect(() => {
    if (!done) return undefined
    const t = setTimeout(() => setDone(false), 2000)
    return () => clearTimeout(t)
  }, [done])
  const run = async () => {
    const r = await copyFrom(targetRef.current, text)
    if (r === 'copied') setDone(true)
    onResult(r)
  }
  return (
    <Magnetic className="ct-btn is-primary" type="button" onClick={run}>
      <Icon d={done ? CHECK : COPY} />
      {done ? 'Copied' : `Copy ${label}`}
    </Magnetic>
  )
}

const ContactSection = ({ onOpenShareModal }) => {
  const ref = useRef(null)
  const emailRef = useRef(null)
  const phoneRef = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const [emailMsg, showEmailMsg] = useStatus()
  const [cardMsg, showCardMsg] = useStatus()
  const [year, setYear] = useState(null)
  useEffect(() => setYear(new Date().getUTCFullYear()), [])

  const copyResult = (show, what) => (r) => {
    if (r === 'copied') show(`${what} copied to clipboard`, 'ok')
    else if (r === 'selected') show(`Couldn't copy automatically. The ${what.toLowerCase()} is selected: press ${shortcut()} to copy it.`, 'warn', 9000)
    else show(`Couldn't copy automatically. Please copy the ${what.toLowerCase()} by hand.`, 'warn', 9000)
  }

  const downloadVCard = () => {
    try {
      const blob = new Blob([VCARD], { type: 'text/vcard;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'swaroop-as.vcf'
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      showCardMsg('Contact card downloaded (swaroop-as.vcf)', 'ok')
    } catch (e) {
      showCardMsg('Download failed. Use the QR code instead.', 'warn', 9000)
    }
  }

  const rise = (i = 0) => ({
    initial: { opacity: 0, y: 20 },
    animate: isInView ? { opacity: 1, y: 0 } : {},
    transition: { duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] },
  })

  return (
    <MotionConfig reducedMotion="user">
      <section id="contact" ref={ref} className="sx" aria-labelledby="contact-title" style={{ paddingBottom: '3rem' }}>
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div className="sx-wrap">
          <motion.div className="sx-head" {...rise()}>
            <div className="sx-tag">{'<contact>'}</div>
            <h2 id="contact-title" className="sx-title">Let's build something</h2>
            <p className="sx-lede">Open to conversations about AI on AWS, cloud architecture and platform engineering.</p>
          </motion.div>

          <div className="ct-grid">
            <motion.div className="ct-card is-main" {...rise(1)}>
              <p className="ct-kicker">
                <i aria-hidden="true" />
                Email · fastest reply
              </p>
              <span className="ct-big" ref={emailRef}>{contact.email}</span>
              <div className="ct-row">
                <CopyButton targetRef={emailRef} text={contact.email} label="email" onResult={copyResult(showEmailMsg, 'Email')} />
                <Magnetic as="a" className="ct-btn" href={`mailto:${contact.email}`}>
                  <Icon d={MAIL} />
                  Write an email
                </Magnetic>
              </div>
              <p className={`ct-msg${emailMsg.tone ? ` is-${emailMsg.tone}` : ''}`} role="status" aria-live="polite">
                {emailMsg.text}
              </p>
              {/* Desktop only: scan with a phone to save the same vCard. */}
              <figure className="ct-qr">
                <div className="ct-qr-box">
                  <QRCodeSVG value={VCARD} size={132} level="M" bgColor="#ffffff" fgColor="#07070f" title="QR code: save Swaroop's contact card" />
                </div>
                <figcaption>Scan with your phone to save my contact</figcaption>
              </figure>
            </motion.div>

            <div className="ct-side">
              <motion.div className="ct-card" {...rise(2)}>
                <p className="ct-kicker">Phone · Singapore</p>
                <span className="ct-mid" ref={phoneRef}>{contact.phone}</span>
                <div className="ct-row">
                  <Magnetic as="a" className="ct-btn" href={`tel:${contact.phone.replace(/[^+\d]/g, '')}`}>
                    <Icon d={PHONE} />
                    Call
                  </Magnetic>
                  <Magnetic className="ct-btn" type="button" aria-label="Copy phone number"
                    onClick={async () => copyResult(showCardMsg, 'Phone number')(await copyFrom(phoneRef.current, contact.phone))}>
                    <Icon d={COPY} />
                    Copy
                  </Magnetic>
                </div>
              </motion.div>
              <motion.div className="ct-card" {...rise(3)}>
                <p className="ct-kicker">Save or share</p>
                <div className="ct-row">
                  <Magnetic className="ct-btn is-primary" type="button" onClick={downloadVCard}>
                    <Icon d={DOWNLOAD} />
                    Save contact (.vcf)
                  </Magnetic>
                  {onOpenShareModal && (
                    <Magnetic className="ct-btn" type="button" onClick={onOpenShareModal} aria-haspopup="dialog">
                      <Icon d={QR} />
                      QR code &amp; share
                    </Magnetic>
                  )}
                </div>
                <p className={`ct-msg${cardMsg.tone ? ` is-${cardMsg.tone}` : ''}`} role="status" aria-live="polite">
                  {cardMsg.text}
                </p>
              </motion.div>
            </div>
          </div>

          <ul className="ct-links" aria-label="Profiles">
            {LINKS.map((l, i) => (
              <motion.li key={l.name} {...rise(4 + i)}>
                <a className="ct-link" href={l.url} target="_blank" rel="noopener noreferrer" style={{ '--c': l.color }}>
                  <span className="ct-mark" aria-hidden="true">
                    {l.mark === 'gh' ? <Icon d={GH} fill /> : l.mark}
                  </span>
                  <b>
                    {l.name}
                    <Icon d={OUT} />
                  </b>
                  <small>{l.handle}</small>
                  <span className="ct-note">{l.note}</span>
                  <em className="ct-sr"> (opens in a new tab)</em>
                </a>
              </motion.li>
            ))}
          </ul>

          <footer className="ct-foot">
            <span>
              <b>{NAME}</b> · {contact.location}
            </span>
            <span>
              {year ? `© ${year} · ` : '© '}Built with Gatsby, React, three.js &amp; Framer Motion
            </span>
          </footer>
        </div>
      </section>
    </MotionConfig>
  )
}

export default ContactSection
