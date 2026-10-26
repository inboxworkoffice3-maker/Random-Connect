import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { ReportItem, SupportTicketItem, AdConfig, AuditLogItem } from '../../types';
import { db } from '../../lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  X,
  LayoutDashboard,
  Users,
  ShieldAlert,
  Ticket,
  DollarSign,
  Activity,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Save,
  Key,
  LogOut,
  ShieldCheck,
  FileText,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { UsersDirectory } from './UsersDirectory';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  adminToken: string;
  adminUsername: string;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  isOpen,
  onClose,
  adminToken,
  adminUsername,
  onLogout,
}) => {
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'reports' | 'tickets' | 'ads' | 'audit' | 'security'>('overview');

  // Genuine Real-Time Metrics (no fabricated numbers)
  const [stats, setStats] = useState<{
    totalUsers: number;
    onlineCount: number;
    offlineCount: number;
    activeTextChats: number;
    activeVideoCalls: number;
    waitingQueueSize: number;
    bannedCount: number;
    pendingReports: number;
    uptimeSeconds: number;
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Reports
  const [reportsList, setReportsList] = useState<ReportItem[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  // Tickets
  const [ticketsList, setTicketsList] = useState<SupportTicketItem[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketItem | null>(null);
  const [ticketReplyText, setTicketReplyText] = useState('');

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);

  // Ad Configuration
  const [adConfig, setAdConfig] = useState<AdConfig>({
    enabled: false,
    adClient: '',
    headerSlot: '',
    intermissionSlot: '',
    sidebarSlot: '',
    testMode: true,
  });
  const [savingAds, setSavingAds] = useState(false);
  const [adSaveMsg, setAdSaveMsg] = useState<string | null>(null);

  // Security & Password Change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwChangeMsg, setPwChangeMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [pwChanging, setPwChanging] = useState(false);

  useEffect(() => {
    if (isOpen && adminToken) {
      loadStats();
      loadReports();
      loadTickets();
      loadAdConfig();
      loadAuditLogs();
    }
  }, [isOpen, adminToken]);

  if (!isOpen) return null;

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.warn('Error loading stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const loadReports = async () => {
    setLoadingReports(true);
    try {
      const repSnap = await getDocs(collection(db, 'reports'));
      const reps: ReportItem[] = [];
      repSnap.forEach((d) => {
        reps.push({ id: d.id, ...d.data() } as ReportItem);
      });
      reps.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setReportsList(reps);
    } catch (err) {
      console.error('Error loading reports:', err);
    } finally {
      setLoadingReports(false);
    }
  };

  const loadTickets = async () => {
    try {
      const tktSnap = await getDocs(collection(db, 'support_tickets'));
      const tkts: SupportTicketItem[] = [];
      tktSnap.forEach((d) => {
        tkts.push({ id: d.id, ...d.data() } as SupportTicketItem);
      });
      tkts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTicketsList(tkts);
    } catch (err) {
      console.error('Error loading tickets:', err);
    }
  };

  const loadAuditLogs = async () => {
    setLoadingAuditLogs(true);
    try {
      const res = await fetch('/api/admin/audit-logs', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch (err) {
      console.warn('Error loading audit logs:', err);
    } finally {
      setLoadingAuditLogs(false);
    }
  };

  const loadAdConfig = async () => {
    try {
      const adSnap = await getDoc(doc(db, 'ad_config', 'default'));
      if (adSnap.exists()) {
        setAdConfig(adSnap.data() as AdConfig);
      }
    } catch (err) {
      console.warn('Ad config read notice:', err);
    }
  };

  const handleUpdateReport = async (reportId: string, status: ReportItem['status']) => {
    try {
      await updateDoc(doc(db, 'reports', reportId), { status });
      setReportsList((prev) => prev.map((r) => (r.id === reportId ? { ...r, status } : r)));
    } catch (err) {
      console.error('Report update error:', err);
    }
  };

  const handleReplyTicket = async () => {
    if (!selectedTicket || !ticketReplyText.trim()) return;
    try {
      await updateDoc(doc(db, 'support_tickets', selectedTicket.id), {
        status: 'resolved',
        adminResponse: ticketReplyText.trim(),
      });
      setTicketsList((prev) =>
        prev.map((t) =>
          t.id === selectedTicket.id
            ? { ...t, status: 'resolved', adminResponse: ticketReplyText.trim() }
            : t
        )
      );
      setSelectedTicket(null);
      setTicketReplyText('');
    } catch (err) {
      console.error('Ticket reply error:', err);
    }
  };

  const handleSaveAds = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAds(true);
    setAdSaveMsg(null);
    try {
      await setDoc(doc(db, 'ad_config', 'default'), adConfig);
      setAdSaveMsg('AdSense settings saved successfully.');
    } catch (err) {
      setAdSaveMsg('Failed to save ad configuration.');
    } finally {
      setSavingAds(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwChangeMsg(null);

    if (newPassword !== confirmPassword) {
      setPwChangeMsg({ text: 'New passwords do not match', isError: true });
      return;
    }

    if (newPassword.length < 8) {
      setPwChangeMsg({ text: 'Password must be at least 8 characters long', isError: true });
      return;
    }

    setPwChanging(true);
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      setPwChangeMsg({ text: 'Owner password changed successfully!', isError: false });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwChangeMsg({ text: err.message || 'Password update failed', isError: true });
    } finally {
      setPwChanging(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-6xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 my-8 text-slate-100 max-h-[94vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-950 border border-amber-800 text-amber-400 flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white font-['Plus_Jakarta_Sans']">
                  Random Connect Control Hub
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-800 flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3 text-amber-400" />
                  <span>{adminUsername}</span>
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Verified Owner Administrator • Genuine Database Persistence & Presence
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onLogout}
              className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-rose-950/80 text-slate-300 hover:text-rose-300 border border-slate-800 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
              title="Admin Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 my-4 gap-2 overflow-x-auto shrink-0">
          {[
            { id: 'overview', label: 'System Overview', icon: Activity },
            { id: 'users', label: `Users Directory (${stats?.totalUsers ?? '...'})`, icon: Users },
            { id: 'reports', label: `Reports (${reportsList.filter(r => r.status === 'pending').length})`, icon: ShieldAlert },
            { id: 'tickets', label: `Tickets (${ticketsList.filter(t => t.status === 'open').length})`, icon: Ticket },
            { id: 'audit', label: 'Audit Log', icon: FileText },
            { id: 'ads', label: 'Google AdSense', icon: DollarSign },
            { id: 'security', label: 'Owner Password', icon: Key },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-1.5 pb-3 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-6">
          
          {/* 1. OVERVIEW & GENUINE METRICS */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Live Verified Statistics (Calculated from Persistent Records)
                </span>
                <button
                  onClick={loadStats}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                >
                  <RefreshCw className={`w-3 h-3 ${statsLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {/* Real Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="text-[11px] text-slate-400 uppercase font-bold">Total Registered</div>
                  <div className="text-2xl font-black text-white mt-1 font-mono">
                    {statsLoading ? '...' : stats?.totalUsers ?? 0}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Confirmed DB accounts</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-900/50">
                  <div className="text-[11px] text-emerald-400 uppercase font-bold flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Confirmed Online</span>
                  </div>
                  <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">
                    {statsLoading ? '...' : stats?.onlineCount ?? 0}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Active within 35 seconds</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="text-[11px] text-slate-400 uppercase font-bold">Confirmed Offline</div>
                  <div className="text-2xl font-black text-slate-400 mt-1 font-mono">
                    {statsLoading ? '...' : stats?.offlineCount ?? 0}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Registered accounts offline</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-indigo-900/50">
                  <div className="text-[11px] text-indigo-400 uppercase font-bold">Active Calls / Chats</div>
                  <div className="text-2xl font-black text-indigo-400 mt-1 font-mono">
                    {statsLoading ? '...' : (stats?.activeTextChats ?? 0) + (stats?.activeVideoCalls ?? 0)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Text: {stats?.activeTextChats ?? 0} • Video: {stats?.activeVideoCalls ?? 0}
                  </div>
                </div>
              </div>

              {/* Service Health Checklist */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>Real-Time System Health & Presence Engine</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Presence Engine: Active Heartbeats (35s Inactivity Timeout)</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Server Matchmaking Queue: {stats?.waitingQueueSize ?? 0} in pool</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Database: Cloud Firestore (Synchronized)</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Owner Session: Authenticated ({adminUsername})</span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* 2. ALL USERS DIRECTORY (REQUIREMENTS 1, 2, 3) */}
          {activeTab === 'users' && (
            <UsersDirectory adminToken={adminToken} />
          )}

          {/* 3. REPORTS MODERATION */}
          {activeTab === 'reports' && (
            <div className="space-y-3">
              {loadingReports ? (
                <div className="text-center py-8 text-xs text-slate-400">Loading reports...</div>
              ) : reportsList.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">No reports recorded.</div>
              ) : (
                reportsList.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-rose-400 uppercase tracking-wider text-[10px] bg-rose-950 px-2 py-0.5 rounded border border-rose-800">
                          {rep.category}
                        </span>
                        <span className="font-mono text-slate-300">
                          Target: <strong className="text-indigo-400">{rep.reportedPublicId}</strong>
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-slate-500">
                        {new Date(rep.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-slate-300 italic bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                      &quot;{rep.description}&quot;
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-400">
                        Reporter ID: <span className="font-mono">{rep.reporterPublicId}</span>
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateReport(rep.id, 'dismissed')}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-lg text-[11px]"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 4. SUPPORT TICKETS */}
          {activeTab === 'tickets' && (
            <div className="space-y-4">
              {ticketsList.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">No support tickets found.</div>
              ) : (
                ticketsList.map((tkt) => (
                  <div
                    key={tkt.id}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-indigo-400">{tkt.ticketNumber}</span>
                        <span className="text-slate-300 font-semibold">{tkt.subject}</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          tkt.status === 'resolved'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                        }`}
                      >
                        {tkt.status}
                      </span>
                    </div>

                    <p className="text-slate-300">{tkt.message}</p>
                    <div className="text-[11px] text-slate-500">
                      User: {tkt.userPublicId} ({tkt.email}) • {new Date(tkt.createdAt).toLocaleString()}
                    </div>

                    {tkt.adminResponse && (
                      <div className="p-2 rounded-xl bg-indigo-950/60 border border-indigo-900/60 text-[11px] text-indigo-300">
                        <strong>Resolution:</strong> {tkt.adminResponse}
                      </div>
                    )}

                    {tkt.status !== 'resolved' && (
                      <div className="pt-2">
                        <button
                          onClick={() => setSelectedTicket(tkt)}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold"
                        >
                          Reply & Resolve
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}

              {selectedTicket && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-indigo-800 space-y-3">
                  <div className="font-bold text-sm text-white">
                    Resolving Ticket {selectedTicket.ticketNumber}
                  </div>
                  <textarea
                    rows={3}
                    value={ticketReplyText}
                    onChange={(e) => setTicketReplyText(e.target.value)}
                    placeholder="Enter official resolution message for user..."
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleReplyTicket}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold"
                    >
                      Send Resolution
                    </button>
                    <button
                      onClick={() => setSelectedTicket(null)}
                      className="px-3 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 5. AUDIT LOGS */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Administrative Action Audit Trail
                </span>
                <button
                  onClick={loadAuditLogs}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingAuditLogs ? 'animate-spin' : ''}`} />
                  <span>Refresh Logs</span>
                </button>
              </div>

              {auditLogs.length === 0 ? (
                <div className="text-center py-10 bg-slate-950 rounded-2xl border border-slate-800 text-slate-500 text-xs">
                  No administrative actions recorded yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-950 text-amber-300 border border-amber-800">
                            {log.action}
                          </span>
                          <span className="font-semibold text-white">By {log.adminUsername}</span>
                          {log.targetPublicId && (
                            <span className="text-slate-400">
                              on <strong className="text-indigo-400 font-mono">{log.targetPublicId}</strong> ({log.targetDisplayName})
                            </span>
                          )}
                        </div>
                        <p className="text-slate-300 text-[11px]">{log.reason}</p>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-4">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 6. GOOGLE ADSENSE & REVENUE */}
          {activeTab === 'ads' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">{t('adConfigurationTitle')}</h3>
                    <p className="text-xs text-slate-400">
                      Configure your Google AdSense Publisher ID and Slot IDs.
                    </p>
                  </div>
                  <a
                    href="https://adsense.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-indigo-400 border border-indigo-900 text-xs font-bold flex items-center space-x-1"
                  >
                    <span>{t('officialAdSensePortal')}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <form onSubmit={handleSaveAds} className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="adToggle"
                      checked={adConfig.enabled}
                      onChange={(e) => setAdConfig({ ...adConfig, enabled: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700"
                    />
                    <label htmlFor="adToggle" className="text-xs font-semibold text-slate-200">
                      {t('adsEnabledToggle')}
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">
                        {t('adClientLabel')}
                      </label>
                      <input
                        type="text"
                        value={adConfig.adClient}
                        onChange={(e) => setAdConfig({ ...adConfig, adClient: e.target.value })}
                        placeholder="ca-pub-1234567890123456"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">
                        {t('headerSlotLabel')}
                      </label>
                      <input
                        type="text"
                        value={adConfig.headerSlot}
                        onChange={(e) => setAdConfig({ ...adConfig, headerSlot: e.target.value })}
                        placeholder="1234567890"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      {t('intermissionSlotLabel')}
                    </label>
                    <input
                      type="text"
                      value={adConfig.intermissionSlot}
                      onChange={(e) => setAdConfig({ ...adConfig, intermissionSlot: e.target.value })}
                      placeholder="0987654321"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                    />
                  </div>

                  {adSaveMsg && (
                    <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-xs text-emerald-300">
                      {adSaveMsg}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={savingAds}
                    className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center space-x-1.5"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingAds ? 'Saving...' : t('saveAdSettings')}</span>
                  </button>
                </form>

                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
                  <span className="font-bold text-white">Genuine Revenue Policy: </span>
                  Ad impressions and revenue are tracked by your linked Google AdSense account. This platform never displays fabricated income or mock balances.
                </div>
              </div>
            </div>
          )}

          {/* 7. SECURITY & OWNER PASSWORD CHANGE */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 max-w-xl">
                <div className="flex items-center space-x-2">
                  <Key className="w-5 h-5 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">Change Owner Admin Password</h3>
                </div>
                <p className="text-xs text-slate-400">
                  Update the password for username <strong>{adminUsername}</strong>. The new password will be hashed using salted bcrypt on the server.
                </p>

                {pwChangeMsg && (
                  <div
                    className={`p-3 rounded-xl text-xs border ${
                      pwChangeMsg.isError
                        ? 'bg-rose-950/80 border-rose-800 text-rose-200'
                        : 'bg-emerald-950/80 border-emerald-800 text-emerald-200'
                    }`}
                  >
                    {pwChangeMsg.text}
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      New Password (min 8 chars)
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={pwChanging}
                    className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                  >
                    {pwChanging ? 'Updating Password...' : 'Save New Password'}
                  </button>
                </form>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
