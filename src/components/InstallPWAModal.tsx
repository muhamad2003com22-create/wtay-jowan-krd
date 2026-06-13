import React, { useState, useEffect } from 'react';
import { Download, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Define the beforeinstallprompt event type
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function InstallPWAModal() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Optional: Check if user already dismissed it recently
      const hasDismissed = localStorage.getItem('pwa_prompt_dismissed');
      if (!hasDismissed) {
        // Show the prompt after a slight delay to let the user see the app first
        setTimeout(() => setShowModal(true), 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setShowModal(false);
  };

  const handleDismiss = () => {
    setShowModal(false);
    // Remember that the user dismissed it so we don't annoy them constantly
    localStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  if (!showModal) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in"
        style={{ direction: 'rtl' }}
      >
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-[#141414] border border-[#2a2a2a] rounded-[2rem] w-full max-w-[360px] p-8 shadow-2xl relative"
        >
          {/* Close button top left */}
          <button 
            onClick={handleDismiss}
            className="absolute top-4 left-4 p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center text-center space-y-5">
            {/* Icon */}
            <div className="w-20 h-20 bg-amber-500 rounded-3xl flex items-center justify-center shadow-lg shadow-amber-500/20 mb-2">
              <Sparkles className="w-10 h-10 text-slate-950" />
            </div>

            <div className="space-y-3">
              <h3 className="text-xl font-bold text-gray-100 font-serif leading-snug">
                ئەپەکەت دابەزێنە سەر مۆبایلەکەت
                <span className="block text-amber-500 text-sm mt-1 font-sans">(PWA)</span>
              </h3>
              
              <p className="text-sm text-gray-400 font-sans leading-relaxed">
                بۆ بارکردنی خێراتری لاپەڕەکان، بەکارهێنانی سەرنجڕاکێش بە شێوازێکی هاوشێوەی ئەپی ڕەسەن و ئۆفلاین (بێ ئینتەرنێت)، بیخەرە سەر شاشەی سەرەکیت!
              </p>
            </div>

            <div className="flex gap-3 w-full pt-4">
              <button
                onClick={handleDismiss}
                className="flex-1 py-3.5 px-4 bg-white/5 hover:bg-white/10 text-gray-300 font-bold rounded-2xl text-sm transition-colors cursor-pointer"
              >
                پاشان
              </button>
              <button
                onClick={handleInstallClick}
                className="flex-[2] py-3.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                دابەزاندنی ئەپ
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
