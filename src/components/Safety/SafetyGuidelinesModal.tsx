import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  PhoneCall,
  UserCheck,
} from 'lucide-react';

interface SafetyGuidelinesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SafetyGuidelinesModal: React.FC<SafetyGuidelinesModalProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 my-8 text-slate-100 max-h-[90vh] overflow-y-auto">
        
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white font-['Plus_Jakarta_Sans']">
              Random Connect Safety Guidelines
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Keeping conversations safe, pleasant, and respectful across India.
            </p>
          </div>
        </div>

        <div className="space-y-6 text-xs text-slate-300 leading-relaxed">
          
          {/* Key Rule 1: 18+ strict */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-start space-x-3">
            <UserCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-white mb-1">Strict 18+ Age Requirement</h4>
              <p>
                Random Connect is strictly restricted to adults aged 18 and older. Any accounts found belonging to minors or presenting underage content will be permanently banned immediately, and severe infractions reported to cyber authorities.
              </p>
            </div>
          </div>

          {/* Do's and Don'ts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* The Do's */}
            <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-900/40 space-y-3">
              <h4 className="text-sm font-bold text-emerald-400 flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>What to Do</span>
              </h4>
              <ul className="space-y-2 text-[11px] text-slate-300 list-disc list-inside">
                <li>Be polite, respectful, and courteous to strangers.</li>
                <li>Report abusive behavior or harassment immediately using the in-chat button.</li>
                <li>Use voice-only mode if your network or WiFi in India is slow.</li>
                <li>Respect when another user decides to skip or leave the chat.</li>
                <li>Keep personal addresses and financial information completely private.</li>
              </ul>
            </div>

            {/* The Don'ts */}
            <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-900/40 space-y-3">
              <h4 className="text-sm font-bold text-rose-400 flex items-center space-x-1.5">
                <XCircle className="w-4 h-4" />
                <span>What NOT to Do</span>
              </h4>
              <ul className="space-y-2 text-[11px] text-slate-300 list-disc list-inside">
                <li>Do NOT ask for or share phone numbers, WhatsApp, or Instagram handles.</li>
                <li>Do NOT transmit nudity, sexual content, or obscene video feeds.</li>
                <li>Do NOT record, photograph, or screenshot your partner without consent.</li>
                <li>Do NOT promote scams, gambling, or commercial solicitations.</li>
                <li>Do NOT use hate speech, regional slurs, or derogatory remarks.</li>
              </ul>
            </div>

          </div>

          {/* Contact Sharing Shield explanation */}
          <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-900/40 space-y-2">
            <h4 className="text-sm font-bold text-amber-400 flex items-center space-x-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>Automated Contact Sharing Shield</span>
            </h4>
            <p className="text-[11px] text-slate-300">
              Our automated server moderation detects phone digits, WhatsApp links, and social media handles. Sharing contacts exposes users to impersonation and cyber fraud. Multiple attempts to bypass this filter will lead to an automatic 24-hour account suspension.
            </p>
          </div>

          {/* Customer Helpline */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-white">Need immediate escalation?</div>
              <div className="text-[11px] text-slate-400">Official India WhatsApp desk: +91 9294552912</div>
            </div>
            <a
              href="https://wa.me/919294552912"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
            >
              Contact Support
            </a>
          </div>

        </div>

      </div>
    </div>
  );
};
