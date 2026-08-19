import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';

export default function ReviewSystem({ t }) {
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({ name: '', rating: 5, text: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);

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

  const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString();
  };

  const displayedReviews = reviews.slice(0, 8);
  const remainingReviews = reviews.slice(8);

  const ReviewCard = ({ review }) => (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <h4 style={{ margin: 0 }}>{review.name}</h4>
        <div style={{ color: 'var(--gold-primary)' }}>
          {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
        </div>
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', opacity: 0.8, marginBottom: '12px' }}>
        {formatDate(review.createdAt)}
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{review.text}</p>
    </div>
  );

  return (
    <section className="section-padding" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <div className="container">
        <div className="section-header">
          <h2>Customer Reviews</h2>
          <p>What our clients say about us.</p>
        </div>
        
        <div className="grid-2" style={{ marginBottom: remainingReviews.length > 0 ? '20px' : '40px' }}>
          {loading ? (
            <p style={{ textAlign: 'center' }}>Loading reviews...</p>
          ) : reviews.length === 0 ? (
            <p style={{ textAlign: 'center' }}>No reviews yet. Be the first to leave one!</p>
          ) : (
            displayedReviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))
          )}
        </div>

        {remainingReviews.length > 0 && (
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <button 
              className="btn-premium secondary" 
              onClick={() => setShowModal(true)}
              style={{ padding: '10px 24px', cursor: 'pointer' }}
            >
              View All Reviews ({reviews.length})
            </button>
          </div>
        )}

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

      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999,
          display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'
        }}>
          <div className="glass-panel" style={{ 
            width: '100%', maxWidth: '800px', maxHeight: '85vh', 
            overflowY: 'auto', padding: '30px', position: 'relative',
            backgroundColor: 'var(--bg-primary)'
          }}>
            <button 
              onClick={() => setShowModal(false)}
              style={{
                position: 'absolute', top: '15px', right: '15px',
                background: 'none', border: 'none', color: 'var(--text-primary)',
                fontSize: '1.5rem', cursor: 'pointer'
              }}
            >
              &times;
            </button>
            <h3 style={{ marginBottom: '20px', textAlign: 'center' }}>All Reviews</h3>
            <div className="grid-2">
              {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
