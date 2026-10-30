'use client';

import { useState, useEffect } from 'react';

export default function SplashScreen({ onFinish }) {
  const [showSplash, setShowSplash] = useState(true);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    // Prevent replaying splash on navigation (only play once per browser session)
    try {
      const hasShown = sessionStorage.getItem('suraksha_splash_shown');
      if (hasShown) {
        setShowSplash(false);
        if (onFinish) onFinish();
        return;
      }
    } catch (e) {
      // In case sessionStorage is blocked by security settings
    }

    setShowSplash(true);

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Handle completion event from iframe or fallback timer
    const completeSplash = () => {
      setFade(true);
      try {
        sessionStorage.setItem('suraksha_splash_shown', 'true');
      } catch (e) {}

      setTimeout(() => {
        setShowSplash(false);
        if (onFinish) onFinish();
      }, 500); // 500ms fade transition
    };

    if (prefersReducedMotion) {
      const timer = setTimeout(completeSplash, 400);
      return () => clearTimeout(timer);
    }

    // Message listener for iframe completion
    const handleMessage = (event) => {
      if (event.data && event.data.type === 'SURAKSHA_SPLASH_COMPLETE') {
        completeSplash();
      }
    };

    window.addEventListener('message', handleMessage);

    // Fallback safety timeout if postMessage is blocked (4.2s allows full 3.5s animation + buffer)
    const fallbackTimer = setTimeout(completeSplash, 4200);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(fallbackTimer);
    };
  }, [onFinish]);

  if (!showSplash) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-white flex items-center justify-center overflow-hidden transition-opacity duration-500 ease-out ${
        fade ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      aria-hidden="true"
    >
      <iframe
        src="/Assets/logo_Intro_animation.html"
        title="Suraksha AI Startup Animation"
        className="w-full h-full border-0 pointer-events-none select-none bg-white"
        tabIndex={-1}
      />
    </div>
  );
}
