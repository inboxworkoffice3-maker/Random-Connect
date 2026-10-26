import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { SupportTicketItem } from '../../types';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import {
  collection,
  doc,
  setDoc,
  query,
  where,
  getDocs,
  orderBy,
} from 'firebase/firestore';
import {
  X,
  PhoneCall,
  MessageSquare,
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  HelpCircle,
  ShieldAlert,
} from 'lucide-react';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
  const { user, profile } = useAuth();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'whatsapp' | 'ticket' | 'myTickets'>('whatsapp');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<'general' | 'safety' | 'technical' | 'account' | 'billing_ad'>('general');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketResult, setTicketResult] = useState<string | null>(null);
  const [myTickets, setMyTickets] = useState<SupportTicketItem[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  useEffect(() => {
    if (isOpen && activeTab === 'myTickets' && user) {
      loadUserTickets();
    }
  }, [isOpen, activeTab, user]);

  if (!isOpen) return null;

  const loadUserTickets = async () => {
    if (!user) return;
    setLoadingTickets(true);
    try {
      const q = query(
        collection(db, 'support_tickets'),
        where('userId', '==', user.uid)
      );
      const snap = await getDocs(q);
      const tickets: SupportTicketItem[] = [];
      snap.forEach((d) => {
        tickets.push({ id: d.id, ...d.data() } as SupportTicketItem);
      });
      // Sort in-memory
      tickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setMyTickets(tickets);
    } catch (err) {
      console.error('Error loading tickets:', err);
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !subject.trim() || !message.trim()) return;

    setIsSubmitting(true);
    setTicketResult(null);

    const ticketNumber = `RC-TKT-${Math.floor(10000 + Math.random() * 90000)}`;
    const ticketId = `ticket_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newTicket: SupportTicketItem = {
      id: ticketId,
      ticketNumber,
      userId: user.uid,
      userPublicId: profile.publicId,
      email: user.email || '',
      subject: subject.trim(),
      message: message.trim(),
      category,
      status: 'open',
      createdAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'support_tickets', ticketId), newTicket);
      setTicketResult(ticketNumber);
      setSubject('');
      setMessage('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `support_tickets/${ticketId}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const whatsAppUrl = `https://wa.me/919294552912?text=${encodeURIComponent(
    `Hello Random Connect Support, My Public ID is ${profile?.publicId || 'Guest'}. I need help with: `
  )}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 my-8 text-slate-100">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <PhoneCall className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white font-['Plus_Jakarta_Sans']">
              {t('supportTitle')}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Available 24/7 for Indian users. Direct WhatsApp helpline or in-app ticketing.
            </p>
          </div>
        </div>

        {/* Nav Tabs */}
        <div className="flex border-b border-slate-800 mb-6 gap-2">
          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'whatsapp'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            WhatsApp Support
          </button>
          <button
            onClick={() => setActiveTab('ticket')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'ticket'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Create Ticket
          </button>
          {user && (
            <button
              onClick={() => setActiveTab('myTickets')}
              className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all ${
                activeTab === 'myTickets'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              My Tickets
            </button>
          )}
        </div>

        {/* Tab 1: WhatsApp Helpline */}
        {activeTab === 'whatsapp' && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/60 to-slate-950 border border-emerald-800/60 space-y-3">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{t('officialWhatsApp')}</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t('whatsAppDesc')}
              </p>
              <div className="p-3 rounded-xl bg-slate-900 border border-emerald-900/60 font-mono text-sm text-emerald-400 flex items-center justify-between">
                <span>+91 9294552912</span>
                <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800">
                  Verified Desk
                </span>
              </div>
            </div>

            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2 active:scale-95 transition-all"
            >
              <PhoneCall className="w-4 h-4" />
              <span>{t('openWhatsApp')}</span>
            </a>

            <p className="text-[11px] text-slate-400 text-center">
              Note: Clicking will launch WhatsApp with a prefilled greeting. No messages are sent automatically.
            </p>
          </div>
        )}

        {/* Tab 2: Create In-App Support Ticket */}
        {activeTab === 'ticket' && (
          <div>
            {ticketResult ? (
              <div className="p-6 rounded-2xl bg-emerald-950/40 border border-emerald-800 text-center space-y-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h3 className="text-base font-bold text-white">
                  {t('ticketCreatedSuccess')}
                </h3>
                <div className="inline-block px-4 py-2 bg-emerald-950 border border-emerald-800 rounded-xl font-mono text-lg font-bold text-emerald-300">
                  {ticketResult}
                </div>
                <p className="text-xs text-slate-300">
                  Our Indian customer support team reviews tickets within 2-4 hours. You can track this under &quot;My Tickets&quot;.
                </p>
                <button
                  onClick={() => {
                    setTicketResult(null);
                    setActiveTab('myTickets');
                  }}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
                >
                  View My Tickets
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateTicket} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t('ticketCategory')}
                  </label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="general">General Inquiry</option>
                    <option value="safety">Safety or User Harassment</option>
                    <option value="technical">Technical / Video Quality Issue</option>
                    <option value="account">Account & Privacy Question</option>
                    <option value="billing_ad">Advertising & Sponsorship</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t('ticketSubject')}
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Brief summary of your issue..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t('ticketMessage')}
                  </label>
                  <textarea
                    required
                    rows={4}
                    maxLength={1500}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Provide details. Do not enter passwords or bank details..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !user}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Submitting...' : t('ticketSubmit')}</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* Tab 3: My Existing Tickets */}
        {activeTab === 'myTickets' && (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {loadingTickets ? (
              <div className="text-center py-8 text-xs text-slate-400">Loading tickets...</div>
            ) : myTickets.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                You have not submitted any support tickets yet.
              </div>
            ) : (
              myTickets.map((tkt) => (
                <div
                  key={tkt.id}
                  className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-indigo-400 font-bold">{tkt.ticketNumber}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        tkt.status === 'resolved'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : tkt.status === 'in_progress'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800'
                          : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                      }`}
                    >
                      {tkt.status}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-white">{tkt.subject}</div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">{tkt.message}</p>
                  {tkt.adminResponse && (
                    <div className="mt-2 p-2 rounded-lg bg-indigo-950/60 border border-indigo-900/60 text-[11px] text-indigo-300">
                      <span className="font-bold">Support Agent Reply: </span>
                      {tkt.adminResponse}
                    </div>
                  )}
                  <div className="text-[10px] text-slate-500 font-mono">
                    {new Date(tkt.createdAt).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
};
