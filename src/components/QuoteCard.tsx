import { useState, useEffect } from 'react';
import { Heart, Share2, Eye, Trash2, Copy, Check, MessageSquare } from 'lucide-react';
import { Quote } from '../types';
import { doc, updateDoc, increment, deleteDoc, collection, setDoc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import CommentsModal from './CommentsModal';

interface QuoteCardProps {
  quote: Quote;
  currentUserId?: string | null;
  currentUserName?: string | null;
  currentUserPhotoURL?: string | null;
  isAdmin?: boolean;
  onQuoteDeleted?: (quoteId: string) => void;
  likedInitial?: boolean;
  onLikeToggled?: (quoteId: string, nowLiked: boolean) => void;
}

export default function QuoteCard({
  quote,
  currentUserId,
  currentUserName,
  currentUserPhotoURL,
  isAdmin,
  onQuoteDeleted,
  likedInitial = false,
  onLikeToggled
}: QuoteCardProps) {
  const [liked, setLiked] = useState(likedInitial);
  const [likesCount, setLikesCount] = useState(quote.likesCount);
  const [copied, setCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [views, setViews] = useState(quote.viewsCount || 0);
  const [commentsCount, setCommentsCount] = useState(quote.commentsCount || 0);
  const [showCommentsModal, setShowCommentsModal] = useState(false);

  // Sync state if initial changes
  useEffect(() => {
    setLiked(likedInitial);
  }, [likedInitial]);

  // Fetch initial liked state directly from nested subcollection
  useEffect(() => {
    if (currentUserId) {
      const checkLike = async () => {
        try {
          const likeDoc = await getDoc(doc(db, 'quotes', quote.id, 'likes', currentUserId));
          setLiked(likeDoc.exists());
        } catch (e) {
          console.warn('Silent like check failed:', e);
        }
      };
      checkLike();
    } else {
      setLiked(false);
    }
  }, [quote.id, currentUserId]);

  useEffect(() => {
    setLikesCount(quote.likesCount);
  }, [quote.likesCount]);

  useEffect(() => {
    setViews(quote.viewsCount);
  }, [quote.viewsCount]);

  // Log automated view increment once per component load per session
  useEffect(() => {
    const sessionRef = `viewed_quote_${quote.id}`;
    if (!sessionStorage.getItem(sessionRef)) {
      sessionStorage.setItem(sessionRef, 'true');
      
      const updateViews = async () => {
        try {
          const docRef = doc(db, 'quotes', quote.id);
          await updateDoc(docRef, {
            viewsCount: increment(1)
          });
          setViews(prev => prev + 1);
        } catch (e) {
          console.warn('Silent view registration failed or offline:', e);
        }
      };
      
      // Delay slightly to prevent race conditions during list loading
      const timeout = setTimeout(updateViews, 2000);
      return () => clearTimeout(timeout);
    }
  }, [quote.id]);

  const handleLike = async () => {
    if (!currentUserId) {
      alert('تکایە سەرەتا داخڵ بە بە هەژماری گووگڵ (Gmail) بۆ ئەوەی لایک بکەیت.');
      return;
    }

    const nextLiked = !liked;
    const diff = nextLiked ? 1 : -1;

    setLiked(nextLiked);
    setLikesCount(prev => Math.max(0, prev + diff));

    if (onLikeToggled) {
      onLikeToggled(quote.id, nextLiked);
    }

    try {
      // 1. Write the nested helper tracking doc
      const likeDocRef = doc(db, 'quotes', quote.id, 'likes', currentUserId);
      if (nextLiked) {
        await setDoc(likeDocRef, {
          userId: currentUserId,
          quoteId: quote.id,
          createdAt: new Date().toISOString()
        });
      } else {
        await deleteDoc(likeDocRef);
      }

      // 2. Update parent count
      const docRef = doc(db, 'quotes', quote.id);
      await updateDoc(docRef, {
        likesCount: increment(diff)
      });
    } catch (error) {
      // Revert UI states if it fails
      setLiked(!nextLiked);
      setLikesCount(prev => Math.max(0, prev - diff));
      console.error(error);
    }
  };

  const handleCopy = () => {
    const copyText = `«${quote.text}»\n— ${quote.author || 'پەند و وتەی پێشینان'}`;
    navigator.clipboard.writeText(copyText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleNativeShare = () => {
    const shareText = `«${quote.text}»\n— ${quote.author || 'پەند و وتەی پێشینان'}`;
    if (navigator.share) {
      navigator.share({
        title: 'وتەی زێڕین',
        text: shareText,
        url: window.location.href
      }).catch(console.error);
    } else {
      setShowShareModal(true);
    }
  };

  const handleDelete = async () => {
    if (!currentUserId) return;
    if (window.confirm('دلنیای لە سڕینەوەی ئەم وتە و پەندە زێڕینە؟')) {
      const path = `quotes/${quote.id}`;
      try {
        await deleteDoc(doc(db, 'quotes', quote.id));
        
        // Log action if Admin
        if (isAdmin) {
          const logId = `log_${Date.now()}`;
          await setDoc(doc(db, 'adminLogs', logId), {
            id: logId,
            eventType: 'post_deleted',
            userId: currentUserId,
            userEmail: 'admin_sys',
            userName: 'سەرپەرشتیار',
            timestamp: new Date().toISOString(),
            details: `وتەی ژمارە ${quote.id} سڕایەوە بەهۆی سەرپێچی یان کردار`
          });
        }

        if (onQuoteDeleted) {
          onQuoteDeleted(quote.id);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    }
  };

  // Convert English dates to beautiful Kurdish friendly string
  const formatKurdishDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('ku-IQ', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return 'چەند ساتێک لەمەوبەر';
    }
  };

  return (
    <div 
      className="relative bg-[#141414] border border-white/5 hover:border-white/10 rounded-2xl p-6 shadow-2xl hover:shadow-[0_8px_30px_rgb(0,0,0,0.5)] transition-all duration-300 flex flex-col justify-between"
      style={{ direction: 'rtl' }}
    >
      {/* Category Badge */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-sans font-semibold tracking-wider bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-full border border-amber-500/20">
          {quote.category || 'گشتی'}
        </span>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-sans">
          <Eye className="w-3.5 h-3.5" />
          <span>{views} بینین</span>
        </div>
      </div>

      {/* Main Say/Quote */}
      <div className="mb-6 flex-grow flex flex-col justify-center">
        <blockquote className="text-xl md:text-2xl font-serif leading-relaxed text-gray-100 text-center select-all">
          « {quote.text} »
        </blockquote>
        <div className="mt-4 flex flex-col items-center">
          <div className="h-[2px] w-8 bg-gradient-to-r from-transparent via-amber-400/50 to-transparent mb-2"></div>
          <cite className="not-italic font-bold text-amber-500 text-sm font-sans tracking-wide">
            {quote.author || 'پێشینان'}
          </cite>
        </div>
      </div>

      {/* Footer Info & Engagement */}
      <div className="border-t border-white/5 pt-4 flex items-center justify-between gap-2 mt-auto">
        
        {/* Poster identity */}
        <div className="flex items-center gap-2">
          {quote.userPhotoURL ? (
            <img 
              src={quote.userPhotoURL} 
              alt={quote.userDisplayName} 
              className="w-8 h-8 rounded-full border border-amber-500/30 object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-white/5 text-gray-400 flex items-center justify-center font-bold text-xs">
              {quote.userDisplayName ? quote.userDisplayName[0] : 'ك'}
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-gray-350">
              {quote.userDisplayName || 'مێوان'}
            </span>
            <span className="text-[9px] text-gray-500 font-sans">
              {formatKurdishDate(quote.createdAt)}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Like */}
          <button
            onClick={handleLike}
            className={`p-2 rounded-full cursor-pointer transition-all flex items-center gap-1 ${
              liked 
                ? 'bg-rose-500/15 text-rose-500 scale-105' 
                : 'hover:bg-white/5 text-gray-400 hover:text-rose-400'
            }`}
            title="دڵخوازی خۆم"
          >
            <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
            {likesCount > 0 && <span className="text-xs font-sans font-medium">{likesCount}</span>}
          </button>

          {/* Comment */}
          <button
            onClick={() => setShowCommentsModal(true)}
            className="p-2 rounded-full cursor-pointer transition-all flex items-center gap-1 hover:bg-white/5 text-gray-400 hover:text-amber-400"
            title="بۆچوونەکان"
          >
            <MessageSquare className="w-4 h-4" />
            {commentsCount > 0 && <span className="text-xs font-sans font-medium">{commentsCount}</span>}
          </button>

          {/* Copy Quote */}
          <button
            onClick={handleCopy}
            className={`p-2 rounded-full cursor-pointer transition-colors ${
              copied 
                ? 'bg-emerald-500/15 text-emerald-400' 
                : 'hover:bg-white/5 text-gray-400 hover:text-emerald-400'
            }`}
            title="کۆپیکردنی دەق"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>

          {/* Share */}
          <button
            onClick={handleNativeShare}
            className="p-2 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-colors cursor-pointer"
            title="بڵاوکردنەوە"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Delete (if owner or administrative access) */}
          {(currentUserId === quote.userId || isAdmin) && (
            <button
              onClick={handleDelete}
              className="p-2 rounded-full hover:bg-rose-500/15 text-rose-500 hover:text-rose-400 transition-colors cursor-pointer"
              title="سڕینەوەی پۆست"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Visual fallback share modal */}
      <AnimatePresence>
        {showShareModal && (
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowShareModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#141414] border border-white/10 p-6 rounded-2xl w-full max-w-sm text-center"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="font-bold text-gray-100 mb-3 text-lg leading-normal">بڵاوکردنەوەی ئەم وتەیە</h3>
              <p className="text-xs text-gray-500 mb-4 font-sans">هاوبەشی بکە بە کۆپیکردنی پیوندی فەرمی ماڵپەڕەکە یان دەقی وتەکە</p>
              
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => {
                    handleCopy();
                    setShowShareModal(false);
                  }}
                  className="flex items-center justify-center gap-2 w-full py-2 bg-amber-500 hover:bg-amber-400 font-bold text-black text-sm rounded-xl cursor-pointer shadow-lg shadow-amber-500/20 transition-all font-sans"
                >
                  <Copy className="w-4 h-4" />
                  کۆپیکردنی دەقی پۆستەکە
                </button>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="py-2 text-xs text-gray-400 hover:text-white border border-white/10 rounded-xl cursor-pointer font-sans"
                >
                  پاشگەزبوونەوە
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCommentsModal && (
          <CommentsModal
            quote={quote}
            currentUserId={currentUserId}
            currentUserName={currentUserName || undefined} 
            currentUserPhotoURL={currentUserPhotoURL || undefined}
            isAdmin={isAdmin}
            onClose={() => setShowCommentsModal(false)}
            onCommentAdded={() => setCommentsCount(prev => prev + 1)}
            onCommentDeleted={() => setCommentsCount(prev => Math.max(0, prev - 1))}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
