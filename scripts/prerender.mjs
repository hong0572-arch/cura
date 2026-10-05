// 빌드 후 실행: 공개 페이지를 HTML로 미리 렌더링해 검색엔진·AI 크롤러가 내용을 읽을 수 있게 한다.
//   npm run build  →  vite build (브라우저) + vite build --ssr (렌더러) + 이 스크립트
// 결과: dist/index.html, dist/about.html, dist/en.html, dist/en/about.html ... + sitemap.xml
//       dist/spa.html (결제·관리자 등 사전 렌더링하지 않는 경로용 빈 셸)
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const SITE_URL = 'https://beyondthegate.kr'
const PROJECT_ID = 'cura-1969a'

// 사전 렌더링할 공개 페이지 (한국어 경로 기준, 영어는 /en 접두사)
const PAGES = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/book-vehicle', priority: '0.9', changefreq: 'monthly' },
  { path: '/about', priority: '0.8', changefreq: 'monthly' },
  { path: '/blog', priority: '0.7', changefreq: 'daily' },
  { path: '/business', priority: '0.6', changefreq: 'monthly' },
  { path: '/terms', priority: '0.3', changefreq: 'yearly' },
  { path: '/privacy', priority: '0.3', changefreq: 'yearly' },
]

const enPath = (p) => (p === '/' ? '/en' : `/en${p}`)

// Firestore REST 응답(typed JSON)을 일반 객체로 변환
function fromFirestore(value) {
  if (value == null) return null
  if ('stringValue' in value) return value.stringValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return value.doubleValue
  if ('booleanValue' in value) return value.booleanValue
  if ('nullValue' in value) return null
  if ('timestampValue' in value) return value.timestampValue
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(fromFirestore)
  if ('mapValue' in value) {
    return Object.fromEntries(
      Object.entries(value.mapValue.fields || {}).map(([k, v]) => [k, fromFirestore(v)])
    )
  }
  return null
}

// 사이트 문구·이미지·가격 설정 (공개 문서). 실패하면 코드 기본값으로 렌더링한다.
async function fetchSiteData() {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/siteData/main`
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const doc = await res.json()
    const data = fromFirestore({ mapValue: { fields: doc.fields || {} } })
    // 공개 페이지에 비밀값이 실리지 않도록 방어적으로 제거
    if (data.settings?.system) delete data.settings.system.adminPassword
    if (data.settings?.chatbot) delete data.settings.chatbot.apiKey
    return data
  } catch (err) {
    console.warn(`[prerender] siteData 조회 실패, 기본 문구로 렌더링합니다: ${err.message}`)
    return null
  }
}

// 렌더링 결과 맨 앞에 붙는 head 용 태그들 (React 19 가 head 로 끌어올리는 title·meta·link 만)
// JSON-LD <script> 는 React 가 본문 요소로 다루므로 그 자리에 둔다 (옮기면 하이드레이션 불일치)
const HOISTABLE_PREFIX = /^(?:\s*(?:<title>[\s\S]*?<\/title>|<meta\b[^>]*>|<link\b[^>]*>))+/

// <script> 안에 넣어도 안전한 JSON
const safeJson = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c')

function buildSitemap() {
  const today = new Date().toISOString().slice(0, 10)
  const urls = PAGES.flatMap(({ path: p, priority, changefreq }) =>
    [p, enPath(p)].map(loc => `  <url>
    <loc>${SITE_URL}${loc}</loc>
    <xhtml:link rel="alternate" hreflang="ko" href="${SITE_URL}${p}" />
    <xhtml:link rel="alternate" hreflang="en" href="${SITE_URL}${enPath(p)}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}${enPath(p)}" />
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`))
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`
}

async function main() {
  // 사전 렌더링하지 않는 경로(결제, 관리자 등)는 빈 셸(spa.html)을 받는다.
  // 다시 실행해도 이미 렌더링된 index.html 을 템플릿으로 쓰지 않도록 spa.html 을 원본으로 보관한다.
  const spaPath = path.join(dist, 'spa.html')
  const indexPath = path.join(dist, 'index.html')
  const existingSpa = await fs.readFile(spaPath, 'utf8').catch(() => null)
  const template = existingSpa ?? await fs.readFile(indexPath, 'utf8')
  if (!template.includes('<div id="root"></div>')) {
    throw new Error('템플릿에 빈 <div id="root"></div> 가 없습니다. vite build 를 먼저 실행하세요.')
  }
  if (!existingSpa) await fs.writeFile(spaPath, template)

  const { render } = await import(pathToFileURL(path.join(root, 'dist-ssr', 'entry-server.js')).href)
  const siteData = await fetchSiteData()
  const dataScript = `<script>window.__SITE_DATA__=${safeJson(siteData)}</script>`

  const routes = PAGES.flatMap(({ path: p }) => [p, enPath(p)])
  for (const url of routes) {
    const rendered = render(url, siteData)
    // React 19 는 <title>·<meta>·<link>·JSON-LD 를 렌더링 결과 맨 앞에 출력한다 → <head> 로 옮긴다
    const hoisted = rendered.html.match(HOISTABLE_PREFIX)?.[0] || ''
    const html = rendered.html.slice(hoisted.length)
    const head = [rendered.head, hoisted].filter(Boolean).join('\n    ').replace(/hrefLang=/g, 'hreflang=')
    const lang = url === '/en' || url.startsWith('/en/') ? 'en' : 'ko'
    const page = template
      .replace(/<html[^>]*>/, `<html lang="${lang}">`)
      .replace(/<title>.*?<\/title>/s, '')
      .replace('</head>', `    ${head}\n  </head>`)
      .replace('<div id="root"></div>', `<div id="root">${html}</div>\n    ${dataScript}`)

    // cleanUrls: /about → about.html, /en → en.html, /en/about → en/about.html
    const file = url === '/' ? 'index.html' : `${url.slice(1)}.html`
    const out = path.join(dist, file)
    await fs.mkdir(path.dirname(out), { recursive: true })
    await fs.writeFile(out, page)
    console.log(`[prerender] ${url} → dist/${file}`)
  }

  await fs.writeFile(path.join(dist, 'sitemap.xml'), buildSitemap())
  console.log(`[prerender] sitemap.xml (${routes.length} URLs)`)
}

main().catch(err => {
  console.error('[prerender] 실패:', err)
  process.exit(1)
})
