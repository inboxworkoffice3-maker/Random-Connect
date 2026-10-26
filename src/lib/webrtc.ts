import { db, handleFirestoreError, OperationType } from './firebase';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  addDoc,
} from 'firebase/firestore';

export interface WebRTCConnectionHandlers {
  onRemoteStream: (stream: MediaStream) => void;
  onConnectionStateChange: (state: RTCPeerConnectionState) => void;
  onCallEnded: () => void;
  onError?: (err: Error) => void;
}

// Fallback high-reliability STUN + TURN configurations
export const DEFAULT_RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceCandidatePoolSize: 10,
};

export class WebRTCManager {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private callId: string | null = null;
  private unsubscribers: (() => void)[] = [];
  private handlers: WebRTCConnectionHandlers;
  private isCaller: boolean = false;
  private candidateQueue: RTCIceCandidateInit[] = [];
  private isRemoteDescriptionSet: boolean = false;

  constructor(handlers: WebRTCConnectionHandlers) {
    this.handlers = handlers;
  }

  public getPeerConnection(): RTCPeerConnection | null {
    return this.pc;
  }

  public async initMedia(
    video = true,
    audio = true,
    facingMode: 'user' | 'environment' = 'user'
  ): Promise<MediaStream> {
    try {
      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: video
          ? {
              facingMode,
              width: { ideal: 640, max: 1280 },
              height: { ideal: 480, max: 720 },
              frameRate: { max: 30 },
            }
          : false,
        audio: audio
          ? {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            }
          : false,
      });
      this.localStream = stream;
      return stream;
    } catch (err: any) {
      console.error('[WebRTC] Error acquiring camera/microphone stream:', err);
      if (this.handlers.onError) this.handlers.onError(err);
      throw err;
    }
  }

  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  private createPeerConnection(): RTCPeerConnection {
    if (this.pc) {
      try {
        this.pc.close();
      } catch (e) {}
    }

    this.candidateQueue = [];
    this.isRemoteDescriptionSet = false;

    this.pc = new RTCPeerConnection(DEFAULT_RTC_CONFIG);

    // Attach local media tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        if (this.pc && this.localStream) {
          this.pc.addTrack(track, this.localStream);
        }
      });
    }

    // Handle remote media track arrival
    const remoteStream = new MediaStream();
    this.pc.ontrack = (event) => {
      console.log('[WebRTC] Received remote track:', event.track.kind);
      event.streams[0].getTracks().forEach((track) => {
        if (!remoteStream.getTracks().some((t) => t.id === track.id)) {
          remoteStream.addTrack(track);
        }
      });
      this.handlers.onRemoteStream(remoteStream);
    };

    // Monitor connection states
    this.pc.onconnectionstatechange = () => {
      if (this.pc) {
        console.log('[WebRTC] Connection state changed:', this.pc.connectionState);
        this.handlers.onConnectionStateChange(this.pc.connectionState);
      }
    };

    this.pc.oniceconnectionstatechange = () => {
      if (this.pc) {
        console.log('[WebRTC] ICE connection state:', this.pc.iceConnectionState);
      }
    };

    return this.pc;
  }

  // Flush queued candidates after remote description is ready
  private async flushCandidateQueue() {
    if (!this.pc || !this.isRemoteDescriptionSet) return;
    while (this.candidateQueue.length > 0) {
      const candidate = this.candidateQueue.shift();
      if (candidate) {
        try {
          await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn('[WebRTC] Error adding queued ICE candidate:', err);
        }
      }
    }
  }

  /**
   * Caller starts call: creates offer and listens for answer
   */
  public async startCall(
    callId: string,
    callerId: string,
    callerPublicId: string,
    calleeId: string,
    calleePublicId: string
  ): Promise<string> {
    this.callId = callId;
    this.isCaller = true;
    console.log('[WebRTC] Starting call as CALLER for room:', callId);

    const pc = this.createPeerConnection();
    const callDocRef = doc(db, 'call_sessions', callId);
    const callerCandidatesCollection = collection(callDocRef, 'callerCandidates');
    const calleeCandidatesCollection = collection(callDocRef, 'calleeCandidates');

    // Send caller ICE candidates to Firestore
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(callerCandidatesCollection, event.candidate.toJSON()).catch((err) => {
          console.error('[WebRTC] Error posting caller candidate:', err);
        });
      }
    };

    // Create & set local SDP offer
    const offerDescription = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await pc.setLocalDescription(offerDescription);

    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
    };

    try {
      await setDoc(callDocRef, {
        id: callId,
        callerId,
        callerPublicId,
        calleeId,
        calleePublicId,
        status: 'calling',
        offer,
        createdAt: new Date().toISOString(),
      });
      console.log('[WebRTC] Offer successfully posted to Firestore');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `call_sessions/${callId}`);
    }

    // Reactive listener: wait for callee Answer
    const unsubAnswer = onSnapshot(
      callDocRef,
      async (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.data();

        if (data?.status === 'ended') {
          this.handlers.onCallEnded();
          return;
        }

        if (data?.answer && !this.isRemoteDescriptionSet && pc.signalingState !== 'stable') {
          console.log('[WebRTC] Received remote answer from Callee');
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            this.isRemoteDescriptionSet = true;
            await this.flushCandidateQueue();
          } catch (e) {
            console.error('[WebRTC] Error setting remote description on caller:', e);
          }
        }
      },
      (error) => {
        console.error('[WebRTC] Firestore error on answer snapshot:', error);
      }
    );
    this.unsubscribers.push(unsubAnswer);

    // Listen for Callee's ICE candidates
    const unsubCalleeCandidates = onSnapshot(calleeCandidatesCollection, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const candidateData = change.doc.data();
          if (this.isRemoteDescriptionSet && pc.remoteDescription) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidateData));
            } catch (e) {
              console.warn('[WebRTC] Error adding remote candidate:', e);
            }
          } else {
            this.candidateQueue.push(candidateData);
          }
        }
      });
    });
    this.unsubscribers.push(unsubCalleeCandidates);

    return callId;
  }

  /**
   * Callee answers call: waits reactively for offer, then responds with answer
   */
  public async answerCall(callId: string): Promise<void> {
    this.callId = callId;
    this.isCaller = false;
    console.log('[WebRTC] Answering call as CALLEE for room:', callId);

    const pc = this.createPeerConnection();
    const callDocRef = doc(db, 'call_sessions', callId);
    const callerCandidatesCollection = collection(callDocRef, 'callerCandidates');
    const calleeCandidatesCollection = collection(callDocRef, 'calleeCandidates');

    // Send callee ICE candidates to Firestore
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(calleeCandidatesCollection, event.candidate.toJSON()).catch((err) => {
          console.error('[WebRTC] Error posting callee candidate:', err);
        });
      }
    };

    let isOfferHandled = false;

    // Reactively wait for offer with onSnapshot (eliminating any race condition)
    const unsubOffer = onSnapshot(callDocRef, async (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();

      if (data?.status === 'ended') {
        this.handlers.onCallEnded();
        return;
      }

      if (data?.offer && !isOfferHandled && pc.signalingState === 'stable') {
        isOfferHandled = true;
        console.log('[WebRTC] Offer detected on Callee, processing answer...');

        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
          this.isRemoteDescriptionSet = true;
          await this.flushCandidateQueue();

          const answerDescription = await pc.createAnswer();
          await pc.setLocalDescription(answerDescription);

          await updateDoc(callDocRef, {
            answer: {
              type: answerDescription.type,
              sdp: answerDescription.sdp,
            },
            status: 'connected',
          });
          console.log('[WebRTC] Answer posted to Firestore by Callee');
        } catch (err) {
          console.error('[WebRTC] Error creating or setting callee answer:', err);
        }
      }
    });
    this.unsubscribers.push(unsubOffer);

    // Listen for Caller's ICE candidates
    const unsubCallerCandidates = onSnapshot(callerCandidatesCollection, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const candidateData = change.doc.data();
          if (this.isRemoteDescriptionSet && pc.remoteDescription) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidateData));
            } catch (e) {
              console.warn('[WebRTC] Error adding caller candidate:', e);
            }
          } else {
            this.candidateQueue.push(candidateData);
          }
        }
      });
    });
    this.unsubscribers.push(unsubCallerCandidates);
  }

  public toggleMute(mute: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !mute;
      });
    }
  }

  public toggleVideo(videoEnabled: boolean) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = videoEnabled;
      });
    }
  }

  public async endCall() {
    if (this.callId) {
      try {
        const callDocRef = doc(db, 'call_sessions', this.callId);
        await updateDoc(callDocRef, { status: 'ended' });
      } catch (err) {
        console.warn('[WebRTC] Error marking call ended:', err);
      }
    }
    this.cleanup();
  }

  public cleanup() {
    console.log('[WebRTC] Cleaning up call session');
    this.unsubscribers.forEach((unsub) => {
      try {
        unsub();
      } catch (e) {}
    });
    this.unsubscribers = [];

    if (this.pc) {
      try {
        this.pc.close();
      } catch (e) {}
      this.pc = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    this.candidateQueue = [];
    this.isRemoteDescriptionSet = false;
    this.callId = null;
  }
}
