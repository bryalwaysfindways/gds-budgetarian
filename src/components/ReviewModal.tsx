import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { useAuthStore } from '../store/useAuthStore';

interface ReviewModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (review: { rating: number; description: string; order: any }) => void;
  orderId: string;
  order?: any;
}

const ReviewModal: React.FC<ReviewModalProps> = ({ open, onClose, //onSubmit,
   orderId, order }) => {
  const { user } = useAuthStore();
  const [rating, setRating] = useState(0);
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (rating < 1 || rating > 5) {
      setError('Please provide a rating between 1 and 5.');
      return;
    }
    if (!description.trim()) {
      setError('Please write a review description.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      // Check for existing review for this order and user
      let alreadyReviewed = false;
      if (order && order.items && Array.isArray(order.items) && order.items.length > 0) {
        // Check for any review for any product in this order
        const productIds = order.items.map((item: any) => item.productId || item.id);
        const q = query(
          collection(db, 'reviews'),
          where('userId', '==', user?.id || order.userId),
          where('productId', 'in', productIds)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) alreadyReviewed = true;
      } else {
        // Fallback: check for review by orderId
        const q = query(
          collection(db, 'reviews'),
          where('userId', '==', user?.id || (order && order.userId)),
          where('orderId', '==', orderId)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) alreadyReviewed = true;
      }
      if (alreadyReviewed) {
        setError('You have already submitted a review for this order.');
        setSubmitting(false);
        return;
      }
      // If order has items, create a review for each product
      if (order && order.items && Array.isArray(order.items) && order.items.length > 0) {
        for (const item of order.items) {
          await addDoc(collection(db, 'reviews'), {
            productId: item.productId || item.id,
            userId: user?.id || order.userId,
            rating,
            description,
            createdAt: new Date(),
          });
        }
      } else {
        // Fallback: create a review for the order (single product or no items array)
        await addDoc(collection(db, 'reviews'), {
          orderId: orderId,
          productId: order?.productId || null,
          userId: user?.id || (order && order.userId),
          rating,
          description,
          createdAt: new Date(),
        });
      }
      alert('Review submitted!');
      onClose();
    } catch (err) {
      setError('Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
        <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-600" onClick={onClose}>&times;</button>
        <h2 className="text-xl font-bold mb-4">Leave a Review</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-1">Rating</label>
            <div className="flex items-center space-x-1">
              {[1,2,3,4,5].map(star => (
                <button
                  key={star}
                  type="button"
                  className={
                    star <= rating
                      ? 'text-yellow-400 text-2xl'
                      : 'text-gray-300 text-2xl'
                  }
                  onClick={() => setRating(star)}
                  aria-label={`Rate ${star}`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-1">Description</label>
            <textarea
              className="w-full border rounded p-2 min-h-[80px]"
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
              maxLength={500}
            />
          </div>
          {error && <div className="text-red-500 text-sm mb-3">{error}</div>}
          <div className="flex justify-end gap-2">
            <button type="button" className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300" onClick={onClose}>Cancel</button>
            <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewModal;
