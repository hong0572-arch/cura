import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import ReactMarkdown from 'react-markdown';

function Blog({ t }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const q = query(collection(db, 'blog_posts'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const fetchedPosts = [];
        querySnapshot.forEach((doc) => {
          fetchedPosts.push({ id: doc.id, ...doc.data() });
        });
        setPosts(fetchedPosts);
      } catch (error) {
        console.error('Error fetching blog posts:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  return (
    <div style={{ backgroundColor: 'var(--bg-secondary)', minHeight: '100vh', paddingTop: '100px', paddingBottom: '60px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 20px' }}>
        <h1 style={{ textAlign: 'center', fontSize: '2.8rem', color: 'var(--text-primary)', marginBottom: '50px', fontWeight: 'bold' }}>
          Beyond The Gate <span style={{ color: 'var(--gold-primary)' }}>Blog</span>
        </h1>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>게시글을 불러오는 중입니다...</div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>등록된 포스팅이 없습니다.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '50px' }}>
            {posts.map(post => (
              <article key={post.id} style={{ 
                backgroundColor: 'var(--bg-primary)', 
                borderRadius: '16px', 
                overflow: 'hidden',
                boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
                transition: 'transform 0.3s ease',
              }}>
                {post.mainImageUrl && (
                  <div style={{ width: '100%', height: '400px', overflow: 'hidden' }}>
                    <img src={post.mainImageUrl} alt="Main" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
                
                <div style={{ padding: '40px' }}>
                  <div style={{ marginBottom: '15px', fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                    <span style={{ color: 'var(--gold-primary)', marginRight: '10px' }}>{post.author}</span> • <span style={{ marginLeft: '10px' }}>{post.createdAt?.toDate().toLocaleDateString('ko-KR') || '방금 전'}</span>
                  </div>
                  
                  {/* Remove the # prefix if it's there in the title since we render it explicitly */}
                  <h2 style={{ marginBottom: '25px', color: 'var(--text-primary)', fontSize: '1.8rem', lineHeight: '1.4', fontWeight: 'bold' }}>
                    {post.title.replace(/^#+\s*/, '')}
                  </h2>
                  
                  <div style={{ 
                    lineHeight: '1.8', 
                    color: 'var(--text-secondary)',
                    fontSize: '1.05rem',
                  }}>
                    <ReactMarkdown>
                      {post.content.replace(/^#+\s+(.*)$/m, '') /* Remove the title from body */}
                    </ReactMarkdown>
                  </div>

                  {post.subImageUrl && (
                    <div style={{ width: '100%', height: '300px', overflow: 'hidden', marginTop: '30px', borderRadius: '12px' }}>
                      <img src={post.subImageUrl} alt="Sub" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Blog;
