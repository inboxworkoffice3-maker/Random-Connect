import React, { useState } from 'react';
import {
  Lock,
  ShieldCheck,
  User,
  Key,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  ChevronLeft,
} from 'lucide-react';

interface AdminLoginPageProps {
  onSuccess: (adminData: { username: string; role: string; token: string }) => void;
  onCancel: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onSuccess, onCancel }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Admin authentication failed');
      }

      // Store token securely in sessionStorage for active browser session
      sessionStorage.setItem('rc_admin_jwt', data.token);
      onSuccess({
        username: data.admin.username,
        role: data.admin.role,
        token: data.token,
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid username or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-100 my-8">
        
        {/* Back Button */}
        <button
          onClick={onCancel}
          className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white mb-6 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to App</span>
        </button>

        {/* Header */}
        <div className="text-center space-y-3 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-950/80 border border-amber-800/80 text-amber-400 mx-auto flex items-center justify-center shadow-lg shadow-amber-950/30">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white font-['Plus_Jakarta_Sans']">
              Owner Administration
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Secure server-side authentication for verified owner account.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-5 p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-start space-x-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1.5">
              <User className="w-3.5 h-3.5 text-amber-400" />
              <span>Admin Username</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. Mukesh Verma"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1.5">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>Admin Password</span>
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-amber-600/30 flex items-center justify-center space-x-2 transition-all active:scale-95"
            >
              <span>{isLoading ? 'Verifying Credentials...' : 'Authenticate & Enter Dashboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Security Disclaimers */}
        <div className="mt-6 pt-4 border-t border-slate-800 text-center text-[11px] text-slate-500 space-y-1">
          <p className="flex items-center justify-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Encrypted with salted bcrypt hash & signed JWT sessions</span>
          </p>
          <p>Login attempts are rate-limited to prevent brute-force attacks.</p>
        </div>

      </div>
    </div>
  );
};
