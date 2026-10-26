import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  deleteUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isProfileModalOpen: boolean;
  setIsProfileModalOpen: (open: boolean) => void;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  deleteUserAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isProfileModalOpen: false,
  setIsProfileModalOpen: () => {},
  signInWithGoogle: async () => {},
  signOutUser: async () => {},
  updateUserProfile: async () => {},
  deleteUserAccount: async () => {},
});

// Helper to generate non-identifiable public user ID (e.g., RC-83921)
function generatePublicId(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = 'RC-';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);

  // Check if current user is owner admin
  const isOwnerAdmin =
    user?.email === 'inboxworkoffice3@gmail.com' || profile?.role === 'admin';

  useEffect(() => {
    // Process redirect result if redirected on mobile
    getRedirectResult(auth).catch(() => {});

    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);

        try {
          const userSnap = await getDoc(userDocRef);
          const nowStr = new Date().toISOString();

          if (!userSnap.exists()) {
            // First time login - create baseline profile
            const isEmailOwner = currentUser.email === 'inboxworkoffice3@gmail.com';
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email || '',
              publicId: generatePublicId(),
              displayName: currentUser.displayName?.split(' ')[0] || 'Member',
              photoURL: currentUser.photoURL || undefined,
              age: 18,
              gender: 'prefer_not_to_say',
              city: 'Delhi NCR',
              language: 'en',
              matchingPreference: 'open',
              isProfileComplete: false,
              isBanned: false,
              isSuspended: false,
              warningCount: 0,
              isOnline: true,
              lastActiveAt: nowStr,
              role: isEmailOwner ? 'admin' : 'user',
              createdAt: nowStr,
              updatedAt: nowStr,
            };

            await setDoc(userDocRef, newProfile);
            setProfile(newProfile);
            setIsProfileModalOpen(true);
          } else {
            const data = userSnap.data() as UserProfile;
            // Update photoURL if available from Google & mark active
            const updates: Partial<UserProfile> = {
              isOnline: true,
              lastActiveAt: nowStr,
              updatedAt: nowStr,
            };
            if (currentUser.photoURL && !data.photoURL) {
              updates.photoURL = currentUser.photoURL;
            }
            await updateDoc(userDocRef, updates).catch(() => {});
            setProfile({ ...data, ...updates });
            if (!data.isProfileComplete) {
              setIsProfileModalOpen(true);
            }
          }

          // Live listener for updates (e.g., bans, warnings, name updates)
          unsubscribeProfile = onSnapshot(userDocRef, (snap) => {
            if (snap.exists()) {
              setProfile(snap.data() as UserProfile);
            }
          }, (error) => {
            console.error('Snapshot listener error:', error);
          });

          // Send initial presence heartbeat
          fetch('/api/presence/heartbeat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: currentUser.uid,
              publicId: profile?.publicId || currentUser.uid.substring(0, 8),
              displayName: currentUser.displayName || 'Member',
              photoURL: currentUser.photoURL || '',
            }),
          }).catch(() => {});

        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
        }
      } else {
        setProfile(null);
        if (unsubscribeProfile) {
          unsubscribeProfile();
        }
      }

      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  // Periodic real presence heartbeat while active
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      fetch('/api/presence/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          publicId: profile?.publicId,
          displayName: profile?.displayName,
          photoURL: user.photoURL,
        }),
      }).catch(() => {});
    }, 15000); // 15 seconds heartbeat

    const handleBeforeUnload = () => {
      if (user) {
        const payload = JSON.stringify({ userId: user.uid });
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/presence/offline', payload);
        } else {
          fetch('/api/presence/offline', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true,
          }).catch(() => {});
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user, profile?.publicId, profile?.displayName]);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.warn('Google Sign In popup error:', error?.code, error?.message);
      if (
        error.code === 'auth/popup-blocked' ||
        error.code === 'auth/cancelled-popup-request' ||
        error.code === 'auth/operation-not-supported-in-this-environment'
      ) {
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      if (error.code !== 'auth/popup-closed-by-user') {
        throw error;
      }
    }
  };

  const signOutUser = async () => {
    if (user) {
      fetch('/api/presence/offline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid }),
      }).catch(() => {});
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          isOnline: false,
          lastActiveAt: new Date().toISOString(),
        }).catch(() => {});
      } catch (e) {}
    }

    try {
      await signOut(auth);
      setProfile(null);
      setUser(null);
    } catch (error) {
      console.error('Sign Out error:', error);
    }
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const updatePayload = {
        ...data,
        updatedAt: new Date().toISOString(),
      };
      await updateDoc(userDocRef, updatePayload);
      setProfile((prev) => prev ? { ...prev, ...updatePayload } : null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const deleteUserAccount = async () => {
    if (!user) return;
    try {
      // 1. Send offline signal
      fetch('/api/presence/offline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid }),
      }).catch(() => {});
      // 2. Delete matching queue item if any
      await deleteDoc(doc(db, 'matching_queue', user.uid)).catch(() => {});
      // 3. Delete user doc
      await deleteDoc(doc(db, 'users', user.uid));
      // 4. Delete auth account
      await deleteUser(user);
      setProfile(null);
      setUser(null);
    } catch (error) {
      console.error('Account deletion error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAdmin: Boolean(isOwnerAdmin),
        isProfileModalOpen,
        setIsProfileModalOpen,
        signInWithGoogle,
        signOutUser,
        updateUserProfile,
        deleteUserAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
