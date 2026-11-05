import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import Root from './Root.jsx'
import { Analytics } from "@vercel/analytics/react"

// 사전 렌더링된 페이지는 빌드 시점의 사이트 데이터를 함께 싣고 온다 (scripts/prerender.mjs)
const initialSiteData = window.__SITE_DATA__ || null

const app = (
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <Root initialSiteData={initialSiteData} />
      </BrowserRouter>
    </HelmetProvider>
    <Analytics />
  </StrictMode>
)

// 블로그 글은 서버가 크롤러용 본문(#prerender-post)을 함께 보낸다 (api/_lib/blogPage.js) — 앱이 그리므로 지운다
document.getElementById('prerender-post')?.remove()

const container = document.getElementById('root')
if (container.hasChildNodes()) {
  hydrateRoot(container, app)
} else {
  createRoot(container).render(app)
}
