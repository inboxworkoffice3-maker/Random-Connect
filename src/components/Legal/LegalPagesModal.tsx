import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  X,
  FileText,
  Lock,
  Trash2,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

interface LegalPagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'terms' | 'privacy' | 'deletion';
}

export const LegalPagesModal: React.FC<LegalPagesModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'terms',
}) => {
  const { user, profile, deleteUserAccount } = useAuth();
  const { t } = useLanguage();

  const [currentTab, setCurrentTab] = useState<'terms' | 'privacy' | 'deletion'>(defaultTab);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  if (!isOpen) return null;

  const handleDelete = async () => {
    if (deleteConfirmText.toLowerCase() !== 'delete') return;
    setIsDeleting(true);
    try {
      await deleteUserAccount();
      setDeleteSuccess(true);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      console.error('Delete error:', err);
      alert('Error deleting account. Please re-authenticate and try again.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 my-8 text-slate-100 max-h-[90vh] overflow-y-auto">
        
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tab Headers */}
        <div className="flex border-b border-slate-800 mb-6 gap-2">
          <button
            onClick={() => setCurrentTab('terms')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all ${
              currentTab === 'terms'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Terms of Service
          </button>
          <button
            onClick={() => setCurrentTab('privacy')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all ${
              currentTab === 'privacy'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Privacy Policy
          </button>
          <button
            onClick={() => setCurrentTab('deletion')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all ${
              currentTab === 'deletion'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Account Deletion
          </button>
        </div>

        {/* Terms of Service Content */}
        {currentTab === 'terms' && (
          <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
            <h3 className="text-base font-bold text-white font-['Plus_Jakarta_Sans']">
              Random Connect Terms of Service
            </h3>
            <p className="text-slate-400">Effective Date: October 2026 • Governed by Indian Jurisdiction</p>

            <h4 className="font-bold text-white text-sm">1. Eligibility and 18+ Requirement</h4>
            <p>
              By accessing or using Random Connect, you affirm and warrant that you are at least 18 years of age. Use of the service by anyone under 18 years is strictly prohibited. Falsification of age during onboarding constitutes a violation of these terms and will lead to an immediate ban.
            </p>

            <h4 className="font-bold text-white text-sm">2. User Conduct & Prohibited Activities</h4>
            <p>
              Users agree not to broadcast nudity, perform sexually explicit acts, engage in harassment, extortion, hate speech, or financial scams. Transmitting malicious code or attempting to harvest personal data from participants is strictly forbidden.
            </p>

            <h4 className="font-bold text-white text-sm">3. Contact Details Sharing Prohibition</h4>
            <p>
              To protect all participants from cyberstalking, harassment, and fraud, Random Connect strictly disallows exchanging phone numbers, WhatsApp links, and personal social handles.
            </p>

            <h4 className="font-bold text-white text-sm">4. Limitation of Liability</h4>
            <p>
              Random Connect facilitates peer-to-peer random connections. While automated and manual moderation tools are deployed, we do not control user actions and are not liable for user misconduct occurring during live WebRTC sessions.
            </p>
          </div>
        )}

        {/* Privacy Policy Content */}
        {currentTab === 'privacy' && (
          <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
            <h3 className="text-base font-bold text-white font-['Plus_Jakarta_Sans']">
              Random Connect Privacy Policy
            </h3>
            <p className="text-slate-400">Compliance with Information Technology Act, 2000 & DPDP Act</p>

            <h4 className="font-bold text-white text-sm">1. Information We Collect</h4>
            <p>
              When signing in via Google, we collect your verified email, display name, and unique authentication identifier. During onboarding, you voluntary provide age, gender, and preferred city. We generate an opaque Public ID (e.g., RC-XXXXX) which is the ONLY identifier presented to other users. Your email and Google credentials are never displayed to peers.
            </p>

            <h4 className="font-bold text-white text-sm">2. Video and Audio Stream Privacy</h4>
            <p>
              Video and audio communications utilize WebRTC peer-to-peer technology with STUN signaling. We DO NOT record, store, or monitor video calls or microphone audio on our servers.
            </p>

            <h4 className="font-bold text-white text-sm">3. Automated Content Moderation</h4>
            <p>
              Chat messages are programmatically processed locally and in transit solely to identify prohibited contact sharing and abusive language before delivery.
            </p>

            <h4 className="font-bold text-white text-sm">4. Data Retention & Third Parties</h4>
            <p>
              We do not sell user data. When third-party advertisements are served (such as Google AdSense), compliant ad cookies may be set in accordance with Google&apos;s privacy policies.
            </p>
          </div>
        )}

        {/* Account Deletion Content */}
        {currentTab === 'deletion' && (
          <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
            <h3 className="text-base font-bold text-white font-['Plus_Jakarta_Sans'] flex items-center space-x-2">
              <Trash2 className="w-5 h-5 text-rose-500" />
              <span>Permanent Account Deletion</span>
            </h3>

            <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-900/60 space-y-2 text-rose-200">
              <div className="font-bold text-sm">Important Information on Deletion & Data Retention</div>
              <p className="text-[11px] leading-relaxed">
                Deleting your account will immediately remove your profile, match queue records, and associated active sessions from the platform. Under Indian statutory regulations and cyber-safety guidelines, abuse reports and audit log hashes are maintained for up to 30 days before full cryptographic purge.
              </p>
            </div>

            {user ? (
              deleteSuccess ? (
                <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-800 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <div className="text-sm font-bold text-white">Your account has been deleted.</div>
                  <p className="text-xs text-slate-400">Redirecting to home page...</p>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <label className="block text-xs font-semibold text-slate-300">
                    Type <span className="font-mono text-rose-400 font-bold">DELETE</span> below to confirm permanent deletion of account ({profile?.publicId}):
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Type DELETE"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                  <button
                    onClick={handleDelete}
                    disabled={deleteConfirmText.toLowerCase() !== 'delete' || isDeleting}
                    className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center space-x-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{isDeleting ? 'Deleting...' : 'Permanently Delete My Account'}</span>
                  </button>
                </div>
              )
            ) : (
              <p className="text-slate-400 italic">Please sign in with Google to manage your account deletion.</p>
            )}

          </div>
        )}

      </div>
    </div>
  );
};
