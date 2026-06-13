import { useEffect, useState } from 'react';
import { 
  auth, 
  db, 
  googleProvider, 
  handleFirestoreError, 
  OperationType 
} from './firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  collection, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { UserProfile, Quote, KURDISH_CATEGORIES } from './types';
import Header from './components/Header';
import QuoteCard from './components/QuoteCard';
import CreateQuoteModal from './components/CreateQuoteModal';
import UserProfileForm from './components/UserProfileForm';
import AdminPanel from './components/AdminPanel';
import InstallPWAModal from './components/InstallPWAModal';
import { 
  Sparkles, 
  Plus, 
  MessageSquare, 
  Bookmark, 
  ShieldAlert, 
  Info, 
  ScrollText, 
  Heart,
  ExternalLink,
  Home,
  UserCircle,
  LogIn
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'quotes' | 'profile' | 'admin'>('quotes');
  const [modalOpen, setModalOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // 1. Firebase Authentication Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setAuthLoading(true);
      if (firebaseUser) {
        try {
          // Fetch additional profile properties
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          let profile: UserProfile;

          if (userDoc.exists()) {
            profile = userDoc.data() as UserProfile;
            
            // Check for returning login logs (once per session)
            const sessionLoginLogged = sessionStorage.getItem(`login_logged_${firebaseUser.uid}`);
            if (!sessionLoginLogged) {
              sessionStorage.setItem(`login_logged_${firebaseUser.uid}`, 'true');
              const logId = `log_${Date.now()}`;
              await setDoc(doc(db, 'adminLogs', logId), {
                id: logId,
                eventType: 'login',
                userId: profile.uid,
                userEmail: profile.email,
                userName: profile.displayName,
                timestamp: new Date().toISOString(),
                details: 'بەکارهێنەر داخڵبوویەوە بە سایتپۆرتال.'
              });
            }
          } else {
            // First time joining (Google sign-up setup)
            profile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'کۆمەڵناس',
              photoURL: firebaseUser.photoURL || '',
              joinedAt: new Date().toISOString(),
              isAdmin: firebaseUser.email === 'muhamad2575@gmail.com' || firebaseUser.email === 'muhamad2003.com22@gmail.com' // Bootstrapped Admin check
            };

            await setDoc(userDocRef, profile);

            // Log the newcomer registration
            const logId = `log_${Date.now()}`;
            await setDoc(doc(db, 'adminLogs', logId), {
              id: logId,
              eventType: 'join',
              userId: profile.uid,
              userEmail: profile.email,
              userName: profile.displayName,
              timestamp: new Date().toISOString(),
              details: 'بەکارهێنەرێک بۆ یەکەمین جار تۆماربوو لە ڕێی تاقیکردنەوە.'
            });
            sessionStorage.setItem(`login_logged_${firebaseUser.uid}`, 'true');
          }

          setCurrentUser(profile);
        } catch (error) {
          console.error("Auth sync error:", error);
        }
      } else {
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Fetch all quotes/proverbs from Firestore
  const fetchAllQuotes = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'quotes'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const fetchedQuotes = snapshot.docs.map(doc => doc.data() as Quote);
      setQuotes(fetchedQuotes);
    } catch (error) {
      console.error("Error loading quotes list:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllQuotes();
  }, []);

  // Google sign in trigger
  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Google sign-in error:", error);
      alert("پرۆسەی چوونەژوورەوەی گووگڵ فەشەلی هێنا. تکایە دووبارە تاقی بکەرەوە.");
    }
  };

  // Logout trigger
  const handleLogout = async () => {
    try {
      if (window.confirm("دڵنیای لە دەرچوون لە هەژمارەکەت؟")) {
        await signOut(auth);
        setCurrentUser(null);
        setActiveTab('quotes');
      }
    } catch (e) {
      console.error("Logout failure:", e);
    }
  };

  // State callbacks
  const handleQuoteCreated = (newQuote: Quote) => {
    setQuotes(prev => [newQuote, ...prev]);
  };

  const handleQuoteDeleted = (quoteId: string) => {
    setQuotes(prev => prev.filter(q => q.id !== quoteId));
  };

  const handleProfileUpdated = (updatedUser: UserProfile) => {
    setCurrentUser(updatedUser);
  };

  // Filters logic
  const filteredQuotes = quotes.filter(quote => {
    const matchesCategory = selectedCategory === 'All' || quote.category === KURDISH_CATEGORIES.find(c => c.value === selectedCategory)?.name;
    const matchesSearch = (quote.text || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (quote.author || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (quote.userDisplayName || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Check if opened inside TikTok, Instagram, or Facebook in-app browser
  const isInAppBrowser = /FBAV|FBAN|Instagram|TikTok|Line|Snapchat/i.test(navigator.userAgent || '');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-amber-150 selection:bg-amber-50 selection:text-amber-800">
      
      {/* In-App Browser Warning Banner */}
      {isInAppBrowser && !currentUser && (
        <div className="bg-rose-600 text-white text-xs sm:text-sm text-center p-3 font-bold z-50 w-full shadow-lg" style={{ direction: 'rtl' }}>
          ⚠️ ئاگاداری: تۆ لەناو (تیکتۆک یان ئینستاگرام) ئەم لینکەت کردۆتەوە! تکایە لە سێ خاڵەکەی سەرەوە کلیک بکە و <span className="underline text-amber-200">Open in Browser (Chrome/Safari)</span> هەڵبژێرە بۆ ئەوەی بتوانیت داخڵ ببیت.
        </div>
      )}

      {/* Premium Header */}
      <Header 
        user={currentUser}
        onLogin={handleGoogleLogin}
        onLogout={handleLogout}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
      />

      {/* Main Content Areas */}
      <main className="flex-grow max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        
        {activeTab === 'quotes' && (
          <div className="space-y-8" style={{ direction: 'rtl' }}>
            
            {/* Elegant Hero Banner */}
            <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800 rounded-[2.5rem] p-8 md:p-12 text-center text-white shadow-xl shadow-slate-950/20">
              {/* Backdrops */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-orange-600/5 rounded-full blur-3xl pointer-events-none"></div>

              <div className="relative space-y-4 max-w-2xl mx-auto">
                <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider border border-amber-500/20">
                  <Bookmark className="w-3.5 h-3.5 fill-current" />
                  میراتی ڕۆشنبیری و ئەدەبی کوردی
                </span>
                
                <h1 className="text-3xl md:text-5xl font-serif font-black tracking-tight leading-tight md:leading-snug bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200">
                  فەرهەنگی وتە و پەندە زێڕینەکان
                </h1>
                
                <p className="text-slate-400 text-xs sm:text-sm font-sans max-w-lg mx-auto leading-relaxed">
                  تۆڕێکی خاوێن و دەوڵەمەند بۆ بەکۆمەڵکردنی قووڵترین گوتەی پێشینیان، شاعیران و بلیمەتانی نەتەوەکەمان. تۆش بەشداربە و وتەی دڵخوازت زیاد بکە.
                </p>

                {currentUser ? (
                  <button 
                    onClick={() => setModalOpen(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold border border-amber-400 rounded-2xl cursor-pointer shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 transition-all font-sans text-xs"
                    id="btn-headline-create"
                  >
                    <Plus className="w-4 h-4" />
                    پۆستکردنی وتەیەکی زێڕین
                  </button>
                ) : (
                  <button 
                    onClick={handleGoogleLogin}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/15 text-white font-bold border border-white/20 rounded-2xl cursor-pointer transition-all font-sans text-xs"
                    id="btn-headline-login"
                  >
                    چوونەژوورەوە و پۆستکردنی وتە
                    <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                  </button>
                )}
              </div>
            </section>

            {/* RTL Horizontal Category Navigation panel */}
            <section className="space-y-3">
              <span className="block text-xs font-bold text-slate-500 font-sans tracking-wide">هاوپۆلی وتەکان :</span>
              <div 
                className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none scroll-smooth snap-x"
                id="categories-scroller"
              >
                {KURDISH_CATEGORIES.map(category => (
                  <button
                    key={category.id}
                    onClick={() => { setSelectedCategory(category.value); }}
                    className={`px-4 py-2 shrink-0 rounded-2xl font-sans text-xs font-bold cursor-pointer transition-all snap-center ${
                      selectedCategory === category.value
                        ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/10'
                        : 'bg-white hover:bg-slate-100 border border-slate-150 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </section>

            {/* Display Quotes Masonry List Grid */}
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h2 className="text-sm font-bold text-slate-700 font-sans flex items-center gap-1.5">
                  <ScrollText className="w-4 h-4 text-amber-500" />
                  {selectedCategory === 'All' ? 'هەموو پەند و گوتە کورت کراوەکان' : KURDISH_CATEGORIES.find(c => c.value === selectedCategory)?.name}
                </h2>
                <span className="text-[10px] bg-slate-100 font-mono text-slate-500 px-2.5 py-1 rounded-full">{filteredQuotes.length} دانە دۆزرایەوە</span>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3" id="quotes-loader">
                  <div className="relative w-10 h-10">
                    <div className="absolute inset-0 rounded-full border-4 border-amber-200"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-amber-500 border-t-transparent animate-spin"></div>
                  </div>
                  <span className="text-xs text-slate-400 font-sans mt-2">تکایە چاوەڕوان بە... بارکردنی وتەکان</span>
                </div>
              ) : filteredQuotes.length === 0 ? (
                <div className="text-center py-20 bg-white border border-slate-100 rounded-3xl p-8 space-y-4 shadow-sm" id="empty-quotes-state">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                    <ScrollText className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-800 text-sm leading-normal">هیچ وتەیەک نەدۆزرایەوە!</h3>
                    <p className="text-xs text-slate-400 font-sans">هیچ دەرئەنجامێک بۆ هاوپۆل یان گەڕانەکەت لەم ماوەیەدا بوونی نییە.</p>
                  </div>
                  {currentUser && (
                    <button
                      onClick={() => setModalOpen(true)}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs cursor-pointer font-sans shadow-md"
                    >
                      ببەرە یەکەم پۆستکەر
                    </button>
                  )}
                </div>
              ) : (
                <div 
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  id="quotes-grid"
                >
                  {filteredQuotes.map(quote => (
                    <QuoteCard 
                      key={quote.id}
                      quote={quote}
                      currentUserId={currentUser?.uid}
                      currentUserName={currentUser?.displayName}
                      currentUserPhotoURL={currentUser?.photoURL}
                      isAdmin={currentUser?.isAdmin || currentUser?.email === 'muhamad2003.com22@gmail.com'}
                      onQuoteDeleted={handleQuoteDeleted}
                    />
                  ))}
                </div>
              )}
            </section>

          </div>
        )}

        {/* User profile view page */}
        {activeTab === 'profile' && currentUser && (
          <UserProfileForm 
            user={currentUser}
            onProfileUpdated={handleProfileUpdated}
            onBackToMain={() => setActiveTab('quotes')}
          />
        )}

        {/* Admin overview metrics page */}
        {activeTab === 'admin' && currentUser && (currentUser.isAdmin || currentUser.email === 'muhamad2003.com22@gmail.com') && (
          <AdminPanel currentUserId={currentUser.uid} />
        )}

      </main>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 z-50 px-6 py-3 flex justify-between items-center shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] pb-safe">
        <button 
          onClick={() => setActiveTab('quotes')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'quotes' ? 'text-amber-500' : 'text-slate-400'}`}
        >
          <Home className={`w-6 h-6 ${activeTab === 'quotes' ? 'fill-amber-500/20' : ''}`} />
          <span className="text-[10px] font-bold">سەرەکی</span>
        </button>

        {currentUser && (
          <button 
            onClick={() => setModalOpen(true)}
            className="bg-amber-500 text-slate-950 p-3 rounded-2xl shadow-lg shadow-amber-500/30 transform -translate-y-4"
          >
            <Plus className="w-6 h-6" />
          </button>
        )}

        {currentUser ? (
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center gap-1 ${activeTab === 'profile' ? 'text-amber-500' : 'text-slate-400'}`}
          >
            <UserCircle className={`w-6 h-6 ${activeTab === 'profile' ? 'fill-amber-500/20' : ''}`} />
            <span className="text-[10px] font-bold">پڕۆفایل</span>
          </button>
        ) : (
          <button 
            onClick={handleGoogleLogin}
            className="flex flex-col items-center gap-1 text-slate-400"
          >
            <LogIn className="w-6 h-6" />
            <span className="text-[10px] font-bold">چوونەژوورەوە</span>
          </button>
        )}
      </div>

      {/* Floating Action Post Button strictly in corner (for logged-in users and only if quotes tab is active) */}
      {activeTab === 'quotes' && currentUser && (
        <button
          onClick={() => setModalOpen(true)}
          className="hidden md:flex fixed bottom-6 right-6 p-4 rounded-full bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/35 hover:scale-105 transition-all z-30 cursor-pointer"
          title="پۆستکردنی وتە"
          id="btn-floating-create"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Composition Modal box overlay */}
      <AnimatePresence>
        {modalOpen && currentUser && (
          <CreateQuoteModal 
            currentUserId={currentUser.uid}
            currentUserName={currentUser.displayName}
            currentUserPhotoURL={currentUser.photoURL}
            currentUserEmail={currentUser.email}
            onClose={() => setModalOpen(false)}
            onQuoteCreated={handleQuoteCreated}
          />
        )}
      </AnimatePresence>
      
      {/* Traditional Humble Footer */}
      <footer className="bg-white border-t border-slate-100 py-6 text-center text-slate-400 text-xs font-sans mt-auto mb-16 md:mb-0">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} وتە و پەندە زێڕینەکان. سەرجەم مافەکان پارێزراون کاتەکان.</p>
          <div className="flex gap-4">
            <span className="hover:text-amber-500 transition-colors cursor-default">زمانی فەرمی: کوردی</span>
            <span>•</span>
            <span className="hover:text-amber-500 transition-colors cursor-default">پارتیزانی ئەدەبی</span>
          </div>
        </div>
      </footer>

      {/* Install PWA Modal */}
      <InstallPWAModal />

    </div>
  );
}
