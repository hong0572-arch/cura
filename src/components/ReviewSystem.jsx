import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';

export default function ReviewSystem({ t }) {
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({ name: '', rating: 5, text: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const fetchedReviews = [];
      querySnapshot.forEach((doc) => {
        fetchedReviews.push({ id: doc.id, ...doc.data() });
      });
      setReviews(fetchedReviews);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newReview.name || !newReview.text) return;
    
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        name: newReview.name,
        rating: newReview.rating,
        text: newReview.text,
        createdAt: new Date().toISOString()
      });
      setNewReview({ name: '', rating: 5, text: '' });
      fetchReviews();
    } catch (error) {
      console.error('Error adding review:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="section-padding" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <div className="container">
        <div className="section-header">
          <h2>Customer Reviews</h2>
          <p>What our clients say about us.</p>
        </div>
        
        <div className="grid-2" style={{ marginBottom: '40px' }}>
          {loading ? (
            <p style={{ textAlign: 'center' }}>Loading reviews...</p>
          ) : reviews.length === 0 ? (
            <p style={{ textAlign: 'center' }}>No reviews yet. Be the first to leave one!</p>
          ) : (
            reviews.map((review) => (
              <div key={review.id} className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0 }}>{review.name}</h4>
                  <div style={{ color: 'var(--gold-primary)' }}>
                    {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                  </div>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{review.text}</p>
              </div>
            ))
          )}
        </div>

        <div className="glass-panel" style={{ padding: '30px', maxWidth: '600px', margin: '0 auto' }}>
          <h3 style={{ marginBottom: '20px', textAlign: 'center' }}>Leave a Review</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input 
              type="text" 
              placeholder="Your Name" 
              value={newReview.name}
              onChange={(e) => setNewReview({...newReview, name: e.target.value})}
              style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              required
            />
            <select 
              value={newReview.rating}
              onChange={(e) => setNewReview({...newReview, rating: Number(e.target.value)})}
              style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            >
              {[5,4,3,2,1].map(num => <option key={num} value={num}>{num} Stars</option>)}
            </select>
            <textarea 
              placeholder="Your Review" 
              value={newReview.text}
              onChange={(e) => setNewReview({...newReview, text: e.target.value})}
              style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', minHeight: '100px', resize: 'vertical' }}
              required
            />
            <button type="submit" className="btn-premium primary" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
