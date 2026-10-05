import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import { HelmetProvider } from 'react-helmet-async'
import Root from './Root.jsx'

// 빌드 시 scripts/prerender.mjs 가 페이지마다 호출한다
export function render(url, initialSiteData) {
  const helmetContext = {}
  const html = renderToString(
    <StrictMode>
      <HelmetProvider context={helmetContext}>
        <StaticRouter location={url}>
          <Root initialSiteData={initialSiteData} />
        </StaticRouter>
      </HelmetProvider>
    </StrictMode>
  )
  const { helmet } = helmetContext
  const head = helmet
    ? [helmet.title, helmet.meta, helmet.link, helmet.script].map(part => part.toString()).join('\n    ')
    : ''
  const htmlAttributes = helmet ? helmet.htmlAttributes.toString() : ''
  return { html, head, htmlAttributes }
}
