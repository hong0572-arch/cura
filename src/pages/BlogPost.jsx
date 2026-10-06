import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { doc, getDoc, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import ReactMarkdown from 'react-markdown';
import { db } from '../firebase';
import { localizePath, SITE_URL } from '../utils/locale';
import { blogImages, excerpt, postTitle, postBody, postDate } from '../utils/blogImages';
import './Blog.css';

// 본문을 두 번째 소제목 앞에서 나눠 중간에 사진을 넣는다
function splitBody(markdown) {
  const parts = markdown.split(/\n(?=##\s)/);
  if (parts.length < 3) {
    const paras = markdown.split(/\n{2,}/);
    const mid = Math.max(1, Math.floor(paras.length / 2));
    return [paras.slice(0, mid).join('\n\n'), paras.slice(mid).join('\n\n')];
  }
  return [parts.slice(0, 2).join('\n'), parts.slice(2).join('\n')];
}

// '**…**' 바로 뒤에 한글 조사가 붙으면 Markdown 이 굵게 처리하지 못한다 ('…'**는).
// 굵은 글씨를 링크 형태로 바꿔 두고 렌더링할 때 <strong> 으로 되돌린다.
const BOLD_HREF = '#btg-bold';
const protectBold = (md) => md.replace(/\*\*([^*\n]+?)\*\*/g, (_, inner) => `[${inner.replace(/[[\]]/g, '')}](${BOLD_HREF})`);
const mdComponents = {
  a: ({ href, children, ...props }) => (href === BOLD_HREF
    ? <strong>{children}</strong>
    : <a href={href} {...props} target={href?.startsWith('http') ? '_blank' : undefined} rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}>{children}</a>),
};

const readingMinutes = (text) => Math.max(1, Math.round(text.replace(/\s+/g, ' ').length / (text.match(/[가-힣]/) ? 500 : 1100)));

export default function BlogPost({ lang }) {
  const { postId } = useParams();
  const navigate = useNavigate();
  const isEn = lang === 'en';
  const [post, setPost] = useState(null);
  const [related, setRelated] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | missing

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'blog_posts', postId));
        if (cancelled) return;
        if (!snap.exists() || snap.data().published === false) {
          setStatus('missing');
          return;
        }
        setPost({ id: snap.id, ...snap.data() });
        setStatus('ready');
        const latest = await getDocs(query(collection(db, 'blog_posts'), orderBy('createdAt', 'desc'), limit(4)));
        if (!cancelled) setRelated(latest.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.id !== postId).slice(0, 3));
      } catch (error) {
        console.error('Blog post load failed:', error);
        if (!cancelled) setStatus('missing');
      }
    })();
    return () => { cancelled = true; };
  }, [postId]);

  const go = (e, path) => {
    e.preventDefault();
    navigate(localizePath(path, lang));
  };

  if (status === 'loading') {
    return <div className="post-page"><div className="post-loading" aria-busy="true">{isEn ? 'Loading…' : '불러오는 중…'}</div></div>;
  }
  if (status === 'missing') {
    return (
      <div className="post-page">
        <div className="container post-missing">
          <h1>{isEn ? 'Post not found' : '글을 찾을 수 없습니다'}</h1>
          <a className="btg-btn btg-btn--primary" href={localizePath('/blog', lang)} onClick={(e) => go(e, '/blog')}>{isEn ? 'All articles' : '전체 글 보기'}</a>
        </div>
      </div>
    );
  }

  const title = postTitle(post, lang);
  const body = protectBold(postBody(post, lang));
  const [first, second] = splitBody(body);
  const { cover, inline } = blogImages(post);
  const description = excerpt(body, 155);
  const path = `/blog/${post.id}`;
  const url = `${SITE_URL}${localizePath(path, lang)}`;
  const absolute = (src) => (src.startsWith('http') || src.startsWith('data:') ? src : `${SITE_URL}${src}`);
  const created = post.createdAt?.toDate ? post.createdAt.toDate().toISOString() : undefined;

  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    image: [absolute(cover)],
    datePublished: created,
    inLanguage: isEn ? 'en' : 'ko',
    mainEntityOfPage: url,
    author: { '@type': 'Organization', name: 'Beyond the Gate' },
    publisher: { '@id': `${SITE_URL}/#organization` },
  };

  return (
    <div className="post-page">
      <Helmet>
        <title>{`${title} | Beyond the Gate`}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={url} />
        <link rel="alternate" hrefLang="ko" href={`${SITE_URL}${path}`} />
        {post.contentEn && <link rel="alternate" hrefLang="en" href={`${SITE_URL}${localizePath(path, 'en')}`} />}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={url} />
        <meta property="og:image" content={absolute(cover)} />
        <script type="application/ld+json">{JSON.stringify(article)}</script>
      </Helmet>

      <header className="post-hero on-navy">
        <div className="container post-hero-inner">
          <a className="post-back" href={localizePath('/blog', lang)} onClick={(e) => go(e, '/blog')}>← {isEn ? 'Journal' : '저널'}</a>
          <p className="btg-eyebrow">{postDate(post, lang)} · {readingMinutes(body)} {isEn ? 'min read' : '분 읽기'}</p>
          <h1 className="post-title">{title}</h1>
        </div>
      </header>

      <div className="container">
        <figure className="post-cover">
          <img src={cover} alt={(isEn ? post.mainImageAltEn : post.mainImageAlt) || ''} width="1200" height="640" />
        </figure>

        <article className="post-body">
          <ReactMarkdown components={mdComponents}>{first}</ReactMarkdown>
          {second && inline && (
            <figure className="post-inline">
              <img src={inline} alt={(isEn ? post.subImageAltEn : post.subImageAlt) || ''} loading="lazy" width="900" height="520" />
            </figure>
          )}
          {second && <ReactMarkdown components={mdComponents}>{second}</ReactMarkdown>}
        </article>

        <aside className="post-cta btg-panel">
          <div>
            <p className="btg-eyebrow">{isEn ? 'Plan with us' : '함께 준비하세요'}</p>
            <h2 className="post-cta-title">{isEn ? 'Arrive in Korea the easy way.' : '한국 도착의 순간부터 편안하게.'}</h2>
            <p className="post-cta-text">
              {isEn
                ? 'Book VIP meet & assist or a private chauffeur online, or tell us about the trip you have in mind.'
                : 'VIP 공항 의전과 전용 차량을 온라인으로 바로 예약하거나, 원하시는 여행을 알려 주세요.'}
            </p>
          </div>
          <div className="post-cta-actions">
            <a className="btg-btn btg-btn--gold btg-sheen" href={localizePath('/#hero', lang)} onClick={(e) => go(e, '/#hero')}>{isEn ? 'Book airport VIP' : '공항 의전 예약'}</a>
            <a className="btg-btn post-cta-ghost" href={localizePath('/private-journeys', lang)} onClick={(e) => go(e, '/private-journeys')}>Private Journeys</a>
          </div>
        </aside>

        {related.length > 0 && (
          <section className="post-related">
            <h2 className="post-related-title">{isEn ? 'More from the journal' : '다른 글'}</h2>
            <div className="blog-grid">
              {related.map(item => (
                <a key={item.id} href={localizePath(`/blog/${item.id}`, lang)} onClick={(e) => go(e, `/blog/${item.id}`)} className="blog-card btg-card">
                  <span className="blog-card-media"><img src={blogImages(item).cover} alt="" loading="lazy" width="600" height="375" /></span>
                  <span className="blog-card-body">
                    <span className="blog-card-date">{postDate(item, lang)}</span>
                    <span className="blog-card-title">{postTitle(item, lang)}</span>
                  </span>
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
