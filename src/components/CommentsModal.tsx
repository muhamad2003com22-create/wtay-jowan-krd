import React, { useState, useEffect } from 'react';
import { X, Send, User, MessageSquare, Trash2 } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, setDoc, updateDoc, increment, deleteDoc } from 'firebase/firestore';
import { Quote, Comment } from '../types';
import { motion } from 'motion/react';

interface CommentsModalProps {
  quote: Quote;
  currentUserId?: string | null;
  currentUserName?: string;
  currentUserPhotoURL?: string;
  isAdmin?: boolean;
  onClose: () => void;
  onCommentAdded: () => void;
  onCommentDeleted: () => void;
}

export default function CommentsModal({
  quote,
  currentUserId,
  currentUserName,
  currentUserPhotoURL,
  isAdmin,
  onClose,
  onCommentAdded,
  onCommentDeleted
}: CommentsModalProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch comments using real-time listener
  useEffect(() => {
    const q = query(
      collection(db, 'quotes', quote.id, 'comments'),
      orderBy('createdAt', 'asc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedComments = snapshot.docs.map(doc => doc.data() as Comment);
      setComments(fetchedComments);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching comments: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [quote.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId || !newComment.trim() || newComment.length > 500) return;

    setSubmitting(true);
    const commentId = `comment_${Date.now()}`;
    const commentObj: Comment = {
      id: commentId,
      quoteId: quote.id,
      userId: currentUserId,
      userDisplayName: currentUserName || 'بەکارهێنەر',
      userPhotoURL: currentUserPhotoURL || '',
      text: newComment.trim(),
      createdAt: new Date().toISOString()
    };

    try {
      // 1. Create the comment document
      await setDoc(doc(db, 'quotes', quote.id, 'comments', commentId), commentObj);
      
      // 2. Increment comment count
      await updateDoc(doc(db, 'quotes', quote.id), {
        commentsCount: increment(1)
      });

      setNewComment('');
      onCommentAdded();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `quotes/${quote.id}/comments/${commentId}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!currentUserId) return;
    if (window.confirm('دڵنیای لە سڕینەوەی ئەم کۆمێنتە؟')) {
      try {
        await deleteDoc(doc(db, 'quotes', quote.id, 'comments', commentId));
        await updateDoc(doc(db, 'quotes', quote.id), {
          commentsCount: increment(-1)
        });
        onCommentDeleted();
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `quotes/${quote.id}/comments/${commentId}`);
      }
    }
  };

  const formatKurdishDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('ku-IQ', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch {
      return 'کەمێک پێش ئێستا';
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4 overflow-hidden animate-fade-in"
      style={{ direction: 'rtl' }}
      onClick={onClose}
    >
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="bg-[#141414] border-t sm:border border-white/10 sm:rounded-3xl rounded-t-3xl w-full max-w-lg h-[80vh] sm:h-[650px] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-white/5 px-6 py-4 border-b border-white/5 flex items-center justify-between shrink-0 rounded-t-3xl">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-amber-500" />
            <span className="font-bold text-gray-100 font-sans text-base">بۆچوونەکان</span>
            <span className="text-[10px] bg-white/10 text-gray-300 px-2 py-0.5 rounded-full">{comments.length}</span>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scroll-smooth">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center gap-2 opacity-50">
              <MessageSquare className="w-10 h-10 text-gray-500" />
              <p className="text-xs text-gray-400 font-sans">هێشتا هیچ بۆچوونێک نەنووسراوە. دەتوانیت یەکەم کەس بیت!</p>
            </div>
          ) : (
            comments.map(comment => (
              <div key={comment.id} className="flex gap-3 animate-fade-in">
                {comment.userPhotoURL ? (
                  <img 
                    src={comment.userPhotoURL} 
                    alt={comment.userDisplayName} 
                    className="w-8 h-8 rounded-full object-cover border border-white/10 mt-1 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-white/10 text-gray-400 flex items-center justify-center text-xs font-bold mt-1 shrink-0">
                    {comment.userDisplayName[0]}
                  </div>
                )}
                
                <div className="flex-1">
                  <div className="bg-white/5 rounded-2xl rounded-tr-none px-4 py-3 border border-white/5 relative group">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] font-bold text-amber-500/90">{comment.userDisplayName}</span>
                      <span className="text-[9px] text-gray-500 font-sans">{formatKurdishDate(comment.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-200 font-sans leading-relaxed break-words whitespace-pre-wrap">
                      {comment.text}
                    </p>

                    {(currentUserId === comment.userId || isAdmin) && (
                      <button 
                        onClick={() => handleDelete(comment.id)}
                        className="absolute -left-3 -bottom-3 p-1.5 bg-[#141414] border border-white/10 rounded-full text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500/10 hover:border-rose-500/30 cursor-pointer"
                        title="سڕینەوە"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 sm:p-6 border-t border-white/5 bg-[#0a0a0a] shrink-0 pb-safe">
          {currentUserId ? (
            <form onSubmit={handleSubmit} className="flex items-end gap-2 relative">
              <textarea
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="بۆچوونەکەت لێرە بنووسە..."
                className="flex-1 bg-white/5 border border-white/10 focus:border-amber-500 rounded-2xl px-4 py-3 text-sm text-gray-100 placeholder:text-gray-500 resize-none font-sans outline-none min-h-[50px] max-h-[120px]"
                rows={1}
                maxLength={500}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
              <button
                type="submit"
                disabled={!newComment.trim() || submitting}
                className="w-12 h-12 shrink-0 bg-amber-500 hover:bg-amber-400 text-black flex items-center justify-center rounded-2xl cursor-pointer disabled:opacity-50 transition-colors shadow-lg shadow-amber-500/20"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Send className="w-5 h-5 -ml-1" />
                )}
              </button>
            </form>
          ) : (
            <div className="text-center py-3 bg-white/5 rounded-2xl border border-white/5">
              <p className="text-xs text-gray-400 font-sans">
                بۆ نووسینی کۆمێنت، پێویستە سەرەتا{' '}
                <span className="text-amber-500 font-bold">چوونەژوورەوە</span> بکەیت.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
