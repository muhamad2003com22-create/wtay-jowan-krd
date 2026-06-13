import { useState } from 'react';
import { Sparkles, Search, LogIn, LogOut, ShieldAlert, User, Menu, X, Award } from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';
import { UserProfile } from '../types';

interface HeaderProps {
  user: UserProfile | null;
  onLogin: () => void;
  onLogout: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeTab: 'quotes' | 'profile' | 'admin';
  onChangeTab: (tab: 'quotes' | 'profile' | 'admin') => void;
}

export default function Header({
  user,
  onLogin,
  onLogout,
  searchQuery,
  onSearchChange,
  activeTab,
  onChangeTab
}: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check if they are admin based on either structural payload or whitelisted system email
  const isUserAdmin = user?.isAdmin || user?.email === 'muhamad2003.com22@gmail.com';

  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);

  return (
    <header className="sticky top-0 bg-[#0f0f0f]/80 backdrop-blur-md border-b border-white/10 z-40 text-gray-200" style={{ direction: 'rtl' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        
        {/* Brand identity */}
        <div 
          onClick={() => { onChangeTab('quotes'); setMobileMenuOpen(false); }}
          className="flex items-center gap-2 cursor-pointer shrink-0"
        >
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black shadow-md shadow-amber-500/20">
            <Sparkles className="w-5 h-5 fill-current" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-amber-500 tracking-wide text-sm font-sans leading-none">وتە زێڕینەکان</span>
            <span className="text-[10px] text-gray-400 font-sans mt-0.5 font-semibold">پەرتووکی هۆشیاری پێشینان</span>
          </div>
        </div>

        {/* Searching field (visible only if tab is quotes) */}
        {activeTab === 'quotes' && (
          <div className="hidden md:flex items-center relative flex-grow max-w-md mx-6">
            <input
              type="text"
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              placeholder="گەڕان بەدوای دێرەکان، تێکستەکان یان ناوی نوسەر..."
              className="w-full pl-4 pr-10 py-2 bg-white/5 border border-white/10 focus:border-amber-500 rounded-xl font-sans text-xs text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
              id="search-input-header"
            />
            <Search className="w-4 h-4 text-gray-500 absolute right-3 pointer-events-none" />
          </div>
        )}

        {/* Desktop Navigation Link options */}
        <div className="hidden md:flex items-center gap-5">
          <button
            onClick={() => onChangeTab('quotes')}
            className={`text-xs font-bold font-sans cursor-pointer transition-colors ${
              activeTab === 'quotes' ? 'text-amber-500' : 'text-gray-400 hover:text-white'
            }`}
          >
            ڕووپەڕی سەرەکی
          </button>

          {user && (
            <button
              onClick={() => onChangeTab('profile')}
              className={`text-xs font-bold font-sans cursor-pointer transition-colors ${
                activeTab === 'profile' ? 'text-amber-500' : 'text-gray-400 hover:text-white'
              }`}
            >
              پڕۆفایلی من
            </button>
          )}

          {user && isUserAdmin && (
            <button
              onClick={() => onChangeTab('admin')}
              className={`flex items-center gap-1 text-xs font-bold font-sans cursor-pointer text-amber-500 hover:text-amber-450 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-55 border-amber-500/20 transition-colors ${
                activeTab === 'admin' ? 'border-amber-500 bg-amber-500/25' : ''
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              ئەدمین پانێڵ
            </button>
          )}
        </div>

        {/* Auth controls dropdown or Log in */}
        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <div className="relative">
              {/* Profile button trigger */}
              <button 
                onClick={toggleDropdown}
                className="flex items-center gap-2 p-1.5 rounded-full hover:bg-white/5 border border-transparent hover:border-white/10 transition-all cursor-pointer"
                id="user-menu-button"
              >
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName}
                    className="w-8 h-8 rounded-full border border-amber-500/30 object-cover" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-white/10 text-gray-200 flex items-center justify-center font-bold text-xs">
                    {user.displayName[0]}
                  </div>
                )}
                <span className="hidden sm:inline-block text-xs font-bold text-gray-300 truncate max-w-[100px]">{user.displayName}</span>
              </button>

              {/* Dropdown contents */}
              {dropdownOpen && (
                <div 
                  className="absolute left-0 mt-3 w-48 bg-[#141414] border border-white/10 rounded-xl shadow-2xl py-1.5 z-50 animate-fade-in text-gray-200"
                  id="user-menu-dropdown"
                >
                  <div className="px-3 py-1.5 border-b border-white/5 text-xs text-gray-500 mb-1 shrink-0 truncate">
                    {user.email}
                  </div>
                  
                  <button
                    onClick={() => { onChangeTab('profile'); setDropdownOpen(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-white/5 text-right cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5 text-gray-450" />
                    دەستکاری پڕۆفایل
                  </button>

                  {isUserAdmin && (
                    <button
                      onClick={() => { onChangeTab('admin'); setDropdownOpen(false); }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs text-amber-500 hover:bg-white/5 text-right font-bold cursor-pointer"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                      کۆنتڕۆڵ پانێڵ
                    </button>
                  )}

                  <button
                    onClick={() => { onLogout(); setDropdownOpen(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 border-t border-white/5 text-right cursor-pointer"
                    id="btn-logout-dropdown"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-400" />
                    دەرچوون لە هەژمار
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onLogin}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-black bg-amber-500 hover:bg-amber-400 rounded-xl cursor-pointer shadow-lg shadow-amber-500/20 transition-all font-sans"
              id="btn-login"
            >
              <LogIn className="w-3.5 h-3.5" />
              چوونەژوورەوە بە جیماڵ
            </button>
          )}

          {/* Toggle button for custom mobile menus */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1 text-gray-400 hover:text-white md:hidden cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

      </div>

      {/* Mobile nav Drawer overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#0f0f0f] px-4 py-4 space-y-4 animate-fade-in text-gray-200">
          {activeTab === 'quotes' && (
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={e => onSearchChange(e.target.value)}
                placeholder="گەڕان بۆ وتە یان نوسەر..."
                className="w-full pl-4 pr-10 py-2 bg-white/5 border border-white/10 focus:border-amber-500 rounded-xl font-sans text-xs text-gray-100 placeholder:text-gray-500 focus:outline-none"
                id="search-input-mobile"
              />
              <Search className="w-4 h-4 text-gray-500 absolute right-3 top-2.5" />
            </div>
          )}

          <div className="flex flex-col gap-3 font-sans text-xs font-bold">
            <button
              onClick={() => { onChangeTab('quotes'); setMobileMenuOpen(false); }}
              className={`text-right p-2.5 rounded-xl ${activeTab === 'quotes' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/10' : 'text-gray-400 hover:bg-white/5'}`}
            >
              ڕووپەڕی سەرەکی
            </button>

            {user && (
              <button
                onClick={() => { onChangeTab('profile'); setMobileMenuOpen(false); }}
                className={`text-right p-2.5 rounded-xl ${activeTab === 'profile' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/10' : 'text-gray-400 hover:bg-white/5'}`}
              >
                پڕۆفایلی من
              </button>
            )}

            {user && isUserAdmin && (
              <button
                onClick={() => { onChangeTab('admin'); setMobileMenuOpen(false); }}
                className={`flex items-center justify-between p-2.5 rounded-xl text-amber-400 bg-amber-500/10 border border-amber-500/10 ${
                  activeTab === 'admin' ? 'bg-amber-500/20 border-amber-400' : ''
                }`}
              >
                <span>ئەدمین پانێڵ</span>
                <ShieldAlert className="w-4 h-4 text-amber-500" />
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
