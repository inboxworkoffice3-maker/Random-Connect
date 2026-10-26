import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  MessageSquare,
  Video,
  MapPin,
  Shield,
  Zap,
  Users,
  Lock,
  ChevronRight,
  PhoneCall,
  CheckCircle2,
  Activity,
  Smartphone,
  QrCode,
} from 'lucide-react';
import { AdBanner } from './Ads/AdBanner';
import { PublicStats } from '../types';

interface LandingPageProps {
  onStartChat: () => void;
  onStartVideo: () => void;
  onOpenRules: () => void;
  onOpenSupport: () => void;
  onOpenLegal: (tab: 'terms' | 'privacy' | 'deletion') => void;
  onOpenShare?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartChat,
  onStartVideo,
  onOpenRules,
  onOpenSupport,
  onOpenLegal,
  onOpenShare,
}) => {
  const { user, profile, signInWithGoogle, setIsProfileModalOpen } = useAuth();
  const { t, language } = useLanguage();

  const [publicStats, setPublicStats] = useState<PublicStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchGenuineStats = async () => {
      try {
        const res = await fetch('/api/stats/public');
        if (!res.ok) throw new Error('Failed to fetch stats');
        const data = await res.json();
        if (isMounted) {
          setPublicStats(data);
          setStatsLoading(false);
          setStatsError(false);
        }
      } catch (err) {
        if (isMounted) {
          setStatsLoading(false);
          setStatsError(true);
        }
      }
    };

    fetchGenuineStats();
    const timer = setInterval(fetchGenuineStats, 10000); // 10s auto-refresh from real backend records

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, []);

  const handleAction = (action: 'chat' | 'video' | 'nearby') => {
    if (!user) {
      signInWithGoogle();
      return;
    }
    if (!profile?.isProfileComplete) {
      setIsProfileModalOpen(true);
      return;
    }
    if (action === 'chat') onStartChat();
    if (action === 'video') onStartVideo();
    if (action === 'nearby') {
      setIsProfileModalOpen(true);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 sm:py-10 space-y-12">
      
      {/* Top Compliant Ad Banner */}
      <AdBanner slotType="header" />

      {/* Hero Section */}
      <section className="text-center space-y-6 pt-4 sm:pt-8">
        
        {/* Genuine Real-Time Presence Indicator */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-700/80 shadow-inner">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <div className="text-xs font-semibold text-slate-300">
            {statsLoading ? (
              <span className="text-slate-400">Verifying live server presence...</span>
            ) : statsError ? (
              <span className="text-slate-400">Presence Live (Unable to load exact count)</span>
            ) : publicStats ? (
              <div className="flex items-center space-x-2">
                <span>
                  {t('onlineNow')}: <strong className="text-emerald-400 font-mono">{publicStats.onlineCount}</strong>
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400">
                  Total Registered: <span className="font-mono text-indigo-400">{publicStats.totalRegistered}</span>
                </span>
              </div>
            ) : (
              <span className="text-slate-400">Presence Live</span>
            )}
          </div>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white font-['Plus_Jakarta_Sans'] leading-tight">
          Talk to Strangers Across India.
          <br />
          <span className="bg-gradient-to-r from-amber-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent">
            Instant, Safe & Real-Time.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-300 font-normal">
          {t('subtagline')}
        </p>

        {/* Main CTA Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          
          {/* Start Random Text Chat */}
          <button
            onClick={() => handleAction('chat')}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-base shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/40 transition-all flex items-center justify-center space-x-3 active:scale-95"
          >
            <MessageSquare className="w-5 h-5 text-indigo-200" />
            <span>{t('startChatting')}</span>
            <ChevronRight className="w-4 h-4 text-indigo-300" />
          </button>

          {/* Start Random Video Call */}
          <button
            onClick={() => handleAction('video')}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-base shadow-xl shadow-emerald-600/30 hover:shadow-emerald-600/40 transition-all flex items-center justify-center space-x-3 active:scale-95"
          >
            <Video className="w-5 h-5 text-emerald-200" />
            <span>{t('startVideoCall')}</span>
            <ChevronRight className="w-4 h-4 text-emerald-300" />
          </button>

          {/* Nearby Discovery */}
          <button
            onClick={() => handleAction('nearby')}
            className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-base transition-all flex items-center justify-center space-x-2"
          >
            <MapPin className="w-4 h-4 text-amber-400" />
            <span>{t('nearbyDiscovery')}</span>
          </button>
        </div>

        {/* 2-Phone Testing / Share Link Banner */}
        {onOpenShare && (
          <div className="pt-2 max-w-xl mx-auto">
            <button
              onClick={onOpenShare}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-emerald-950/80 border border-indigo-700/50 hover:border-indigo-500/80 transition-all text-left shadow-lg group cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0 group-hover:scale-105 transition-transform">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <span>
                      {language === 'hi'
                        ? '📱 दूसरे फ़ोन में चलाएं या दोस्तों को भेजें'
                        : '📱 Run on Another Phone or Share with Friends'}
                    </span>
                    <span className="text-[10px] bg-indigo-500/30 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-400/30">
                      Live Link & QR
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {language === 'hi'
                      ? 'QR कोड स्कैन करके तुरंत दूसरे मोबाइल पर चैट या वीडियो कॉल टेस्ट करें'
                      : 'Scan QR code to test instant 2-phone video call or chat'}
                  </div>
                </div>
              </div>
              <div className="p-2 rounded-xl bg-indigo-600 text-white group-hover:bg-indigo-500 transition-colors shrink-0">
                <QrCode className="w-4 h-4" />
              </div>
            </button>
          </div>
        )}

        {/* Real Live Platform Metrics Bar (Calculated strictly from persistent database) */}
        {publicStats && !statsLoading && (
          <div className="pt-4 max-w-3xl mx-auto">
            <div className="p-3 sm:p-4 rounded-2xl bg-slate-900/90 border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Registered Users</div>
                <div className="text-xl font-extrabold text-white font-mono mt-0.5">{publicStats.totalRegistered}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Confirmed Online</div>
                <div className="text-xl font-extrabold text-emerald-400 font-mono mt-0.5">{publicStats.onlineCount}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Confirmed Offline</div>
                <div className="text-xl font-extrabold text-slate-400 font-mono mt-0.5">{publicStats.offlineCount}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Active Calls/Chats</div>
                <div className="text-xl font-extrabold text-indigo-400 font-mono mt-0.5">
                  {publicStats.activeChats + publicStats.activeVideoCalls}
                </div>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5 text-center">
              Statistics are calculated directly from live database records and real-time heartbeats. Zero simulated numbers.
            </p>
          </div>
        )}

        {/* Safety Assurances */}
        <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-xs text-slate-400">
          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>No email or phone revealed</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>18+ Verified accounts</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Contact-sharing shield active</span>
          </div>
        </div>

      </section>

      {/* Feature Highlights Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-6">
        
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white mb-2 font-['Plus_Jakarta_Sans']">
            {t('feature1Title')}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {t('feature1Desc')}
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-4">
            <Zap className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white mb-2 font-['Plus_Jakarta_Sans']">
            {t('feature2Title')}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {t('feature2Desc')}
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-4">
            <Shield className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white mb-2 font-['Plus_Jakarta_Sans']">
            {t('feature3Title')}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {t('feature3Desc')}
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-4">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white mb-2 font-['Plus_Jakarta_Sans']">
            {t('feature4Title')}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {t('feature4Desc')}
          </p>
        </div>

      </section>

      {/* Safety Banner & WhatsApp Support Box */}
      <section className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <span className="text-xs font-bold text-emerald-400 tracking-wider uppercase">
            24/7 Helpline & Indian Customer Desk
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-white font-['Plus_Jakarta_Sans']">
            Have questions or need to report safety concerns?
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Direct WhatsApp support at <span className="font-mono text-emerald-400 font-bold">+91 9294552912</span>. Prompt human response for safety, disputes, or account help.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
          <a
            href="https://wa.me/919294552912?text=Hello%20Random%20Connect%20Support,%20I%20need%20help%20with%20my%20account."
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 flex items-center space-x-2 transition-all active:scale-95"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Chat on WhatsApp</span>
          </a>
          <button
            onClick={onOpenSupport}
            className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700"
          >
            In-App Helpdesk
          </button>
        </div>
      </section>

      {/* Footer Legal Links */}
      <footer className="pt-8 border-t border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          © 2026 Random Connect. {t('allRightsReserved')} {t('madeWithLove')}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button onClick={onOpenRules} className="hover:text-slate-200">{t('safety')}</button>
          <button onClick={() => onOpenLegal('terms')} className="hover:text-slate-200">{t('terms')}</button>
          <button onClick={() => onOpenLegal('privacy')} className="hover:text-slate-200">{t('privacy')}</button>
          <button onClick={() => onOpenLegal('deletion')} className="hover:text-slate-200">{t('accountDeletion')}</button>
        </div>
      </footer>

    </div>
  );
};
