import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Share2,
  Smartphone,
  QrCode,
  ShieldCheck,
  Video,
  MessageCircle,
  ExternalLink,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface ShareAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareAppModal: React.FC<ShareAppModalProps> = ({ isOpen, onClose }) => {
  const { language } = useLanguage();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Use the live public URL
  const currentUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://ais-pre-mptt2zyft2eb53ppjgiwwk-985640939532.asia-southeast1.run.app';

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
    currentUrl
  )}&margin=10&color=0f172a&bgcolor=ffffff`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = currentUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Random Connect — Random Video & Chat',
          text: 'Connect instantly with real people on Random Connect!',
          url: currentUrl,
        });
      } catch {
        // User cancelled or share failed
      }
    } else {
      handleCopy();
    }
  };

  const isHindi = language === 'hi';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-['Plus_Jakarta_Sans']">
                {isHindi ? 'दूसरे फ़ोन में चलाएं / शेयर करें' : 'Open on Another Phone / Share'}
              </h3>
              <p className="text-xs text-indigo-300">
                {isHindi ? 'पब्लिक क्लाउड लिंक & QR कोड' : 'Live Public Cloud Link & QR Code'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* QR Code and Copy Link Card */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col items-center text-center space-y-3">
            <div className="p-2.5 bg-white rounded-2xl shadow-xl border border-slate-200">
              <img
                src={qrCodeUrl}
                alt="Scan to open Random Connect"
                className="w-48 h-48 rounded-xl object-contain"
                loading="eager"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-center space-x-1.5 text-xs font-semibold text-emerald-400">
                <QrCode className="w-4 h-4" />
                <span>
                  {isHindi
                    ? 'दूसरे फ़ोन के कैमरे से यह QR कोड स्कैन करें'
                    : 'Scan this QR code with 2nd phone camera'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {isHindi
                  ? 'या नीचे दिए गए लिंक को कॉपी करके WhatsApp या ब्राउज़र में खोलें'
                  : 'Or copy and send this link via WhatsApp or browser'}
              </p>
            </div>

            {/* URL Display and Copy Button */}
            <div className="w-full flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-xl p-2">
              <input
                type="text"
                readOnly
                value={currentUrl}
                className="w-full bg-transparent text-xs text-indigo-300 font-mono focus:outline-none truncate px-1 select-all"
              />
              <button
                onClick={handleCopy}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? (isHindi ? 'कॉपी हुआ!' : 'Copied!') : isHindi ? 'कॉपी' : 'Copy'}</span>
              </button>
            </div>

            {/* Share via Native Sheet */}
            <button
              onClick={handleNativeShare}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
            >
              <Share2 className="w-4 h-4 text-indigo-400" />
              <span>
                {isHindi ? 'WhatsApp / दोस्तों के साथ शेयर करें' : 'Share via WhatsApp / Apps'}
              </span>
            </button>
          </div>

          {/* Step-by-Step Instructions */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{isHindi ? 'दूसरे फ़ोन से कनेक्ट करने का तरीका:' : 'How to connect 2 phones:'}</span>
            </h4>

            <div className="space-y-2 text-xs">
              <div className="flex items-start space-x-3 p-3 bg-slate-950/50 rounded-xl border border-slate-800/80">
                <span className="w-6 h-6 rounded-lg bg-indigo-600/30 text-indigo-400 font-bold flex items-center justify-center shrink-0 text-xs border border-indigo-500/30">
                  1
                </span>
                <p className="text-slate-300 leading-relaxed">
                  <strong className="text-white">
                    {isHindi ? 'दोनों फ़ोन में लिंक खोलें:' : 'Open link on both phones:'}
                  </strong>{' '}
                  {isHindi
                    ? 'Phone 1 और Phone 2 दोनों के Chrome/Safari ब्राउज़र में यह लिंक खोलें।'
                    : 'Open this exact website link on Phone 1 and Phone 2.'}
                </p>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-slate-950/50 rounded-xl border border-slate-800/80">
                <span className="w-6 h-6 rounded-lg bg-indigo-600/30 text-indigo-400 font-bold flex items-center justify-center shrink-0 text-xs border border-indigo-500/30">
                  2
                </span>
                <p className="text-slate-300 leading-relaxed">
                  <strong className="text-white">
                    {isHindi ? 'Google से लॉगिन करें:' : 'Sign in on both phones:'}
                  </strong>{' '}
                  {isHindi
                    ? 'दोनों फ़ोन में "Sign in with Google" करें और प्रोफ़ाइल पूरी करें।'
                    : 'Sign in with your Google accounts on each phone and verify profile.'}
                </p>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-slate-950/50 rounded-xl border border-slate-800/80">
                <span className="w-6 h-6 rounded-lg bg-indigo-600/30 text-indigo-400 font-bold flex items-center justify-center shrink-0 text-xs border border-indigo-500/30">
                  3
                </span>
                <p className="text-slate-300 leading-relaxed">
                  <strong className="text-white">
                    {isHindi ? 'कैमरा व माइक की अनुमति दें:' : 'Allow Camera & Mic:'}
                  </strong>{' '}
                  {isHindi
                    ? 'ब्राउज़र पूछेगा, तब "Allow" दबाएं ताकि वीडियो कॉल व आवाज़ चालू हो सके।'
                    : 'Grant Camera & Microphone permission in browser when prompted.'}
                </p>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-slate-950/50 rounded-xl border border-slate-800/80">
                <span className="w-6 h-6 rounded-lg bg-emerald-600/30 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-xs border border-emerald-500/30">
                  4
                </span>
                <p className="text-slate-300 leading-relaxed">
                  <strong className="text-white">
                    {isHindi ? 'मैचिंग शुरू करें:' : 'Start Matching:'}
                  </strong>{' '}
                  {isHindi
                    ? 'Phone 1 पर "Start Video Call" (या "Start Chat") दबाएं और Phone 2 पर भी दबाएं। सर्वर दोनों को तुरंत कनेक्ट कर देगा!'
                    : 'Tap "Start Video Call" (or "Start Chat") on Phone 1 and then on Phone 2. You will be paired instantly!'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            {isHindi ? 'HTTPS सुरक्षित क्लाउड होस्टिंग' : 'HTTPS Secure Cloud Hosting'}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            {isHindi ? 'बंद करें' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
