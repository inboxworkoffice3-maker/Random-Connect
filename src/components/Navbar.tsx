import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Globe,
  User as UserIcon,
  Shield,
  HelpCircle,
  LogOut,
  Sparkles,
  LayoutDashboard,
  MessageCircle,
  Smartphone,
} from 'lucide-react';

interface NavbarProps {
  onOpenProfile: () => void;
  onOpenSupport: () => void;
  onOpenAdmin: () => void;
  onOpenRules: () => void;
  onOpenLegal: (tab: 'terms' | 'privacy' | 'deletion') => void;
  onOpenShare: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenProfile,
  onOpenSupport,
  onOpenAdmin,
  onOpenRules,
  onOpenShare,
}) => {
  const { user, profile, isAdmin, signInWithGoogle, signOutUser } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-slate-950/85 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => window.location.reload()}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-indigo-600 to-emerald-500 p-0.5 shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-xl tracking-tight text-white font-['Plus_Jakarta_Sans']">
                Random<span className="text-indigo-400">Connect</span>
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                🇮🇳 IN
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">
              100% Private • Safe & Verified
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          
          {/* Language Switcher */}
          <button
            onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-medium border border-slate-700/60 transition-colors"
            title={t('switchLanguage')}
          >
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-semibold">{language === 'en' ? 'हिन्दी' : 'English'}</span>
          </button>

          {/* Open on Phone / Share Button */}
          <button
            onClick={onOpenShare}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-950/70 hover:bg-indigo-900/80 text-indigo-300 text-xs font-semibold border border-indigo-700/60 shadow-sm transition-colors"
            title="Open on another phone / Share QR code"
          >
            <Smartphone className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span className="hidden sm:inline">
              {language === 'hi' ? 'फ़ोन में चलाएं' : 'Open on Phone'}
            </span>
          </button>

          {/* Safety & Guidelines */}
          <button
            onClick={onOpenRules}
            className="hidden md:flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-800"
          >
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t('safety')}</span>
          </button>

          {/* Customer Support Hub (Direct WhatsApp & Tickets) */}
          <button
            onClick={onOpenSupport}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 text-xs font-medium border border-emerald-800/60 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">{t('support')}</span>
          </button>

          {/* Admin Dashboard / Login */}
          <button
            onClick={onOpenAdmin}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 text-xs font-medium border border-amber-800/60 transition-colors"
            title="Owner Admin Portal"
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Admin</span>
          </button>

          {/* User Auth Section */}
          {user ? (
            <div className="flex items-center space-x-2">
              <button
                onClick={onOpenProfile}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-left transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-xs font-bold text-indigo-300">
                  {profile?.displayName?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="hidden lg:block">
                  <div className="text-xs font-bold text-slate-200">
                    {profile?.displayName || 'User'}
                  </div>
                  <div className="text-[10px] text-indigo-400 font-mono">
                    {profile?.publicId || 'RC-USER'}
                  </div>
                </div>
              </button>

              <button
                onClick={signOutUser}
                className="p-2 rounded-lg bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-800 transition-colors"
                title={t('signOut')}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={signInWithGoogle}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all active:scale-95"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#ffffff"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#ffffff"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#ffffff"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#ffffff"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{t('signInWithGoogle')}</span>
            </button>
          )}

        </div>
      </div>
    </header>
  );
};
