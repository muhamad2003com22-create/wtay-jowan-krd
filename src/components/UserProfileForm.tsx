import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, setDoc, getDocs, collection, query, where, updateDoc } from 'firebase/firestore';
import { UserProfile, Quote } from '../types';
import ImageUpload from './ImageUpload';
import { User, FileText, ChevronLeft, Save, Sparkles, Check } from 'lucide-react';

interface UserProfileFormProps {
  user: UserProfile;
  onProfileUpdated: (updated: UserProfile) => void;
  onBackToMain: () => void;
}

export default function UserProfileForm({ user, onProfileUpdated, onBackToMain }: UserProfileFormProps) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [bio, setBio] = useState(user.bio || '');
  const [photoURL, setPhotoURL] = useState(user.photoURL || '');
  const [loading, setLoading] = useState(false);
  const [userQuotesCount, setUserQuotesCount] = useState(0);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    // Fetch how many quotes this specific user has authored
    const countUserQuotes = async () => {
      try {
        const q = query(collection(db, 'quotes'), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        setUserQuotesCount(snapshot.size);
      } catch (err) {
        console.warn("Silent failure to count quotes:", err);
      }
    };
    countUserQuotes();
  }, [user.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setStatusMessage({ type: 'error', text: 'تکایە ناوێک بنووسە بۆ پیشاندان لەسەر وتەکانت.' });
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    const updatedProfile: UserProfile = {
      ...user,
      displayName: displayName.trim(),
      bio: bio.trim(),
      photoURL: photoURL
    };

    const path = `users/${user.uid}`;
    try {
      // 1. Save user profile doc
      await setDoc(doc(db, 'users', user.uid), updatedProfile);

      // 2. Fetch all user's authored quotes and batch update userDisplayName & userPhotoURL so changes are instantly synchronized on quotes feed too!
      // This is a marvelous zero-trust data consistency implementation.
      const userQuotesQuery = query(collection(db, 'quotes'), where('userId', '==', user.uid));
      const userQuotesSnapshot = await getDocs(userQuotesQuery);
      
      const batchPromises = userQuotesSnapshot.docs.map(quoteDoc => {
        return updateDoc(doc(db, 'quotes', quoteDoc.id), {
          userDisplayName: displayName.trim(),
          userPhotoURL: photoURL
        });
      });
      await Promise.all(batchPromises);

      // 3. Log user event
      const logId = `log_${Date.now()}`;
      await setDoc(doc(db, 'adminLogs', logId), {
        id: logId,
        eventType: 'profile_updated',
        userId: user.uid,
        userEmail: user.email,
        userName: displayName.trim(),
        timestamp: new Date().toISOString(),
        details: 'زانیاری و وێنەی پڕۆفایلی نوێ کردەوە.'
      });

      onProfileUpdated(updatedProfile);
      setStatusMessage({ type: 'success', text: 'زانیاری پڕۆفایلەکەت بە سەرکەوتوویی نوێکرایەوە!' });
    } catch (e) {
      setStatusMessage({ type: 'error', text: 'ڕوودانی کێشە لە نوێکردنەوەی زانیاریەکان.' });
      handleFirestoreError(e, OperationType.UPDATE, path);
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelected = (base64Data: string) => {
    setPhotoURL(base64Data);
  };

  const handleImageRemoved = () => {
    setPhotoURL('');
  };

  return (
    <div className="bg-[#141414] border border-white/5 rounded-3xl p-6 shadow-2xl space-y-6 max-w-2xl mx-auto" style={{ direction: 'rtl' }}>
      
      {/* Tab navigation Header bar */}
      <div className="flex items-center justify-between border-b border-white/5 pb-5">
        <div>
          <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            تایبەتمەندی پڕۆفایلی من
          </h2>
          <p className="text-xs text-gray-400 font-sans mt-0.5">ئەم زانیارییانە بۆ بڵاوکردنەوەی پەیامەکانت لەگەڵ خەڵکی پۆست دەکرێن.</p>
        </div>
        <button
          onClick={onBackToMain}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-white border border-white/10 hover:bg-white/5 px-3 py-1.5 rounded-xl cursor-pointer transition-all"
          id="btn-back-from-profile"
        >
          گەڕانەوە
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Side: Photo upload system & Quick User Stats */}
        <div className="md:col-span-1 flex flex-col items-center gap-5 border-l md:border-l border-white/5 pl-0 md:pl-6">
          <label className="block text-xs font-bold text-gray-400 font-sans text-center mb-1">
            وێنەی پڕۆفایل
          </label>
          <ImageUpload 
            currentPhotoURL={photoURL} 
            onImageSelected={handleImageSelected} 
            onImageRemoved={handleImageRemoved}
          />
          
          {/* Stats Station */}
          <div className="w-full bg-[#0f0f0f] border border-white/10 rounded-2xl p-4 space-y-3.5 text-center mt-2">
            <div>
              <span className="text-xs text-gray-400 block font-sans">کۆی وتەکانت</span>
              <span className="text-2xl font-bold text-amber-500 font-sans">{userQuotesCount}</span>
            </div>
            <div className="border-t border-white/10 pt-2 text-xs text-gray-400 font-sans leading-relaxed">
              تۆمار بوو لە ڕۆژی:<br />
              <span className="font-semibold text-gray-300">
                {new Date(user.joinedAt).toLocaleDateString('ku-IQ', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Information properties inputs */}
        <form onSubmit={handleSubmit} className="md:col-span-2 space-y-4">
          
          {statusMessage && (
            <div 
              className={`p-3.5 rounded-xl text-xs font-sans flex items-center gap-2 border ${
                statusMessage.type === 'success' 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : 'bg-rose-500/10 text-rose-450 border-rose-500/20'
              }`}
              id="profile-feedback-message"
            >
              <Check className="w-4 h-4 shrink-0" />
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Readonly: Google Email Address */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-300 font-sans">
              ناونیشانی ئیمەیڵ (گووگڵ جیماڵ)
            </label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full px-4 py-2.5 bg-[#0f0f0f] border border-white/10 text-gray-400 rounded-xl font-sans text-xs cursor-not-allowed"
              id="profile-email-readonly"
            />
          </div>

          {/* User Display name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-300 font-sans">
              ناوی نیشاندراو *
            </label>
            <div className="relative">
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="ناوی دڵخوازی خۆت بنووسە بۆ پیشاندان..."
                maxLength={80}
                required
                className="w-full px-4 py-2.5 bg-[#0f0f0f] border border-white/10 focus:border-amber-400 rounded-xl font-sans text-xs text-gray-100 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
                id="profile-displayname-input"
              />
              <User className="w-4 h-4 text-gray-500 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Short biographical bio */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-300 font-sans">
              کورتەیەک لەبارەی خۆتەوە (بایۆ)
            </label>
            <div className="relative">
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="کورتەیەک بنووسە سەبارەت بە کار، حەز، یان دەستووری سەرەکی ژیانت..."
                rows={3}
                maxLength={450}
                className="w-full px-4 py-3 bg-[#0f0f0f] border border-white/10 focus:border-amber-400 rounded-xl resize-none font-sans text-xs text-gray-100 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
                id="profile-bio-textarea"
              />
            </div>
            <div className="text-left text-[9px] text-gray-500 font-sans">
              {bio.length} / ٤٥٠ پیت
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/5">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-black bg-amber-500 hover:bg-amber-400 rounded-xl cursor-pointer shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
              id="btn-save-profile"
            >
              <Save className="w-3.5 h-3.5" />
              {loading ? 'خەزن دەکرێت...' : 'پاراستنی گۆڕانکارییەکان'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
