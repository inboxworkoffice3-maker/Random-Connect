export type Language = 'en' | 'hi';

export type Gender = 'male' | 'female' | 'non-binary' | 'prefer_not_to_say';

export type MatchingPreference = 'open' | 'female' | 'male' | 'nearby';

export interface UserProfile {
  uid: string;
  email: string;
  publicId: string;
  displayName: string;
  age: number;
  gender: Gender;
  city: string;
  state?: string;
  language: 'en' | 'hi' | 'hinglish';
  matchingPreference: MatchingPreference;
  isProfileComplete: boolean;
  photoURL?: string;
  isOnline?: boolean;
  lastActiveAt?: string;
  isBanned?: boolean;
  banReason?: string;
  isSuspended?: boolean;
  suspensionReason?: string;
  warningCount?: number;
  role: 'admin' | 'user';
  createdAt: string;
  updatedAt: string;
}

export interface PublicStats {
  totalRegistered: number;
  onlineCount: number;
  offlineCount: number;
  activeChats: number;
  activeVideoCalls: number;
  waitingInQueue: number;
  status?: string;
}


export interface ChatSession {
  id: string;
  type: 'text' | 'video';
  user1Id: string;
  user1PublicId: string;
  user1DisplayName: string;
  user1City?: string;
  user2Id: string;
  user2PublicId: string;
  user2DisplayName: string;
  user2City?: string;
  status: 'active' | 'ended' | 'skipped';
  createdAt: string;
  endedAt?: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  senderId: string;
  senderPublicId: string;
  text: string;
  timestamp: string;
  status?: 'sent' | 'blocked' | 'warning';
  warningMessage?: string;
}

export interface CallSession {
  id: string;
  callerId: string;
  callerPublicId: string;
  callerDisplayName?: string;
  calleeId: string;
  calleePublicId: string;
  calleeDisplayName?: string;
  status: 'calling' | 'connected' | 'ended';
  offer?: {
    type: RTCSdpType;
    sdp: string;
  };
  answer?: {
    type: RTCSdpType;
    sdp: string;
  };
  createdAt: string;
}

export interface MatchingQueueItem {
  userId: string;
  publicId: string;
  displayName: string;
  gender: Gender;
  targetGender: MatchingPreference;
  city: string;
  mode: 'text' | 'video';
  status: 'waiting' | 'matched' | 'cancelled';
  matchedSessionId?: string;
  matchedPeerPublicId?: string;
  matchedPeerDisplayName?: string;
  matchedPeerCity?: string;
  timestamp: string;
}

export interface ReportItem {
  id: string;
  reporterId: string;
  reporterPublicId: string;
  reportedUserId: string;
  reportedPublicId: string;
  category: 'harassment' | 'nudity_inappropriate' | 'underage' | 'abusive_language' | 'contact_sharing' | 'scam' | 'other';
  description: string;
  sessionId?: string;
  status: 'pending' | 'reviewed' | 'action_taken' | 'dismissed';
  createdAt: string;
  actionNote?: string;
}

export interface SupportTicketItem {
  id: string;
  ticketNumber: string;
  userId: string;
  userPublicId: string;
  email: string;
  subject: string;
  message: string;
  category: 'general' | 'safety' | 'technical' | 'account' | 'billing_ad';
  status: 'open' | 'in_progress' | 'resolved';
  createdAt: string;
  adminResponse?: string;
}

export interface UserBlockItem {
  id: string;
  userId: string;
  blockedUserId: string;
  blockedPublicId: string;
  createdAt: string;
}

export interface AdConfig {
  enabled: boolean;
  adClient: string;
  headerSlot: string;
  intermissionSlot: string;
  sidebarSlot: string;
  testMode: boolean;
  estimatedImpressions?: number;
  estimatedRevenueINR?: number;
}

export interface AuditLogItem {
  id: string;
  action: string;
  targetUserId?: string;
  targetUserPublicId?: string;
  targetPublicId?: string;
  targetDisplayName?: string;
  details?: string;
  reason?: string;
  timestamp: string;
  ip?: string;
  adminUsername: string;
}

