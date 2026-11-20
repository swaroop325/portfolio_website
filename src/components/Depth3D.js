import { useEffect } from 'react'

// One delegated pointer handler gives every interactive surface real 3D depth:
// it tilts toward the cursor, lifts off the page (translateZ) and presses in
// on click. It uses the individual `rotate` / `translate` CSS properties, so it
// composes with framer-motion's own `transform` instead of fighting it.
// Mouse and pen only; touch gets the press-in. Does nothing under reduced motion.
const KINDS = [
  // [selector, max tilt (deg), lift (px)]
  ['.hx-btn, .ct-btn, .bw-btn, .sk-chip, .wr-chip, .xp-chip, .xp-toggle', 14, 12],
  ['.ct-link, .sk-repo, .sk-badge, .ws-repo, .bw-share-item', 14, 18],
  ['.ct-card, .sk-panel, .xp-card, .wr-li-block', 5, 14],
  ['.ct-mark, .ws-ico, .xp-logo, .hx-tag', 28, 22],
]

const find = (el) => {
  for (const [sel, tilt, lift] of KINDS) {
    const hit = el.closest(sel)
    if (hit) return { el: hit, tilt, lift }
  }
  return null
}

function apply(t, x, y) {
  // Axis-angle rotation: one `rotate` value that tilts on both axes.
  const rx = (0.5 - y) * 2 * t.tilt
  const ry = (x - 0.5) * 2 * t.tilt
  const ang = Math.hypot(rx, ry)
  const s = t.el.style
  s.willChange = 'rotate, translate'
  s.rotate = ang < 0.01 ? 'none' : `${rx.toFixed(3)} ${ry.toFixed(3)} 0 ${ang.toFixed(2)}deg`
  s.translate = `0 0 ${t.lift}px`
  s.setProperty('--d3-x', `${(x * 100).toFixed(1)}%`)
  s.setProperty('--d3-y', `${(y * 100).toFixed(1)}%`)
}

export default function Depth3D() {
  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return undefined

    let current = null
    let raf = 0
    let last = null
    const perspectiveOwner = new WeakMap()

    const settle = (el) => {
      if (!el) return
      el.classList.remove('d3-live', 'd3-press')
      el.style.rotate = ''
      el.style.translate = ''
      const parent = perspectiveOwner.get(el)
      if (parent) {
        setTimeout(() => {
          if (!current || current.el !== el) parent.style.perspective = ''
        }, 350)
      }
      setTimeout(() => {
        if (!current || current.el !== el) el.style.willChange = ''
      }, 400)
    }

    const enter = (t) => {
      if (current && current.el !== t.el) settle(current.el)
      current = t
      const parent = t.el.parentElement
      if (parent) {
        parent.style.perspective = '900px'
        perspectiveOwner.set(t.el, parent)
      }
      t.el.classList.add('d3-live')
    }

    const onMove = (e) => {
      if (e.pointerType === 'touch') return
      const t = find(e.target)
      if (!t) {
        if (current) {
          settle(current.el)
          current = null
        }
        return
      }
      if (!current || current.el !== t.el) enter(t)
      last = { t, e }
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        if (!last) return
        const r = last.t.el.getBoundingClientRect()
        // Rect already includes the current tilt; clamp keeps the edge stable.
        const x = Math.min(1, Math.max(0, (last.e.clientX - r.left) / r.width))
        const y = Math.min(1, Math.max(0, (last.e.clientY - r.top) / r.height))
        apply(last.t, x, y)
      })
    }
    const onLeaveWindow = () => {
      if (current) settle(current.el)
      current = null
    }
    const onDown = (e) => {
      const t = find(e.target)
      if (!t) return
      t.el.classList.add('d3-press')
      const up = () => {
        t.el.classList.remove('d3-press')
        window.removeEventListener('pointerup', up)
        window.removeEventListener('pointercancel', up)
      }
      window.addEventListener('pointerup', up)
      window.addEventListener('pointercancel', up)
    }

    document.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerdown', onDown, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeaveWindow)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerdown', onDown)
      document.documentElement.removeEventListener('pointerleave', onLeaveWindow)
      if (raf) cancelAnimationFrame(raf)
      if (current) settle(current.el)
    }
  }, [])
  return null
}
