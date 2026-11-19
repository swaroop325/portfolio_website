import React, { useRef } from 'react'
import { useInView } from 'framer-motion'

// LinkedIn's official post embed. The iframe (and every LinkedIn request) is
// mounted only once the slot nears the viewport; the server render is a plain
// placeholder plus a normal link, so it works without JS too.
export default function LinkedInEmbed({ post }) {
  const ref = useRef(null)
  const near = useInView(ref, { once: true, margin: '400px 0px' })
  const label = post.note ? `LinkedIn post: ${post.note}` : 'LinkedIn post'

  return (
    <figure ref={ref} className="wr-li">
      <div className="wr-li-frame">
        {near ? (
          <iframe src={post.embedUrl} title={label} loading="lazy" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        ) : (
          <div className="wr-li-wait" aria-hidden="true">
            Loading LinkedIn post…
          </div>
        )}
      </div>
      <figcaption>
        <span>{post.note || ''}</span>
        <a className="sx-link" href={post.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${label} on LinkedIn (opens in a new tab)`}>
          Open on LinkedIn
        </a>
      </figcaption>
    </figure>
  )
}
