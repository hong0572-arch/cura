import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { localizePath } from '../utils/locale';
import { blogImages, excerpt, postTitle, postBody, postDate } from '../utils/blogImages';
import './Blog.css';

const PAGE_SIZE = 12;

// 블로그 목록: 사진 카드 + 더 보기 (글 전문은 상세 페이지 /blog/:postId 에서)
function Blog({ lang }) {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const isEn = lang === 'en';

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const snapshot = await getDocs(query(collection(db, 'blog_posts'), orderBy('createdAt', 'desc')));
        setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(p => p.published !== false));
      } catch (error) {
        console.error('Error fetching blog posts:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  const open = (e, id) => {
    e.preventDefault();
    navigate(localizePath(`/blog/${id}`, lang));
  };

  const [featured, ...rest] = posts;

  return (
    <div className="blog-page">
      <section className="blog-hero on-navy">
        <div className="container">
          <p className="btg-eyebrow">{isEn ? 'Journal' : '저널'}</p>
          <h1 className="blog-hero-title">{isEn ? 'Airport & Korea Travel Guide' : '공항 의전 & 한국 여행 가이드'}</h1>
          <p className="blog-hero-sub">
            {isEn
              ? 'Practical notes on Incheon and Gimpo airports, VIP meet & assist, chauffeur travel and journeys across Korea.'
              : '인천·김포공항 이용 팁, VIP 의전, 차량 이동, 그리고 한국 여행에 도움이 되는 이야기를 전합니다.'}
          </p>
        </div>
      </section>

      <div className="container blog-body">
        {loading ? (
          <div className="blog-grid" aria-busy="true">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="blog-card blog-card--skeleton" />)}
          </div>
        ) : posts.length === 0 ? (
          <p className="blog-empty">{isEn ? 'No posts yet.' : '등록된 글이 없습니다.'}</p>
        ) : (
          <>
            {featured && (
              <a href={localizePath(`/blog/${featured.id}`, lang)} onClick={(e) => open(e, featured.id)} className="blog-featured btg-card">
                <span className="blog-featured-media">
                  <img src={blogImages(featured).cover} alt="" width="900" height="560" />
                </span>
                <span className="blog-featured-body">
                  <span className="btg-eyebrow">{isEn ? 'Latest' : '최신 글'} · {postDate(featured, lang)}</span>
                  <span className="blog-featured-title">{postTitle(featured, lang)}</span>
                  <span className="blog-card-excerpt">{excerpt(postBody(featured, lang), 220)}</span>
                  <span className="blog-read">{isEn ? 'Read article' : '글 읽기'} →</span>
                </span>
              </a>
            )}

            <div className="blog-grid">
              {rest.slice(0, visible).map(post => (
                <a key={post.id} href={localizePath(`/blog/${post.id}`, lang)} onClick={(e) => open(e, post.id)} className="blog-card btg-card">
                  <span className="blog-card-media">
                    <img src={blogImages(post).cover} alt="" loading="lazy" width="600" height="375" />
                  </span>
                  <span className="blog-card-body">
                    <span className="blog-card-date">{postDate(post, lang)}</span>
                    <span className="blog-card-title">{postTitle(post, lang)}</span>
                    <span className="blog-card-excerpt">{excerpt(postBody(post, lang))}</span>
                  </span>
                </a>
              ))}
            </div>

            {visible < rest.length && (
              <div className="blog-more">
                <button type="button" className="btg-btn btg-btn--ghost" onClick={() => setVisible(v => v + PAGE_SIZE)}>
                  {isEn ? 'Show more' : '더 보기'} ({rest.length - visible})
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Blog;
