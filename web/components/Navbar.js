'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import ShieldLogo from './ShieldLogo';
import NotificationCenter from './NotificationCenter';
import { LogOut, User, Users, Bot } from 'lucide-react';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if auth token exists in client storage and route is a dashboard route
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const isDashboardRoute = pathname ? pathname.startsWith('/dashboard') : false;
    setIsAuthenticated(!!token && isDashboardRoute);
  }, [pathname]);

  const handleLogout = () => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch (e) {}
    setIsAuthenticated(false);
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo and Title */}
        <Link href={isAuthenticated ? "/dashboard" : "/"} className="flex items-center gap-3 group select-none">
          {/* Shield mark - transparent, background-free, accurately sized */}
          <ShieldLogo className="w-9 h-9 sm:w-10 sm:h-10 group-hover:scale-105 transition-transform" />
          
          <div className="flex flex-col justify-center">
            <div className="font-bold text-base sm:text-lg tracking-tight text-[#032257] leading-tight">
              SURAKSHA <span className="text-[#0270F7]">AI</span>
            </div>
            <div className="text-[9px] sm:text-[10px] tracking-[0.2em] font-semibold text-[#64748B] uppercase">
              Intelligent Protection
            </div>
          </div>
        </Link>

        {/* Navigation links */}
        <nav className="flex items-center gap-2 sm:gap-3">
          {isAuthenticated ? (
            <>
              <Link
                href="/dashboard/assistant"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 rounded-xl transition-colors"
              >
                <Bot className="w-4 h-4 text-[#0270F7]" />
                <span className="hidden sm:inline">AI Assistant</span>
              </Link>
              <Link
                href="/dashboard/safe-route"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 rounded-xl transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                <span className="hidden sm:inline">Safe Route</span>
              </Link>
              <Link
                href="/dashboard/trusted-circle"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 rounded-xl transition-colors"
              >
                <Users className="w-4 h-4 text-[#0270F7]" />
                <span className="hidden sm:inline">Trusted Circle</span>
              </Link>
              <NotificationCenter />
              <Link
                href="/dashboard/profile"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 rounded-xl transition-colors"
              >
                <User className="w-4 h-4 text-[#0270F7]" />
                <span>Profile</span>
              </Link>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                title="Log out of your account"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-medium text-[#032257] hover:bg-slate-100 rounded-xl transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white bg-[#0270F7] hover:bg-[#0260D7] rounded-xl transition-colors shadow-xs"
              >
                Get Started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
