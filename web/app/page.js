'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Shield, Users, User, ArrowRight, Lock } from 'lucide-react';
import Navbar from '@/components/Navbar';
import SplashScreen from '@/components/SplashScreen';

export default function Home() {
  const [splashActive, setSplashActive] = useState(true);

  useEffect(() => {
    // Check if splash animation has already played in this browser session
    try {
      const hasShown = sessionStorage.getItem('suraksha_splash_shown');
      if (hasShown) {
        setSplashActive(false);
      }
    } catch (e) {}
  }, []);

  return (
    <>
      {/* Full-screen App Launch Splash Animation */}
      <SplashScreen onFinish={() => setSplashActive(false)} />

      {/* Main Application Container */}
      <div
        className={`min-h-screen bg-[#F8FAFC] flex flex-col transition-opacity duration-300 ${
          splashActive ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <Navbar />

        {/* Hero Section */}
        <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 pb-12 sm:pb-16 flex flex-col items-center text-center">
          {/* Brand Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0270F7]/10 text-[#0270F7] text-xs sm:text-sm font-semibold mb-6 shadow-2xs">
            <Shield className="w-4 h-4" /> Proactive Intelligent Protection
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-[#032257] tracking-tight max-w-3xl leading-tight sm:leading-snug">
            When you cannot ask for help, <span className="text-[#0270F7]">SURAKSHA AI</span> can respond.
          </h1>

          {/* Subtitle */}
          <p className="mt-5 text-base sm:text-lg text-[#64748B] max-w-2xl leading-relaxed">
            An AI-assisted personal safety platform designed to provide discreet emergency detection, real-time risk assessment, and continuous trusted circle connectivity.
          </p>

          {/* Hero CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 sm:gap-4 justify-center">
            <Link
              href="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#0270F7] hover:bg-[#0260D7] text-white text-sm sm:text-base font-semibold rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer"
            >
              <span>Get Protected Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-[#032257] text-sm sm:text-base font-semibold rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <span>Sign In to Dashboard</span>
            </Link>
          </div>

          {/* Product Feature Highlights — public marketing, no links to authenticated pages */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-3xl mt-14 text-left">
            {/* Feature: Silent SOS */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0270F7]/10 flex items-center justify-center text-[#0270F7]">
                <Shield className="w-5 h-5" />
              </div>
              <h2 className="text-sm font-bold text-[#032257]">Silent Emergency Response</h2>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Discreetly trigger an emergency alert using your voice or device — without attracting attention.
              </p>
            </div>

            {/* Feature: Trusted Circle */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0270F7]/10 flex items-center justify-center text-[#0270F7]">
                <Users className="w-5 h-5" />
              </div>
              <h2 className="text-sm font-bold text-[#032257]">Trusted Circle Alerts</h2>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Instantly notifies your most trusted family and friends with your live location during any emergency.
              </p>
            </div>

            {/* Feature: AI Risk Assessment */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0270F7]/10 flex items-center justify-center text-[#0270F7]">
                <User className="w-5 h-5" />
              </div>
              <h2 className="text-sm font-bold text-[#032257]">AI Risk Detection</h2>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Continuously monitors environmental audio and motion patterns to proactively assess safety risks.
              </p>
            </div>
          </div>

          {/* Security / Privacy Trust Badge */}
          <div className="mt-10 inline-flex items-center gap-2.5 px-4 py-2 bg-slate-100/80 border border-slate-200/60 rounded-full text-xs text-[#64748B]">
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span>Encrypted with JWT Authentication &amp; Multi-Tenant Data Isolation</span>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 py-6 text-center text-xs text-[#94A3B8]">
          © 2026 SURAKSHA AI — Intelligent Protection Platform
        </footer>
      </div>
    </>
  );
}
