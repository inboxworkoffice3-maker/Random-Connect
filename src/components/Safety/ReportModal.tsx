import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ReportItem } from '../../types';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import {
  X,
  Flag,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportedUserId: string;
  reportedPublicId: string;
  sessionId: string;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  reportedUserId,
  reportedPublicId,
  sessionId,
}) => {
  const { user, profile } = useAuth();
  const { t } = useLanguage();

  const [category, setCategory] = useState<ReportItem['category']>('harassment');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !description.trim()) return;

    setIsSubmitting(true);
    const reportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newReport: ReportItem = {
      id: reportId,
      reporterId: user.uid,
      reporterPublicId: profile.publicId,
      reportedUserId,
      reportedPublicId,
      category,
      description: description.trim(),
      sessionId,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'reports', reportId), newReport);
      setSubmitted(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `reports/${reportId}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-100">
        
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="text-center py-6 space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h3 className="text-lg font-bold text-white">
              {t('reportSubmittedSuccess')}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Our safety review team will analyze the session telemetry and take immediate moderation action including warnings, temporary suspensions, or permanent bans.
            </p>
            <button
              onClick={() => {
                setSubmitted(false);
                onClose();
              }}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-400 flex items-center justify-center">
                <Flag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white font-['Plus_Jakarta_Sans']">
                  {t('reportModalTitle')}
                </h2>
                <p className="text-xs text-slate-400">
                  Target Public ID: <span className="font-mono text-indigo-400 font-semibold">{reportedPublicId}</span>
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t('reportCategoryLabel')}
              </label>
              <select
                value={category}
                onChange={(e: any) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="harassment">{t('categoryHarassment')}</option>
                <option value="nudity_inappropriate">{t('categoryNudity')}</option>
                <option value="underage">{t('categoryUnderage')}</option>
                <option value="abusive_language">{t('categoryAbuse')}</option>
                <option value="contact_sharing">{t('categoryContact')}</option>
                <option value="scam">Financial Scam or Fraud</option>
                <option value="other">{t('categoryOther')}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t('reportDetailsLabel')}
              </label>
              <textarea
                required
                rows={4}
                maxLength={800}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('reportDetailsPlaceholder')}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-900/60 text-[11px] text-amber-300 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                False or frivolous reports waste moderation resources and may result in penalties on your account.
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !description.trim()}
              className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all"
            >
              {isSubmitting ? 'Submitting Report...' : t('submitReport')}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
