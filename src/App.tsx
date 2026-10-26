import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { TextChatView } from './components/Chat/TextChatView';
import { VideoCallView } from './components/Video/VideoCallView';
import { ProfileModal } from './components/ProfileModal';
import { SupportModal } from './components/Support/SupportModal';
import { ReportModal } from './components/Safety/ReportModal';
import { SafetyGuidelinesModal } from './components/Safety/SafetyGuidelinesModal';
import { LegalPagesModal } from './components/Legal/LegalPagesModal';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { AdminLoginPage } from './components/Admin/AdminLoginPage';
import { ShareAppModal } from './components/ShareAppModal';
import { ShieldAlert, PhoneCall } from 'lucide-react';

const AppContent: React.FC = () => {
  const { profile, loading, isProfileModalOpen, setIsProfileModalOpen, signOutUser } = useAuth();
  const { t } = useLanguage();

  const [activeView, setActiveView] = useState<'home' | 'chat' | 'video'>('home');
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<'terms' | 'privacy' | 'deletion' | null>(null);

  // Admin Session State
  const [adminSession, setAdminSession] = useState<{ token: string; username: string } | null>(null);

  // Check stored admin token on boot
  useEffect(() => {
    const savedToken = sessionStorage.getItem('rc_admin_jwt');
    if (savedToken) {
      fetch('/api/admin/me', {
        headers: { Authorization: `Bearer ${savedToken}` },
      })
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error('Expired');
        })
        .then((data) => {
          setAdminSession({ token: savedToken, username: data.username });
        })
        .catch(() => {
          sessionStorage.removeItem('rc_admin_jwt');
          setAdminSession(null);
        });
    }
  }, []);

  // Reporting state
  const [reportData, setReportData] = useState<{
    reportedUserId: string;
    reportedPublicId: string;
    sessionId: string;
  } | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        <p className="text-sm text-slate-400 font-medium font-['Plus_Jakarta_Sans']">
          Loading Random Connect...
        </p>
      </div>
    );
  }

  // Account Banned Screen
  if (profile?.isBanned) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="max-w-md w-full p-8 bg-slate-900 border border-rose-900/60 rounded-3xl space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-rose-950/60 border border-rose-800 text-rose-400 mx-auto flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white font-['Plus_Jakarta_Sans']">
            Account Suspended / Banned
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Your account ({profile.publicId}) has been restricted due to a confirmed violation of Random Connect&apos;s Safety and Community Guidelines.
          </p>
          {profile.banReason && (
            <div className="p-3 bg-slate-950 border border-rose-900 rounded-xl text-xs text-rose-300">
              Reason: {profile.banReason}
            </div>
          )}
          <div className="pt-2 flex flex-col gap-2">
            <a
              href={`https://wa.me/919294552912?text=Appeal%20for%20banned%20Public%20ID%20${profile.publicId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-2"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Submit Appeal on WhatsApp (+91 9294552912)</span>
            </a>
            <button
              onClick={signOutUser}
              className="py-2.5 text-xs text-slate-400 hover:text-white"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleOpenReport = (reportedUserId: string, reportedPublicId: string, sessionId: string) => {
    setReportData({ reportedUserId, reportedPublicId, sessionId });
  };

  const handleOpenAdmin = () => {
    if (adminSession) {
      setIsAdminDashboardOpen(true);
    } else {
      setIsAdminLoginOpen(true);
    }
  };

  const handleAdminLogout = () => {
    fetch('/api/admin/logout', { method: 'POST' }).catch(() => {});
    sessionStorage.removeItem('rc_admin_jwt');
    setAdminSession(null);
    setIsAdminDashboardOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Top Navbar */}
      <Navbar
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenSupport={() => setIsSupportOpen(true)}
        onOpenAdmin={handleOpenAdmin}
        onOpenRules={() => setIsRulesOpen(true)}
        onOpenLegal={(tab) => setLegalModalTab(tab)}
        onOpenShare={() => setIsShareModalOpen(true)}
      />

      {/* Main View Area */}
      <main className="flex-1 flex flex-col">
        {activeView === 'home' && (
          <LandingPage
            onStartChat={() => setActiveView('chat')}
            onStartVideo={() => setActiveView('video')}
            onOpenRules={() => setIsRulesOpen(true)}
            onOpenSupport={() => setIsSupportOpen(true)}
            onOpenLegal={(tab) => setLegalModalTab(tab)}
            onOpenShare={() => setIsShareModalOpen(true)}
          />
        )}

        {activeView === 'chat' && (
          <TextChatView
            onBackToHome={() => setActiveView('home')}
            onOpenReport={handleOpenReport}
          />
        )}

        {activeView === 'video' && (
          <VideoCallView
            onBackToHome={() => setActiveView('home')}
            onOpenReport={handleOpenReport}
          />
        )}
      </main>

      {/* Modals & Overlays */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onOpenLegal={(tab) => {
          setIsProfileModalOpen(false);
          setLegalModalTab(tab);
        }}
      />

      <SupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
      />

      {/* Dedicated Admin Login Page */}
      {isAdminLoginOpen && (
        <AdminLoginPage
          onSuccess={(data) => {
            setAdminSession({ token: data.token, username: data.username });
            setIsAdminLoginOpen(false);
            setIsAdminDashboardOpen(true);
          }}
          onCancel={() => setIsAdminLoginOpen(false)}
        />
      )}

      {/* Owner Admin Dashboard */}
      {isAdminDashboardOpen && adminSession && (
        <AdminDashboard
          isOpen={isAdminDashboardOpen}
          onClose={() => setIsAdminDashboardOpen(false)}
          adminToken={adminSession.token}
          adminUsername={adminSession.username}
          onLogout={handleAdminLogout}
        />
      )}

      <SafetyGuidelinesModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
      />

      <LegalPagesModal
        isOpen={Boolean(legalModalTab)}
        onClose={() => setLegalModalTab(null)}
        defaultTab={legalModalTab || 'terms'}
      />

      <ShareAppModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />

      {reportData && (
        <ReportModal
          isOpen={Boolean(reportData)}
          onClose={() => setReportData(null)}
          reportedUserId={reportData.reportedUserId}
          reportedPublicId={reportData.reportedPublicId}
          sessionId={reportData.sessionId}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </LanguageProvider>
  );
}
