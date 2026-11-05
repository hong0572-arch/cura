// 블로그 글(/blog/:id, /en/blog/:id)을 검색엔진·AI 크롤러가 읽을 수 있게 서버에서 HTML 머리말과 본문을 채운다.
// 글은 매일 cron 으로 늘어나 빌드 시 사전 렌더링할 수 없으므로 요청 때 spa.html 에 끼워 넣는다.
// - <head>: 제목·설명·canonical·hreflang·OG·Article JSON-LD (data-rh 를 붙여 화면이 뜨면 Helmet 이 교체)
// - 본문: #root 밖의 <article id="prerender-post"> — 브라우저에서는 main.jsx 가 시작할 때 지운다
import { blogImages, excerpt, postTitle, postBody } from '../../src/utils/blogImages.js';

export const SITE_URL = 'https://beyondthegate.kr';

export const escapeHtml = (text = '') => String(text)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const safeJson = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c');

const blogPath = (id, lang) => (lang === 'en' ? `/en/blog/${id}` : `/blog/${id}`);
const absolute = (src) => (src.startsWith('http') ? src : `${SITE_URL}${src}`);
const isoDate = (value) => (value?.toDate ? value.toDate().toISOString() : undefined);

// 굵게·링크 정도만 남기는 간단한 마크다운 → HTML (본문은 우리 cron 이 만든 글)
function inline(text) {
  return escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>');
}

const LIST_ITEM = /^\s*([-*]|\d+\.)\s+/;

export function markdownToHtml(markdown = '') {
  const out = [];
  let items = [];
  const flush = () => {
    if (items.length) out.push(`<ul>${items.map(item => `<li>${inline(item)}</li>`).join('')}</ul>`);
    items = [];
  };
  for (const raw of markdown.split('\n')) {
    const line = raw.trim();
    if (LIST_ITEM.test(line)) {
      items.push(line.replace(LIST_ITEM, ''));
      continue;
    }
    flush();
    if (!line || /^-{3,}$/.test(line)) continue;
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      const level = Math.min(Math.max(heading[1].length, 2), 3);
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
    } else {
      out.push(`<p>${inline(line.replace(/^>\s*/, ''))}</p>`);
    }
  }
  flush();
  return out.join('\n');
}

// 마크다운 기호를 걷어 낸 본문 (Article JSON-LD articleBody)
const plainText = (markdown = '') => markdown
  .replace(/^#+\s+/gm, '')
  .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  .replace(/[*_`>]+/g, '')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

export function renderBlogPage(template, post, lang) {
  const title = postTitle(post, lang);
  const body = postBody(post, lang);
  const description = excerpt(body, 155);
  const { cover } = blogImages(post);
  const url = `${SITE_URL}${blogPath(post.id, lang)}`;
  const koUrl = `${SITE_URL}${blogPath(post.id, 'ko')}`;
  const enUrl = `${SITE_URL}${blogPath(post.id, 'en')}`;
  const hasEn = Boolean(post.contentEn);

  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    image: [absolute(cover)],
    datePublished: isoDate(post.createdAt),
    dateModified: isoDate(post.updatedAt) || isoDate(post.createdAt),
    inLanguage: lang,
    mainEntityOfPage: url,
    articleBody: plainText(body),
    author: { '@type': 'Organization', name: 'Beyond the Gate', url: SITE_URL },
    publisher: { '@id': `${SITE_URL}/#organization` },
  };

  const rh = 'data-rh="true"';
  const head = [
    `<title>${escapeHtml(`${title} | Beyond the Gate`)}</title>`,
    `<meta ${rh} name="description" content="${escapeHtml(description)}" />`,
    `<link ${rh} rel="canonical" href="${url}" />`,
    `<link ${rh} rel="alternate" hreflang="ko" href="${koUrl}" />`,
    hasEn && `<link ${rh} rel="alternate" hreflang="en" href="${enUrl}" />`,
    `<link ${rh} rel="alternate" hreflang="x-default" href="${hasEn ? enUrl : koUrl}" />`,
    `<meta ${rh} property="og:type" content="article" />`,
    `<meta ${rh} property="og:site_name" content="Beyond the Gate" />`,
    `<meta ${rh} property="og:title" content="${escapeHtml(title)}" />`,
    `<meta ${rh} property="og:description" content="${escapeHtml(description)}" />`,
    `<meta ${rh} property="og:url" content="${url}" />`,
    `<meta ${rh} property="og:image" content="${escapeHtml(absolute(cover))}" />`,
    `<meta ${rh} name="twitter:card" content="summary_large_image" />`,
    `<script type="application/ld+json">${safeJson(article)}</script>`,
  ].filter(Boolean).join('\n    ');

  const staticArticle = `<article id="prerender-post" lang="${lang}"><h1>${escapeHtml(title)}</h1>\n${markdownToHtml(body)}</article>`;

  return template
    .replace(/<html[^>]*>/, `<html lang="${lang}">`)
    .replace(/<title>.*?<\/title>/s, '')
    .replace('</head>', `    ${head}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root"></div>\n    ${staticArticle}`);
}

// 블로그 사이트맵 — 글이 매일 늘어나므로 요청 때 Firestore 에서 만든다
export function buildBlogSitemap(posts) {
  const urls = posts.flatMap(post => {
    const lastmod = (isoDate(post.updatedAt) || isoDate(post.createdAt) || '').slice(0, 10);
    const hasEn = Boolean(post.contentEn);
    const koUrl = `${SITE_URL}${blogPath(post.id, 'ko')}`;
    const enUrl = `${SITE_URL}${blogPath(post.id, 'en')}`;
    const alternates = [
      `<xhtml:link rel="alternate" hreflang="ko" href="${koUrl}" />`,
      hasEn && `<xhtml:link rel="alternate" hreflang="en" href="${enUrl}" />`,
      `<xhtml:link rel="alternate" hreflang="x-default" href="${hasEn ? enUrl : koUrl}" />`,
    ].filter(Boolean).join('\n    ');
    return (hasEn ? [koUrl, enUrl] : [koUrl]).map(loc => `  <url>
    <loc>${loc}</loc>
    ${alternates}${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}
  </url>`);
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`;
}
