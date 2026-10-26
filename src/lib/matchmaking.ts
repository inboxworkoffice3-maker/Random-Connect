import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { ChatSession, UserProfile } from '../types';

export interface MatchResultCallback {
  onMatched: (session: ChatSession, isCaller: boolean) => void;
  onError: (err: any) => void;
}

/**
 * Join server-coordinated matchmaking and poll until partner is assigned
 */
export async function findMatch(
  profile: UserProfile,
  mode: 'text' | 'video',
  onMatched: (session: ChatSession, isCaller: boolean) => void,
  onError: (err: any) => void
): Promise<() => void> {
  const currentUserId = profile.uid;
  let isCancelled = false;
  let pollTimer: any = null;

  try {
    console.log(`[Matchmaking] User ${profile.publicId} joining queue for mode: ${mode}`);

    // 1. Join server queue
    const res = await fetch('/api/match/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUserId,
        publicId: profile.publicId,
        displayName: profile.displayName,
        gender: profile.gender,
        targetGender: profile.matchingPreference,
        city: profile.city,
        mode,
      }),
    });

    const data = await res.json();

    const handleMatchFound = async (match: any) => {
      if (isCancelled) return;
      if (pollTimer) clearInterval(pollTimer);

      const isCaller = match.callerId === currentUserId;
      console.log(`[Matchmaking] MATCH CONFIRMED! Session: ${match.sessionId}, IsCaller: ${isCaller}`);

      const sessionData: ChatSession = {
        id: match.sessionId,
        type: match.type,
        user1Id: match.user1Id,
        user1PublicId: match.user1PublicId,
        user1DisplayName: match.user1DisplayName,
        user1City: match.user1City,
        user2Id: match.user2Id,
        user2PublicId: match.user2PublicId,
        user2DisplayName: match.user2DisplayName,
        user2City: match.user2City,
        status: 'active',
        createdAt: new Date(match.createdAt).toISOString(),
      };

      // Ensure Firestore document exists so onSnapshot listeners sync
      try {
        const sessionDocRef = doc(db, 'chat_sessions', match.sessionId);
        await setDoc(sessionDocRef, sessionData, { merge: true });
      } catch (e) {
        console.warn('[Matchmaking] Warning syncing session to Firestore:', e);
      }

      onMatched(sessionData, isCaller);
    };

    if (data.status === 'matched' && data.match) {
      await handleMatchFound(data.match);
      return () => {
        isCancelled = true;
      };
    }

    // 2. Poll server for match updates
    pollTimer = setInterval(async () => {
      if (isCancelled) return;

      try {
        const pollRes = await fetch('/api/match/poll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUserId }),
        });
        const pollData = await pollRes.json();

        if (pollData.status === 'matched' && pollData.match) {
          await handleMatchFound(pollData.match);
        }
      } catch (pollErr) {
        console.warn('[Matchmaking] Poll error:', pollErr);
      }
    }, 1200);

    return () => {
      isCancelled = true;
      if (pollTimer) clearInterval(pollTimer);
      fetch('/api/match/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId }),
      }).catch(() => {});
    };

  } catch (error) {
    console.error('[Matchmaking] Error entering match queue:', error);
    onError(error);
    return () => {
      isCancelled = true;
    };
  }
}

/**
 * End an active chat session and notify the other party
 */
export async function endChatSession(sessionId: string, status: 'ended' | 'skipped' = 'ended', userId?: string) {
  try {
    // 1. Notify server queue
    fetch('/api/match/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, action: status, userId }),
    }).catch(() => {});

    // 2. Update Firestore
    const sessionRef = doc(db, 'chat_sessions', sessionId);
    await updateDoc(sessionRef, {
      status,
      endedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Matchmaking] Error ending chat session:', err);
  }
}
