import React, { useState } from 'react';
import { X, Send, User, ChevronDown, Check, Sparkles } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { Quote, KURDISH_CATEGORIES } from '../types';
import { motion } from 'motion/react';

interface CreateQuoteModalProps {
  currentUserId: string;
  currentUserName: string;
  currentUserPhotoURL?: string;
  currentUserEmail: string;
  onClose: () => void;
  onQuoteCreated: (newQuote: Quote) => void;
}

const AUTHOR_SUGGESTIONS = [
  'پەندی پێشینان',
  'مەحوی',
  'نالی',
  'هێمن موکریانی',
  'شێرکۆ بێکەس',
  'گۆران',
  'قانیع',
  'مەولوی',
  'سالم',
  'پیرەمێرد',
  'فۆلکلۆر',
  'جەلالەدینی ڕومی',
  'پابلۆ دیسۆ',
  'ناودارانی جیهان'
];

export default function CreateQuoteModal({
  currentUserId,
  currentUserName,
  currentUserPhotoURL,
  currentUserEmail,
  onClose,
  onQuoteCreated
}: CreateQuoteModalProps) {
  const [text, setText] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('Wisdom');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      setError('تکایە دەقی وتە یان پەندەکە بنووسە.');
      return;
    }
    if (text.length > 2000) {
      setError('دەقی وتە نابێت لە ٢٠٠٠ پیت زیاتر بێت.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const quoteId = `quote_${Date.now()}`;
    const selectedCategoryName = KURDISH_CATEGORIES.find(c => c.value === category)?.name || 'پەند';

    const newQuote: Quote = {
      id: quoteId,
      text: text.trim(),
      author: author.trim() || 'پەندی پێشینان',
      category: selectedCategoryName,
      userId: currentUserId,
      userDisplayName: currentUserName,
      userPhotoURL: currentUserPhotoURL || '',
      createdAt: new Date().toISOString(),
      likesCount: 0,
      viewsCount: 0,
      commentsCount: 0
    };

    const path = `quotes/${quoteId}`;
    try {
      // 1. Save quote to quote collection
      await setDoc(doc(db, 'quotes', quoteId), newQuote);

      // 2. Write admin activity log
      const logId = `log_${Date.now()}`;
      await setDoc(doc(db, 'adminLogs', logId), {
        id: logId,
        eventType: 'post_created',
        userId: currentUserId,
        userEmail: currentUserEmail,
        userName: currentUserName,
        timestamp: new Date().toISOString(),
        details: `پۆستێکی نوێی بڵاوکردەوە: «${newQuote.text.substring(0, 30)}...»`
      });

      onQuoteCreated(newQuote);
      onClose();
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    } finally {
      setSubmitting(false);
    }
  };

  const selectSuggestedAuthor = (name: string) => {
    setAuthor(name);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
      style={{ direction: 'rtl' }}
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.95, y: 15, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 15, opacity: 0 }}
        className="bg-[#141414] border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header decoration */}
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent px-6 py-5 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span className="font-bold text-gray-100 font-sans text-base">بڵاوکردنەوەی پەیڤ و پەیامێکی زێڕین</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/5 rounded-lg text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl text-xs font-sans leading-relaxed border border-rose-500/20" id="modal-error">
              {error}
            </div>
          )}

          {/* Text input area */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-400 font-sans">
              دەقی وتە یان پەندەکە *
            </label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="نوسینی پەندێکی پێشینان یاخود وتەیەکی زێڕین لەم شوێنە بنووسە..."
              rows={4}
              maxLength={2000}
              className="w-full px-4 py-3 bg-[#0f0f0f] border border-white/10 focus:border-amber-500 rounded-2xl resize-none font-serif text-lg leading-relaxed text-gray-100 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
              required
              id="quote-textarea"
            />
            <div className="text-left text-[10px] text-gray-500 font-sans">
              {text.length} / ٢٠٠٠ کاراکتەر
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category selection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-400 font-sans">
                هاوپۆل (بابەت)
              </label>
              <div className="relative">
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full appearance-none px-4 py-2.5 bg-[#0f0f0f] border border-white/10 focus:border-amber-500 rounded-xl font-sans text-xs text-gray-300 focus:outline-none cursor-pointer focus:ring-1 focus:ring-amber-500"
                  id="category-select"
                >
                  {KURDISH_CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                    <option className="bg-[#141414] text-gray-200" key={cat.id} value={cat.value}>{cat.name}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-500 absolute left-3 top-3.5 pointer-events-none" />
              </div>
            </div>

            {/* Author Input value */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-400 font-sans">
                خاوەنی وتەکە (یاخود لێکدەرەوە)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={author}
                  onChange={e => setAuthor(e.target.value)}
                  placeholder="بۆ نموونە: مەحوی، نالی یان فۆلکلۆر"
                  maxLength={100}
                  className="w-full px-4 py-2.5 bg-[#0f0f0f] border border-white/10 focus:border-amber-500 rounded-xl font-sans text-xs text-gray-100 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  id="author-input"
                />
                <User className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Quick recommendations Suggestions */}
          <div className="space-y-1.5">
            <span className="block text-[10px] font-bold text-gray-550 text-gray-500 font-sans">
              ناوەکان بەپێی خواستی زۆر بڵاوکراوە:
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto pr-1">
              {AUTHOR_SUGGESTIONS.map(name => (
                <button
                  key={name}
                  type="button"
                  onClick={() => selectSuggestedAuthor(name)}
                  className={`px-2 py-1 text-[10px] rounded-lg transition-colors font-sans cursor-pointer ${
                    author === name 
                      ? 'bg-amber-500 text-black font-bold shadow-lg shadow-amber-500/15' 
                      : 'bg-white/5 hover:bg-white/10 text-gray-400'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* Actions panel */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white border border-white/10 hover:bg-white/5 transition-all font-sans cursor-pointer"
              id="btn-close-modal"
            >
              پاشگەزبوونەوە
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-black bg-amber-500 hover:bg-amber-400 rounded-xl cursor-pointer shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
              id="btn-submit-quote"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? 'بڵاودەکرێتەوە...' : 'بڵاوکردنەوەی وتەکە'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
