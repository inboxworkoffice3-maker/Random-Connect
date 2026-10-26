import React, { useState, useEffect } from 'react';
import { UserProfile } from '../../types';
import {
  Search,
  Check,
  User,
  MapPin,
  Calendar,
  Clock,
  Shield,
  ShieldAlert,
  AlertTriangle,
  Ban,
  Trash2,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  Copy,
  CheckCheck,
} from 'lucide-react';

interface UsersDirectoryProps {
  adminToken: string;
}

export const UsersDirectory: React.FC<UsersDirectoryProps> = ({ adminToken }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalRegistered, setTotalRegistered] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);
  const [offlineCount, setOfflineCount] = useState(0);

  // Selected User Modal
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [actionType, setActionType] = useState<'warn' | 'suspend' | 'ban' | 'unban' | 'delete' | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [suspendHours, setSuspendHours] = useState(24);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        status: statusFilter,
        search: search.trim(),
      });

      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      if (!res.ok) {
        throw new Error('Failed to load users directory from database');
      }

      const data = await res.json();
      setUsers(data.users || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.total || 0);
      setTotalRegistered(data.totalRegistered || 0);
      setOnlineCount(data.onlineCount || 0);
      setOfflineCount(data.offlineCount || 0);
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to load real user data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    const interval = setInterval(fetchUsers, 12000); // Live poll presence every 12s
    return () => clearInterval(interval);
  }, [page, statusFilter, adminToken]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleFilterChange = (filter: 'all' | 'online' | 'offline') => {
    setStatusFilter(filter);
    setPage(1);
  };

  const handleModerateSubmit = async () => {
    if (!selectedUser || !actionType || !actionReason.trim()) return;

    setActionLoading(true);
    setActionSuccessMsg(null);

    try {
      const res = await fetch(`/api/admin/users/${selectedUser.uid}/moderate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          action: actionType,
          reason: actionReason.trim(),
          durationHours: suspendHours,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Moderation action failed');

      setActionSuccessMsg(`Action "${actionType.toUpperCase()}" recorded successfully in audit trail.`);
      setActionReason('');
      setActionType(null);

      // Refresh list and selected user
      fetchUsers();
      if (actionType === 'delete') {
        setSelectedUser(null);
      } else {
        const updatedRes = await fetch(`/api/admin/users/${selectedUser.uid}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        if (updatedRes.ok) {
          const uData = await updatedRes.json();
          setSelectedUser(uData.user);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Moderation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyPublicId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="space-y-5">
      
      {/* Directory Summary Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-950 border border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-white font-['Plus_Jakarta_Sans']">
            All Registered Users Directory
          </h3>
          <p className="text-xs text-slate-400">
            Real registered accounts stored in Cloud Firestore with server presence detection.
          </p>
        </div>

        {/* Real-Time Status Filters */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => handleFilterChange('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              statusFilter === 'all'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Users ({totalRegistered})
          </button>
          
          <button
            onClick={() => handleFilterChange('online')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              statusFilter === 'online'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Online ({onlineCount})</span>
          </button>

          <button
            onClick={() => handleFilterChange('offline')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              statusFilter === 'offline'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span>Offline ({offlineCount})</span>
          </button>
        </div>
      </div>

      {/* Search Bar & Refresh */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Public ID (e.g. RC-...), Display Name, City, or Email..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-md transition-all shrink-0"
          >
            Search
          </button>
        </form>

        <button
          onClick={fetchUsers}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold flex items-center justify-center space-x-1.5 shrink-0"
          title="Refresh User Presence"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Error Notice */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Users Table / Directory Cards */}
      {loading && users.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-xs space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin mx-auto" />
          <p>Querying verified registered users from database...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-xs p-6 bg-slate-950 rounded-2xl border border-slate-800">
          <User className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="font-bold text-white text-sm">No users match this filter.</p>
          <p className="text-[11px] text-slate-500 mt-1">
            {search ? `No registered user matches "${search}".` : 'No registered users found.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">User / Public ID</th>
                  <th className="py-3 px-4">Online Status</th>
                  <th className="py-3 px-4">Permitted Details</th>
                  <th className="py-3 px-4">Last Active</th>
                  <th className="py-3 px-4">Registered Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.map((u) => {
                  const isOnline = u.isOnline;
                  return (
                    <tr
                      key={u.uid}
                      onClick={() => setSelectedUser(u)}
                      className="hover:bg-slate-900/70 transition-colors cursor-pointer group"
                    >
                      {/* Name & Avatar & Public ID */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          {u.photoURL ? (
                            <img
                              src={u.photoURL}
                              alt={u.displayName}
                              className="w-9 h-9 rounded-full object-cover border border-slate-700"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 font-bold flex items-center justify-center text-xs">
                              {u.displayName?.[0]?.toUpperCase() || 'U'}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-white text-xs flex items-center space-x-1.5">
                              <span>{u.displayName}</span>
                              {u.isBanned && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-950 text-rose-400 border border-rose-800">
                                  BANNED
                                </span>
                              )}
                              {u.isSuspended && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-950 text-amber-400 border border-amber-800">
                                  SUSPENDED
                                </span>
                              )}
                            </div>
                            <div className="font-mono text-[10px] text-indigo-400 mt-0.5">
                              {u.publicId}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Presence Status Column: STRICTLY Online (Green checkmark) or Offline (Gray) */}
                      <td className="py-3.5 px-4">
                        {isOnline ? (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/30 animate-pulse" />
                            <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                            <span>Online</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-900 text-slate-400 border border-slate-700/80">
                            <span className="w-2 h-2 rounded-full bg-slate-500" />
                            <span>Offline</span>
                          </span>
                        )}
                      </td>

                      {/* Permitted Profile Info */}
                      <td className="py-3.5 px-4">
                        <div className="text-[11px] text-slate-300 space-y-0.5">
                          <div>
                            <span className="text-slate-500">City: </span>
                            <span className="text-white font-medium">{u.city}</span>
                          </div>
                          <div className="text-slate-400 text-[10px]">
                            Age: {u.age} • Gender: {u.gender} • Lang: {u.language?.toUpperCase()}
                          </div>
                        </div>
                      </td>

                      {/* Last Active */}
                      <td className="py-3.5 px-4 text-[11px] text-slate-400 font-mono">
                        {isOnline ? (
                          <span className="text-emerald-400 font-sans font-semibold">Active Now</span>
                        ) : u.lastActiveAt ? (
                          new Date(u.lastActiveAt).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        ) : (
                          'Status unavailable'
                        )}
                      </td>

                      {/* Registration Date */}
                      <td className="py-3.5 px-4 text-[11px] text-slate-400 font-mono">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUser(u);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 group-hover:bg-amber-600 text-slate-300 group-hover:text-white border border-slate-700 group-hover:border-amber-500 text-xs font-semibold transition-all"
                        >
                          View Profile
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between pt-3 px-2 text-xs text-slate-400">
            <div>
              Showing <span className="font-semibold text-white">{users.length}</span> of{' '}
              <span className="font-semibold text-white">{totalCount}</span> users (Page {page} of {totalPages})
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 disabled:opacity-40 text-slate-300 hover:text-white flex items-center space-x-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 disabled:opacity-40 text-slate-300 hover:text-white flex items-center space-x-1"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. ADMIN DETAILED PROFILE VIEW MODAL                     */}
      {/* ======================================================== */}
      {selectedUser && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 my-8 text-slate-100 max-h-[90vh] overflow-y-auto">
            
            <button
              onClick={() => {
                setSelectedUser(null);
                setActionType(null);
                setActionSuccessMsg(null);
              }}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Profile Header */}
            <div className="flex items-start space-x-4 mb-6 pb-5 border-b border-slate-800">
              {selectedUser.photoURL ? (
                <img
                  src={selectedUser.photoURL}
                  alt={selectedUser.displayName}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-700 shadow-md"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border-2 border-indigo-500/40 text-indigo-300 font-extrabold flex items-center justify-center text-xl">
                  {selectedUser.displayName?.[0]?.toUpperCase() || 'U'}
                </div>
              )}

              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h3 className="text-xl font-bold text-white font-['Plus_Jakarta_Sans']">
                    {selectedUser.displayName}
                  </h3>
                  {selectedUser.isBanned && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-800">
                      BANNED
                    </span>
                  )}
                  {selectedUser.isSuspended && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800">
                      SUSPENDED
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2 mt-1">
                  <span className="font-mono text-xs text-indigo-400 font-bold bg-indigo-950/80 px-2.5 py-0.5 rounded-lg border border-indigo-900">
                    {selectedUser.publicId}
                  </span>
                  <button
                    onClick={() => handleCopyPublicId(selectedUser.publicId)}
                    className="p-1 text-slate-400 hover:text-white"
                    title="Copy Public ID"
                  >
                    {copiedId ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Real Online/Offline Status */}
                <div className="mt-2">
                  {selectedUser.isOnline ? (
                    <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/30 animate-pulse" />
                      <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                      <span>Online</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-900 text-slate-400 border border-slate-700">
                      <span className="w-2 h-2 rounded-full bg-slate-500" />
                      <span>Offline</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Information Grid */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Permitted Profile Information
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Age</span>
                  <span className="text-white font-semibold">{selectedUser.age} Years</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Gender</span>
                  <span className="text-white font-semibold capitalize">{selectedUser.gender}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">City / Location</span>
                  <span className="text-white font-semibold">{selectedUser.city}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Language</span>
                  <span className="text-white font-semibold uppercase">{selectedUser.language}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Matching Preference</span>
                  <span className="text-white font-semibold capitalize">{selectedUser.matchingPreference}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Registration</span>
                  <span className="text-white font-mono text-[11px]">
                    {new Date(selectedUser.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Private Admin-Authorized Details */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-400">Owner-Authorized Identity</div>
                <div className="text-slate-300">
                  <span className="text-slate-500">Google Email: </span>
                  <span className="font-mono text-indigo-300 font-semibold">{selectedUser.email || 'None'}</span>
                </div>
                <div className="text-slate-300">
                  <span className="text-slate-500">Last Active Timestamp: </span>
                  <span className="font-mono text-slate-400">
                    {selectedUser.lastActiveAt ? new Date(selectedUser.lastActiveAt).toLocaleString() : 'Status unavailable'}
                  </span>
                </div>
              </div>

              {/* Moderation History */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                <div className="text-[10px] uppercase font-bold text-slate-400">Moderation Standing</div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>Warnings Issued: <strong className="text-amber-400 font-mono">{selectedUser.warningCount || 0}</strong></div>
                  <div>Account Standing: <strong className={selectedUser.isBanned ? 'text-rose-400' : 'text-emerald-400'}>
                    {selectedUser.isBanned ? 'Banned' : selectedUser.isSuspended ? 'Suspended' : 'Good Standing'}
                  </strong></div>
                </div>
                {selectedUser.banReason && (
                  <div className="p-2 rounded bg-rose-950/60 border border-rose-900 text-rose-300 text-[11px]">
                    <strong>Ban Reason: </strong>{selectedUser.banReason}
                  </div>
                )}
                {selectedUser.suspensionReason && (
                  <div className="p-2 rounded bg-amber-950/60 border border-amber-900 text-amber-300 text-[11px]">
                    <strong>Suspension Reason: </strong>{selectedUser.suspensionReason}
                  </div>
                )}
              </div>

              {/* Success Alert */}
              {actionSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs">
                  {actionSuccessMsg}
                </div>
              )}

              {/* Moderation Action Buttons */}
              {!actionType && (
                <div className="pt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() => setActionType('warn')}
                    className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-amber-950/60 text-amber-400 border border-amber-800 text-xs font-bold"
                  >
                    Issue Warning
                  </button>
                  <button
                    onClick={() => setActionType('suspend')}
                    className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-amber-950/60 text-amber-400 border border-amber-800 text-xs font-bold"
                  >
                    Suspend (24h)
                  </button>
                  {selectedUser.isBanned ? (
                    <button
                      onClick={() => setActionType('unban')}
                      className="px-3.5 py-2 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-800 text-xs font-bold"
                    >
                      Lift Ban
                    </button>
                  ) : (
                    <button
                      onClick={() => setActionType('ban')}
                      className="px-3.5 py-2 rounded-xl bg-rose-950 hover:bg-rose-900 text-rose-400 border border-rose-800 text-xs font-bold"
                    >
                      Ban Account
                    </button>
                  )}
                  <button
                    onClick={() => setActionType('delete')}
                    className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-rose-950/80 text-rose-400 border border-rose-900 text-xs font-bold"
                  >
                    Delete Account
                  </button>
                </div>
              )}

              {/* Action Form Confirmation */}
              {actionType && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-amber-800 space-y-3 pt-3">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                    <span>Confirm Action: {actionType.toUpperCase()} ({selectedUser.displayName})</span>
                    <button
                      onClick={() => setActionType(null)}
                      className="text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>

                  {actionType === 'suspend' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Suspension Duration (Hours)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={720}
                        value={suspendHours}
                        onChange={(e) => setSuspendHours(Number(e.target.value))}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Mandatory Recorded Reason (Logged in Server Audit Trail)
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      placeholder="Specify infraction details, policy violation, or evidence note..."
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleModerateSubmit}
                      disabled={actionLoading || !actionReason.trim()}
                      className="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl"
                    >
                      {actionLoading ? 'Recording...' : `Confirm ${actionType.toUpperCase()}`}
                    </button>
                    <button
                      onClick={() => setActionType(null)}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs rounded-xl"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
