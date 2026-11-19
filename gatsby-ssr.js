/**
 * Implement Gatsby's SSR (Server Side Rendering) APIs in this file.
 *
 * See: https://www.gatsbyjs.org/docs/ssr-apis/
 */
const React = require('react')

// Two Google Font families (display + mono) with display=swap. The stylesheet
// is injected by a tiny inline script so it never blocks first paint; text
// renders in the system fallback and swaps when the fonts arrive.
const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Space+Grotesk:wght@500;600;700&display=swap'

exports.onRenderBody = ({ setHeadComponents }) => {
  setHeadComponents([
    <link key="gf-pre" rel="preconnect" href="https://fonts.googleapis.com" />,
    <link key="gf-pre-s" rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />,
    <script
      key="gf-load"
      dangerouslySetInnerHTML={{
        __html: `(function(){var l=document.createElement('link');l.rel='stylesheet';l.href='${FONTS_HREF}';document.head.appendChild(l);})();`,
      }}
    />,
    <noscript key="gf-ns">
      <link rel="stylesheet" href={FONTS_HREF} />
    </noscript>,
  ])
}
