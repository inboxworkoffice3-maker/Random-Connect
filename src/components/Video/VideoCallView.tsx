import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { findMatch, endChatSession } from '../../lib/matchmaking';
import { WebRTCManager } from '../../lib/webrtc';
import { ChatSession, ChatMessage } from '../../types';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import {
  collection,
  doc,
  addDoc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  ArrowRight,
  RotateCcw,
  Volume2,
  VolumeX,
  Flag,
  MessageSquare,
  Send,
  AlertCircle,
  MapPin,
  RefreshCw,
} from 'lucide-react';

interface VideoCallViewProps {
  onBackToHome: () => void;
  onOpenReport: (reportedUserId: string, reportedPublicId: string, sessionId: string) => void;
}

export const VideoCallView: React.FC<VideoCallViewProps> = ({ onBackToHome, onOpenReport }) => {
  const { profile } = useAuth();
  const { t } = useLanguage();

  const [session, setSession] = useState<ChatSession | null>(null);
  const [matchStatus, setMatchStatus] = useState<'searching' | 'negotiating' | 'connected' | 'ended'>('searching');
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  
  // Media controls state
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isVoiceOnly, setIsVoiceOnly] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [hasPermissionError, setHasPermissionError] = useState<string | null>(null);

  // Quick overlay chat
  const [showChatOverlay, setShowChatOverlay] = useState(false);
  const [overlayMessages, setOverlayMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const webrtcManagerRef = useRef<WebRTCManager | null>(null);
  const cancelQueueRef = useRef<(() => void) | null>(null);

  const isUser1 = session?.user1Id === profile?.uid;
  const partnerPublicId = isUser1 ? session?.user2PublicId : session?.user1PublicId;
  const partnerName = isUser1 ? session?.user2DisplayName : session?.user1DisplayName;
  const partnerCity = isUser1 ? session?.user2City : session?.user1City;
  const partnerUid = isUser1 ? session?.user2Id : session?.user1Id;

  // Initialize WebRTC Manager with stream attachments
  const initWebRTC = () => {
    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.cleanup();
    }

    const manager = new WebRTCManager({
      onRemoteStream: (stream) => {
        console.log('[VideoCallView] Attaching remote stream to video element');
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
          remoteVideoRef.current.play().catch((e) => {
            console.warn('[VideoCallView] Autoplay notice (click screen to unmute if needed):', e);
          });
        }
      },
      onConnectionStateChange: (state) => {
        console.log('[VideoCallView] Connection state:', state);
        setConnectionState(state);
        if (state === 'connected') {
          setMatchStatus('connected');
        } else if (state === 'failed' || state === 'disconnected') {
          console.warn('[VideoCallView] Peer connection state:', state);
        }
      },
      onCallEnded: () => {
        console.log('[VideoCallView] Call ended signal received');
        setMatchStatus('ended');
      },
      onError: (err) => {
        console.error('[VideoCallView] WebRTC error:', err);
      },
    });

    webrtcManagerRef.current = manager;
    return manager;
  };

  // Start matchmaking for video
  const startVideoMatching = async () => {
    if (!profile) return;
    setMatchStatus('searching');
    setSession(null);
    setHasPermissionError(null);

    const manager = initWebRTC();

    try {
      const localStream = await manager.initMedia(!isVoiceOnly, true, facingMode);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }
    } catch (err: any) {
      console.error('[VideoCallView] Camera/Microphone access error:', err);
      setHasPermissionError(
        'Unable to access camera or microphone. Please verify browser permissions are granted.'
      );
      return;
    }

    if (cancelQueueRef.current) {
      cancelQueueRef.current();
    }

    const cancel = await findMatch(
      profile,
      'video',
      async (matchedSession, isCaller) => {
        setSession(matchedSession);
        setMatchStatus('negotiating');

        const callId = `call_${matchedSession.id}`;
        console.log(`[VideoCallView] Matched session: ${matchedSession.id}, isCaller: ${isCaller}`);

        try {
          if (isCaller) {
            const calleeId = matchedSession.user1Id === profile.uid ? matchedSession.user2Id : matchedSession.user1Id;
            const calleePublicId = matchedSession.user1Id === profile.uid ? matchedSession.user2PublicId : matchedSession.user1PublicId;
            await manager.startCall(callId, profile.uid, profile.publicId, calleeId, calleePublicId);
          } else {
            // Callee listens reactively for offer without arbitrary timeout!
            await manager.answerCall(callId);
          }
        } catch (err) {
          console.error('[VideoCallView] WebRTC call setup error:', err);
        }
      },
      (err) => {
        console.error('[VideoCallView] Matchmaking video error:', err);
      }
    );

    cancelQueueRef.current = cancel;
  };

  useEffect(() => {
    startVideoMatching();

    return () => {
      if (cancelQueueRef.current) cancelQueueRef.current();
      if (webrtcManagerRef.current) webrtcManagerRef.current.cleanup();
      if (session) endChatSession(session.id, 'ended', profile?.uid);
    };
  }, []);

  // Listen to session status in Firestore and overlay messages
  useEffect(() => {
    if (!session?.id) return;

    const unsubSession = onSnapshot(doc(db, 'chat_sessions', session.id), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as ChatSession;
        if (data.status === 'ended' || data.status === 'skipped') {
          setMatchStatus('ended');
        }
      }
    });

    const messagesQuery = query(
      collection(db, 'chat_sessions', session.id, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubMessages = onSnapshot(messagesQuery, (snap) => {
      const msgs: ChatMessage[] = [];
      snap.forEach((d) => msgs.push({ id: d.id, ...d.data() } as ChatMessage));
      setOverlayMessages(msgs);
    });

    return () => {
      unsubSession();
      unsubMessages();
    };
  }, [session?.id]);

  const handleNextUser = async () => {
    if (session) {
      await endChatSession(session.id, 'skipped', profile?.uid);
    }
    if (webrtcManagerRef.current) {
      await webrtcManagerRef.current.endCall();
    }
    startVideoMatching();
  };

  const handleEndCall = async () => {
    if (session) {
      await endChatSession(session.id, 'ended', profile?.uid);
    }
    if (webrtcManagerRef.current) {
      await webrtcManagerRef.current.endCall();
    }
    onBackToHome();
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    webrtcManagerRef.current?.toggleMute(next);
  };

  const handleToggleVideo = () => {
    const next = !isVideoOff;
    setIsVideoOff(next);
    webrtcManagerRef.current?.toggleVideo(!next);
  };

  const handleFlipCamera = async () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);
    if (webrtcManagerRef.current) {
      try {
        const stream = await webrtcManagerRef.current.initMedia(!isVideoOff, !isMuted, nextFacing);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Camera switch failed:', err);
      }
    }
  };

  const handleToggleVoiceOnly = async () => {
    const nextVoiceOnly = !isVoiceOnly;
    setIsVoiceOnly(nextVoiceOnly);
    setIsVideoOff(nextVoiceOnly);
    webrtcManagerRef.current?.toggleVideo(!nextVoiceOnly);
  };

  const handleSendOverlayMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !session || !profile) return;
    const text = chatInput.trim();
    setChatInput('');
    try {
      await addDoc(collection(db, 'chat_sessions', session.id, 'messages'), {
        sessionId: session.id,
        senderId: profile.uid,
        senderPublicId: profile.publicId,
        text,
        timestamp: new Date().toISOString(),
        status: 'sent',
      });
    } catch (err) {
      console.error('Overlay chat send error:', err);
    }
  };

  if (hasPermissionError) {
    return (
      <div className="w-full max-w-lg mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-950/60 border border-rose-800 text-rose-400 mx-auto flex items-center justify-center">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white font-['Plus_Jakarta_Sans']">
          {t('cameraPermissionNeeded')}
        </h2>
        <p className="text-sm text-slate-300">{hasPermissionError}</p>
        <div className="flex justify-center gap-3">
          <button
            onClick={startVideoMatching}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
          >
            {t('requestPermissions')}
          </button>
          <button
            onClick={onBackToHome}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-5xl mx-auto px-2 sm:px-4 py-3 flex flex-col h-[calc(100vh-4.5rem)]">
      
      {/* Top Header Bar */}
      <div className="p-3 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-800 flex items-center justify-between mb-3 shrink-0 z-10">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                matchStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400 animate-ping'
              }`}
            />
            <span className="text-xs font-bold text-white">
              {matchStatus === 'connected'
                ? partnerName || 'Connected Partner'
                : matchStatus === 'negotiating'
                ? 'Handshaking Video Link...'
                : 'Searching Video Match...'}
            </span>
          </div>
          {matchStatus === 'connected' && (
            <div className="flex items-center space-x-1.5 text-[11px] text-slate-400">
              <span className="font-mono text-indigo-400 font-semibold bg-indigo-950 px-2 py-0.5 rounded border border-indigo-900">
                {partnerPublicId}
              </span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:flex items-center space-x-1 text-slate-300">
                <MapPin className="w-3 h-3 text-amber-400" />
                <span>{partnerCity || 'India'}</span>
              </span>
            </div>
          )}
        </div>

        {/* Safety & In-Call Chat Controls */}
        <div className="flex items-center space-x-2">
          {matchStatus === 'connected' && partnerUid && (
            <button
              onClick={() => session && onOpenReport(partnerUid, partnerPublicId || '', session.id)}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-800/80 text-xs font-medium flex items-center space-x-1.5"
              title={t('reportUser')}
            >
              <Flag className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">{t('reportUser')}</span>
            </button>
          )}

          <button
            onClick={() => setShowChatOverlay(!showChatOverlay)}
            className={`p-2 rounded-xl border text-xs font-medium flex items-center space-x-1 ${
              showChatOverlay
                ? 'bg-indigo-600 text-white border-indigo-500'
                : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
            }`}
            title="Toggle In-call Chat"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Video Screens Viewport */}
      <div className="relative flex-1 rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
        
        {/* Remote Video (Full Screen / Main View) */}
        {matchStatus === 'connected' ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover rounded-3xl"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-emerald-600/20 border-2 border-emerald-500/40 flex items-center justify-center animate-pulse">
                <VideoIcon className="w-8 h-8 text-emerald-400" />
              </div>
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full animate-ping" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {matchStatus === 'negotiating'
                  ? 'Connecting P2P WebRTC Signal...'
                  : t('findingMatch')}
              </h3>
              <p className="text-xs text-slate-400 mt-1">{t('findingSubtext')}</p>
            </div>
          </div>
        )}

        {/* Local Video Preview (Picture in Picture) */}
        <div className="absolute top-4 right-4 w-28 sm:w-44 aspect-[3/4] sm:aspect-video rounded-2xl overflow-hidden border-2 border-slate-700 bg-slate-900 shadow-2xl z-20">
          {!isVideoOff ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-400 text-xs p-2 text-center">
              <VideoOff className="w-5 h-5 mb-1" />
              <span>Cam Off</span>
            </div>
          )}
          <span className="absolute bottom-1 left-2 text-[10px] font-semibold text-white/90 bg-black/60 px-1.5 py-0.5 rounded">
            {t('yourVideo')}
          </span>
        </div>

        {/* In-Call Floating Chat Overlay */}
        {showChatOverlay && (
          <div className="absolute bottom-24 left-4 right-4 sm:right-auto sm:w-80 max-h-64 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl p-3 shadow-2xl flex flex-col z-30">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-800 pb-1">
              Live Call Chat
            </div>
            <div className="flex-1 overflow-y-auto space-y-1.5 max-h-36 pr-1 text-xs">
              {overlayMessages.length === 0 ? (
                <p className="text-slate-500 text-[11px] text-center py-2">No messages yet.</p>
              ) : (
                overlayMessages.map((m) => (
                  <div key={m.id} className="p-1.5 rounded-lg bg-slate-950/80 border border-slate-800">
                    <span className="font-mono text-[10px] text-indigo-400">{m.senderPublicId}: </span>
                    <span className="text-slate-200">{m.text}</span>
                  </div>
                ))
              )}
            </div>
            <form onSubmit={handleSendOverlayMessage} className="mt-2 flex gap-1">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Send quick message..."
                className="flex-1 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}

        {/* Partner Ended State Banner */}
        {matchStatus === 'ended' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-30 space-y-4">
            <h3 className="text-xl font-bold text-white">Call Disconnected</h3>
            <p className="text-xs text-slate-400">The partner has ended the call or switched.</p>
            <div className="flex gap-3">
              <button
                onClick={handleNextUser}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
              >
                {t('startNewChat')}
              </button>
              <button
                onClick={onBackToHome}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Return to Home
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Media Controls Bar (Always visible and never obstructed) */}
      <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center gap-2 sm:gap-4 mt-3 shrink-0 z-20">
        
        {/* Mic Toggle */}
        <button
          onClick={handleToggleMute}
          className={`p-3 rounded-2xl border transition-all ${
            isMuted
              ? 'bg-rose-950/80 border-rose-700 text-rose-300'
              : 'bg-slate-950 border-slate-800 text-slate-200 hover:bg-slate-800'
          }`}
          title={isMuted ? t('unmuteAudio') : t('muteAudio')}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-emerald-400" />}
        </button>

        {/* Video Camera Toggle */}
        <button
          onClick={handleToggleVideo}
          className={`p-3 rounded-2xl border transition-all ${
            isVideoOff
              ? 'bg-rose-950/80 border-rose-700 text-rose-300'
              : 'bg-slate-950 border-slate-800 text-slate-200 hover:bg-slate-800'
          }`}
          title={isVideoOff ? t('startVideo') : t('stopVideo')}
        >
          {isVideoOff ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5 text-indigo-400" />}
        </button>

        {/* Camera Flip (Front/Back) */}
        <button
          onClick={handleFlipCamera}
          className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 hover:bg-slate-800"
          title={t('flipCamera')}
        >
          <RotateCcw className="w-5 h-5 text-amber-400" />
        </button>

        {/* Voice-Only Toggle */}
        <button
          onClick={handleToggleVoiceOnly}
          className={`hidden sm:flex items-center space-x-1.5 px-3 py-2.5 rounded-2xl border text-xs font-semibold ${
            isVoiceOnly
              ? 'bg-indigo-950 border-indigo-700 text-indigo-300'
              : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
          }`}
          title="Switch to low-bandwidth voice-only mode"
        >
          {isVoiceOnly ? <Volume2 className="w-4 h-4 text-indigo-400" /> : <VolumeX className="w-4 h-4" />}
          <span>{isVoiceOnly ? t('voiceOnly') : 'Voice Mode'}</span>
        </button>

        {/* Next User Button */}
        <button
          onClick={handleNextUser}
          className="px-4 sm:px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 flex items-center space-x-2 active:scale-95 transition-all"
        >
          <span>{t('nextUser')}</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* End Call Button */}
        <button
          onClick={handleEndCall}
          className="p-3 sm:px-5 sm:py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-rose-600/30 flex items-center space-x-1.5 active:scale-95 transition-all"
          title={t('endCall')}
        >
          <PhoneOff className="w-5 h-5" />
          <span className="hidden sm:inline">{t('endCall')}</span>
        </button>

      </div>

    </div>
  );
};
