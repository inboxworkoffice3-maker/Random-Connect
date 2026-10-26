import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { findMatch, endChatSession } from '../../lib/matchmaking';
import { inspectMessageSafety } from '../../lib/moderation';
import { ChatSession, ChatMessage } from '../../types';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import {
  collection,
  doc,
  addDoc,
  onSnapshot,
  setDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import {
  Send,
  UserX,
  Flag,
  ArrowRight,
  LogOut,
  AlertTriangle,
  Sparkles,
  MapPin,
  Clock,
  ShieldAlert,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { AdBanner } from '../Ads/AdBanner';

interface TextChatViewProps {
  onBackToHome: () => void;
  onOpenReport: (reportedUserId: string, reportedPublicId: string, sessionId: string) => void;
}

export const TextChatView: React.FC<TextChatViewProps> = ({ onBackToHome, onOpenReport }) => {
  const { profile } = useAuth();
  const { t } = useLanguage();

  const [session, setSession] = useState<ChatSession | null>(null);
  const [status, setStatus] = useState<'searching' | 'connected' | 'ended'>('searching');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [moderationWarning, setModerationWarning] = useState<string | null>(null);
  const [partnerEndedNotice, setPartnerEndedNotice] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const cancelQueueRef = useRef<(() => void) | null>(null);

  const isUser1 = session?.user1Id === profile?.uid;
  const partnerPublicId = isUser1 ? session?.user2PublicId : session?.user1PublicId;
  const partnerName = isUser1 ? session?.user2DisplayName : session?.user1DisplayName;
  const partnerCity = isUser1 ? session?.user2City : session?.user1City;
  const partnerUid = isUser1 ? session?.user2Id : session?.user1Id;

  // Start matchmaking on mount or when clicking Next
  const startMatching = async () => {
    if (!profile) return;
    setStatus('searching');
    setSession(null);
    setMessages([]);
    setPartnerEndedNotice(null);
    setModerationWarning(null);

    if (cancelQueueRef.current) {
      cancelQueueRef.current();
    }

    const cancel = await findMatch(
      profile,
      'text',
      (matchedSession) => {
        setSession(matchedSession);
        setStatus('connected');
      },
      (error) => {
        console.error('Matchmaking error:', error);
      }
    );
    cancelQueueRef.current = cancel;
  };

  useEffect(() => {
    startMatching();
    return () => {
      if (cancelQueueRef.current) {
        cancelQueueRef.current();
      }
      if (session) {
        endChatSession(session.id, 'ended');
      }
    };
  }, []);

  // Listen for session changes (partner leaving/ending) and chat messages
  useEffect(() => {
    if (!session?.id) return;

    // 1. Session status listener
    const unsubSession = onSnapshot(doc(db, 'chat_sessions', session.id), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as ChatSession;
        if (data.status === 'ended' || data.status === 'skipped') {
          setStatus('ended');
          setPartnerEndedNotice(
            data.status === 'skipped' ? t('chatSkipped') : t('chatEnded')
          );
        }
      }
    });

    // 2. Messages listener
    const messagesQuery = query(
      collection(db, 'chat_sessions', session.id, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubMessages = onSnapshot(messagesQuery, (snap) => {
      const msgs: ChatMessage[] = [];
      snap.forEach((d) => {
        msgs.push({ id: d.id, ...d.data() } as ChatMessage);
      });
      setMessages(msgs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `chat_sessions/${session.id}/messages`);
    });

    return () => {
      unsubSession();
      unsubMessages();
    };
  }, [session?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !session || !profile || status !== 'connected') return;

    const rawText = inputText.trim();
    setModerationWarning(null);

    // Run client & server safety inspection
    const safetyCheck = inspectMessageSafety(rawText);
    if (safetyCheck.isBlocked) {
      setModerationWarning(safetyCheck.warningMessage || t('contactBlockedWarning'));
      return;
    }

    const newMsg: Omit<ChatMessage, 'id'> = {
      sessionId: session.id,
      senderId: profile.uid,
      senderPublicId: profile.publicId,
      text: rawText,
      timestamp: new Date().toISOString(),
      status: 'sent',
    };

    setInputText('');
    try {
      await addDoc(collection(db, 'chat_sessions', session.id, 'messages'), newMsg);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `chat_sessions/${session.id}/messages`);
    }
  };

  const handleNextUser = async () => {
    if (session) {
      await endChatSession(session.id, 'skipped', profile?.uid);
    }
    startMatching();
  };

  const handleLeaveChat = async () => {
    if (session) {
      await endChatSession(session.id, 'ended', profile?.uid);
    }
    if (cancelQueueRef.current) {
      cancelQueueRef.current();
    }
    onBackToHome();
  };

  const handleBlockUser = async () => {
    if (!profile || !partnerUid || !partnerPublicId) return;
    if (window.confirm(t('blockConfirm'))) {
      try {
        const blockId = `${profile.uid}_${partnerUid}`;
        await setDoc(doc(db, 'blocks', blockId), {
          id: blockId,
          userId: profile.uid,
          blockedUserId: partnerUid,
          blockedPublicId: partnerPublicId,
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Error blocking user:', err);
      }
      handleNextUser();
    }
  };

  // Searching State UI
  if (status === 'searching') {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-16 flex flex-col items-center justify-center text-center space-y-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-indigo-600/20 border-2 border-indigo-500/40 flex items-center justify-center animate-pulse">
            <RefreshCw className="w-10 h-10 text-indigo-400 animate-spin" />
          </div>
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full animate-ping" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white font-['Plus_Jakarta_Sans']">
            {t('findingMatch')}
          </h2>
          <p className="text-sm text-slate-400 max-w-md">
            {t('findingSubtext')} ({t('matchingPrefLabel')}: <span className="text-indigo-400 font-semibold">{profile?.matchingPreference?.toUpperCase()}</span>)
          </p>
        </div>

        <button
          onClick={handleLeaveChat}
          className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center space-x-2"
        >
          <LogOut className="w-4 h-4" />
          <span>Cancel & Return</span>
        </button>

        <AdBanner slotType="intermission" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 py-4 flex flex-col h-[calc(100vh-5rem)]">
      
      {/* Connected Partner Header */}
      <div className="p-3 sm:p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-emerald-600 flex items-center justify-center text-white font-bold text-sm">
            {partnerName?.[0]?.toUpperCase() || 'P'}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-white">
                {partnerName || 'Stranger'}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800">
                {partnerPublicId || 'RC-PARTNER'}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-[11px] text-slate-400">
              <span className="flex items-center space-x-1">
                <MapPin className="w-3 h-3 text-amber-400" />
                <span>{partnerCity || 'India'}</span>
              </span>
              <span>•</span>
              <span className="text-emerald-400 font-medium">● Connected</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          {/* Report Button */}
          <button
            onClick={() => {
              if (partnerUid && partnerPublicId && session) {
                onOpenReport(partnerUid, partnerPublicId, session.id);
              }
            }}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-950 hover:bg-amber-950/60 text-amber-400 border border-amber-900/60 text-xs font-medium flex items-center space-x-1.5 transition-colors"
            title={t('reportUser')}
          >
            <Flag className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('reportUser')}</span>
          </button>

          {/* Block Button */}
          <button
            onClick={handleBlockUser}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-950 hover:bg-rose-950/60 text-rose-400 border border-rose-900/60 text-xs font-medium flex items-center space-x-1.5 transition-colors"
            title={t('blockUser')}
          >
            <UserX className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('blockUser')}</span>
          </button>

          {/* Next User Button */}
          <button
            onClick={handleNextUser}
            className="px-3 sm:px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center space-x-1.5 active:scale-95 transition-all"
          >
            <span>{t('nextUser')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {/* Leave Chat */}
          <button
            onClick={handleLeaveChat}
            className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800"
            title={t('leaveChat')}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chat Messages Body */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-slate-950/50 rounded-2xl border border-slate-800/80 my-3">
        
        {/* Safety Notice Banner */}
        <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-900/60 text-center text-xs text-indigo-300 flex items-center justify-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>
            {t('contactBlockedWarning')}
          </span>
        </div>

        {messages.length === 0 && (
          <div className="text-center py-12 text-slate-500 text-xs space-y-3">
            <p>You are now connected with a verified partner. Say hello!</p>
            {/* Icebreaker chips */}
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-md mx-auto">
              {[
                'Namaste! Where are you from in India? 🇮🇳',
                'Kya haal chal hai? 😊',
                'What are your favorite hobbies? 🎨',
                'Any good movie recommendations? 🎬',
              ].map((ice, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInputText(ice);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] border border-slate-800"
                >
                  {ice}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.senderId === profile?.uid;
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[82%] sm:max-w-md px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  isMe
                    ? 'bg-indigo-600 text-white rounded-br-xs'
                    : 'bg-slate-900 text-slate-100 border border-slate-800 rounded-bl-xs'
                }`}
              >
                {msg.text}
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 px-1 font-mono">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}

        {/* Partner Ended Notice */}
        {partnerEndedNotice && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-center text-xs text-rose-300 space-y-2">
            <p>{partnerEndedNotice}</p>
            <button
              onClick={handleNextUser}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
            >
              {t('startNewChat')}
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Moderation Warning Toast */}
      {moderationWarning && (
        <div className="mb-2 p-3 rounded-xl bg-rose-950/90 border border-rose-700 text-rose-200 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{moderationWarning}</span>
          </div>
          <button
            onClick={() => setModerationWarning(null)}
            className="text-xs text-rose-400 hover:text-white underline ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Input Message Form */}
      <form onSubmit={handleSendMessage} className="flex items-center space-x-2 shrink-0">
        <input
          type="text"
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value);
            if (moderationWarning) setModerationWarning(null);
          }}
          disabled={status !== 'connected'}
          placeholder={status === 'connected' ? t('typeMessagePlaceholder') : 'Chat ended...'}
          className="flex-1 px-4 py-3 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm text-white focus:outline-none placeholder:text-slate-500"
        />
        <button
          type="submit"
          disabled={status !== 'connected' || !inputText.trim()}
          className="px-4 sm:px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-indigo-600/30 flex items-center space-x-1.5 transition-all"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">{t('send')}</span>
        </button>
      </form>

    </div>
  );
};
