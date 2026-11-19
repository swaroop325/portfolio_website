import React, { useRef } from 'react'
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion'

const SPRING = { stiffness: 260, damping: 26, mass: 0.6 }
const TAGS = { a: motion.a, article: motion.article, div: motion.div }

// A card that tilts toward the cursor (mouse only) and carries a soft glare.
// The motion values start at 0, so the server render has no transform and
// hydration matches; under reduced motion the handlers simply do nothing.
export default function TiltCard({ as = 'div', max = 7, className = '', children, ...rest }) {
  const reduce = useReducedMotion()
  const ref = useRef(null)
  const rx = useSpring(useMotionValue(0), SPRING)
  const ry = useSpring(useMotionValue(0), SPRING)
  const Tag = TAGS[as] || motion.div

  const onPointerMove = (e) => {
    if (reduce || e.pointerType !== 'mouse' || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    ry.set((x - 0.5) * 2 * max)
    rx.set((0.5 - y) * 2 * max)
    ref.current.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`)
    ref.current.style.setProperty('--my', `${(y * 100).toFixed(1)}%`)
  }
  const onPointerLeave = () => {
    rx.set(0)
    ry.set(0)
  }

  return (
    <Tag
      ref={ref}
      className={`tc ${className}`.trim()}
      style={{ rotateX: rx, rotateY: ry }}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      {...rest}
    >
      {children}
    </Tag>
  )
}
