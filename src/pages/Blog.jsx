import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

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
    <div style={{ padding: '100px 20px', minHeight: '80vh', maxWidth: '800px', margin: '0 auto', color: '#fff' }}>
      <h1 style={{ marginBottom: '40px', textAlign: 'center', fontSize: '2.5rem' }}>Blog</h1>
      {loading ? (
        <p style={{ textAlign: 'center' }}>Loading posts...</p>
      ) : posts.length === 0 ? (
        <p style={{ textAlign: 'center' }}>No posts available.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          {posts.map(post => (
            <article key={post.id} style={{ background: '#111', padding: '30px', borderRadius: '8px', border: '1px solid #333' }}>
              <h2 style={{ marginBottom: '15px', color: '#d4af37' }}>{post.title}</h2>
              <div style={{ marginBottom: '20px', fontSize: '0.9rem', color: '#888' }}>
                <span>{post.author}</span> • <span>{post.createdAt?.toDate().toLocaleDateString() || 'Just now'}</span>
              </div>
              <div style={{ lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                {post.content}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default Blog;
