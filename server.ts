import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'rc_super_secret_owner_admin_key_2026';

app.use(express.json());
app.use(cookieParser());

// Rate limiter for admin login attempts
const loginAttempts: Record<string, { count: number; lockedUntil: number }> = {};

// ==========================================
// 1. REGISTERED USERS & PRESENCE STORAGE
// ==========================================
export interface StoredUser {
  uid: string;
  publicId: string;
  displayName: string;
  email?: string;
  photoURL?: string;
  age?: number;
  gender?: string;
  city?: string;
  language?: string;
  matchingPreference?: string;
  isProfileComplete?: boolean;
  isBanned?: boolean;
  banReason?: string;
  isSuspended?: boolean;
  suspensionReason?: string;
  suspendedUntil?: string;
  warningCount?: number;
  role?: string;
  lastActiveAt?: string;
  createdAt: string;
  updatedAt?: string;
}

const REGISTERED_USERS_FILE = path.join(__dirname, '.registered_users_store.json');
const AUDIT_LOGS_FILE = path.join(__dirname, '.admin_audit_logs.json');
const ADMIN_STORE_FILE = path.join(__dirname, '.admin_auth_store.json');

function loadRegisteredUsers(): Map<string, StoredUser> {
  const map = new Map<string, StoredUser>();
  try {
    if (fs.existsSync(REGISTERED_USERS_FILE)) {
      const arr: StoredUser[] = JSON.parse(fs.readFileSync(REGISTERED_USERS_FILE, 'utf-8'));
      if (Array.isArray(arr)) {
        arr.forEach((u) => map.set(u.uid, u));
      }
    }
  } catch (err) {
    console.error('Error loading registered users store:', err);
  }
  return map;
}

const registeredUsersStore = loadRegisteredUsers();

function saveRegisteredUsers() {
  try {
    const arr = Array.from(registeredUsersStore.values());
    fs.writeFileSync(REGISTERED_USERS_FILE, JSON.stringify(arr, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving registered users store:', err);
  }
}

// In-memory presence map
interface UserPresence {
  userId: string;
  lastSeen: number;
  isOnline: boolean;
}

const presenceStore: Map<string, UserPresence> = new Map();
const PRESENCE_TIMEOUT_MS = 35000; // 35 seconds inactivity timeout

function isUserOnline(userId: string): boolean {
  const p = presenceStore.get(userId);
  if (!p) return false;
  return p.isOnline && Date.now() - p.lastSeen <= PRESENCE_TIMEOUT_MS;
}

// Presence background scanner: marks users offline after timeout
setInterval(() => {
  const now = Date.now();
  for (const [_userId, presence] of presenceStore.entries()) {
    if (presence.isOnline && now - presence.lastSeen > PRESENCE_TIMEOUT_MS) {
      presence.isOnline = false;
    }
  }
}, 5000);

// Presence Heartbeat endpoint: updates presence & synchronizes user directory
app.post('/api/presence/heartbeat', (req: Request, res: Response) => {
  const {
    userId,
    publicId,
    displayName,
    photoURL,
    email,
    city,
    gender,
    age,
    language,
    matchingPreference,
  } = req.body;

  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  const now = Date.now();
  const nowStr = new Date(now).toISOString();

  // 1. Update presence tracker
  presenceStore.set(userId, {
    userId,
    lastSeen: now,
    isOnline: true,
  });

  // 2. Synchronize registered users directory
  const existing = registeredUsersStore.get(userId);
  const updatedUser: StoredUser = {
    uid: userId,
    publicId: publicId || existing?.publicId || userId.substring(0, 8),
    displayName: displayName || existing?.displayName || 'Member',
    email: email || existing?.email || '',
    photoURL: photoURL || existing?.photoURL,
    city: city || existing?.city || 'Delhi NCR',
    gender: gender || existing?.gender || 'prefer_not_to_say',
    age: age || existing?.age || 18,
    language: language || existing?.language || 'en',
    matchingPreference: matchingPreference || existing?.matchingPreference || 'open',
    isProfileComplete: existing?.isProfileComplete ?? true,
    isBanned: existing?.isBanned ?? false,
    banReason: existing?.banReason ?? '',
    isSuspended: existing?.isSuspended ?? false,
    warningCount: existing?.warningCount ?? 0,
    role: existing?.role || 'user',
    lastActiveAt: nowStr,
    createdAt: existing?.createdAt || nowStr,
    updatedAt: nowStr,
  };

  registeredUsersStore.set(userId, updatedUser);
  saveRegisteredUsers();

  return res.json({ success: true, timestamp: now });
});

// Explicit offline signal
app.post('/api/presence/offline', (req: Request, res: Response) => {
  const { userId } = req.body;
  if (userId) {
    if (presenceStore.has(userId)) {
      const p = presenceStore.get(userId)!;
      p.isOnline = false;
      p.lastSeen = Date.now();
    }
    if (registeredUsersStore.has(userId)) {
      const u = registeredUsersStore.get(userId)!;
      u.lastActiveAt = new Date().toISOString();
      saveRegisteredUsers();
    }
  }
  return res.json({ success: true });
});

// ==========================================
// 2. GENUINE PUBLIC STATS (STRICTLY NO FAKE NUMBERS)
// ==========================================
app.get('/api/stats/public', (_req: Request, res: Response) => {
  const totalRegistered = registeredUsersStore.size;

  let onlineCount = 0;
  for (const uid of registeredUsersStore.keys()) {
    if (isUserOnline(uid)) {
      onlineCount++;
    }
  }

  const offlineCount = Math.max(0, totalRegistered - onlineCount);

  let activeChats = 0;
  let activeVideoCalls = 0;
  for (const match of activeMatches.values()) {
    if (match.status === 'active') {
      if (match.type === 'text') activeChats++;
      if (match.type === 'video') activeVideoCalls++;
    }
  }

  return res.json({
    totalRegistered,
    onlineCount,
    offlineCount,
    activeChats,
    activeVideoCalls,
    waitingInQueue: waitingQueue.size,
    status: 'verified',
  });
});

// ==========================================
// 3. MATCHMAKING ENGINE
// ==========================================
interface QueueUser {
  userId: string;
  publicId: string;
  displayName: string;
  gender: string;
  targetGender: string;
  city: string;
  mode: 'text' | 'video';
  joinedAt: number;
  lastSeen: number;
}

interface ActiveMatch {
  sessionId: string;
  type: 'text' | 'video';
  user1Id: string;
  user1PublicId: string;
  user1DisplayName: string;
  user1City: string;
  user2Id: string;
  user2PublicId: string;
  user2DisplayName: string;
  user2City: string;
  callerId: string;
  calleeId: string;
  status: 'active' | 'ended' | 'skipped';
  createdAt: number;
}

const waitingQueue: Map<string, QueueUser> = new Map();
const activeMatches: Map<string, ActiveMatch> = new Map();
const userToMatch: Map<string, string> = new Map();

// Clean up stale queue members every 5 seconds
setInterval(() => {
  const now = Date.now();
  for (const [userId, qUser] of waitingQueue.entries()) {
    if (now - qUser.lastSeen > 12000) {
      waitingQueue.delete(userId);
    }
  }
}, 5000);

function tryMatch(user: QueueUser): ActiveMatch | null {
  for (const [candidateId, candidate] of waitingQueue.entries()) {
    if (candidateId === user.userId) continue;
    if (candidate.mode !== user.mode) continue;

    // Preference filtering
    if (user.targetGender === 'female' && candidate.gender !== 'female') continue;
    if (user.targetGender === 'male' && candidate.gender !== 'male') continue;
    if (candidate.targetGender === 'female' && user.gender !== 'female') continue;
    if (candidate.targetGender === 'male' && user.gender !== 'male') continue;
    if (user.targetGender === 'nearby' && candidate.city !== user.city) continue;

    waitingQueue.delete(candidateId);
    waitingQueue.delete(user.userId);

    const sessionId = `rc_sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const match: ActiveMatch = {
      sessionId,
      type: user.mode,
      user1Id: candidate.userId,
      user1PublicId: candidate.publicId,
      user1DisplayName: candidate.displayName,
      user1City: candidate.city,
      user2Id: user.userId,
      user2PublicId: user.publicId,
      user2DisplayName: user.displayName,
      user2City: user.city,
      callerId: candidate.userId,
      calleeId: user.userId,
      status: 'active',
      createdAt: Date.now(),
    };

    activeMatches.set(sessionId, match);
    userToMatch.set(candidate.userId, sessionId);
    userToMatch.set(user.userId, sessionId);

    return match;
  }
  return null;
}

app.post('/api/match/join', (req: Request, res: Response) => {
  const { userId, publicId, displayName, gender, targetGender, city, mode } = req.body;
  if (!userId || !publicId) {
    return res.status(400).json({ error: 'Missing userId or publicId' });
  }

  // Update presence on queue join
  presenceStore.set(userId, {
    userId,
    lastSeen: Date.now(),
    isOnline: true,
  });

  const existingSessionId = userToMatch.get(userId);
  if (existingSessionId && activeMatches.has(existingSessionId)) {
    const match = activeMatches.get(existingSessionId);
    if (match && match.status === 'active') {
      return res.json({ status: 'matched', match });
    }
  }

  const qUser: QueueUser = {
    userId,
    publicId,
    displayName: displayName || 'User',
    gender: gender || 'prefer_not_to_say',
    targetGender: targetGender || 'open',
    city: city || 'Delhi NCR',
    mode: mode || 'text',
    joinedAt: Date.now(),
    lastSeen: Date.now(),
  };

  const matched = tryMatch(qUser);
  if (matched) {
    return res.json({ status: 'matched', match: matched });
  }

  waitingQueue.set(userId, qUser);
  return res.json({ status: 'waiting', queueSize: waitingQueue.size });
});

app.post('/api/match/poll', (req: Request, res: Response) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  if (presenceStore.has(userId)) {
    presenceStore.get(userId)!.lastSeen = Date.now();
    presenceStore.get(userId)!.isOnline = true;
  }

  const sessionId = userToMatch.get(userId);
  if (sessionId && activeMatches.has(sessionId)) {
    const match = activeMatches.get(sessionId);
    if (match && match.status === 'active') {
      return res.json({ status: 'matched', match });
    }
  }

  const qUser = waitingQueue.get(userId);
  if (qUser) {
    qUser.lastSeen = Date.now();
    const matched = tryMatch(qUser);
    if (matched) {
      return res.json({ status: 'matched', match: matched });
    }
    return res.json({ status: 'waiting', queueSize: waitingQueue.size });
  }

  return res.json({ status: 'idle' });
});

app.post('/api/match/leave', (req: Request, res: Response) => {
  const { userId, sessionId, action } = req.body;
  if (userId) {
    waitingQueue.delete(userId);
    userToMatch.delete(userId);
  }
  if (sessionId && activeMatches.has(sessionId)) {
    const match = activeMatches.get(sessionId)!;
    match.status = action === 'skipped' ? 'skipped' : 'ended';
    userToMatch.delete(match.user1Id);
    userToMatch.delete(match.user2Id);
  }
  return res.json({ success: true });
});

// ==========================================
// 4. WEBRTC STUN / TURN CONFIGURATION
// ==========================================
app.get('/api/webrtc/ice-servers', (_req: Request, res: Response) => {
  return res.json({
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
  });
});

// ==========================================
// 5. SECURE OWNER ADMIN AUTHENTICATION
// ==========================================
interface AdminUser {
  username: string;
  passwordHash: string;
  role: 'owner_admin';
  setupCompleted: boolean;
  createdAt: string;
  lastLogin?: string;
}

interface AuditLog {
  id: string;
  adminUsername: string;
  action: string;
  targetUserId?: string;
  targetPublicId?: string;
  targetDisplayName?: string;
  reason: string;
  timestamp: string;
}

function getStoredAdmin(): AdminUser {
  try {
    if (fs.existsSync(ADMIN_STORE_FILE)) {
      const data = JSON.parse(fs.readFileSync(ADMIN_STORE_FILE, 'utf-8'));
      if (data && data.username) return data;
    }
  } catch (err) {
    console.error('Error reading admin store:', err);
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync('#Mukesh@321', salt);
  const initialAdmin: AdminUser = {
    username: 'Mukesh Verma',
    passwordHash,
    role: 'owner_admin',
    setupCompleted: true,
    createdAt: new Date().toISOString(),
  };

  try {
    fs.writeFileSync(ADMIN_STORE_FILE, JSON.stringify(initialAdmin, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error initializing admin store file:', err);
  }

  return initialAdmin;
}

let currentAdmin: AdminUser = getStoredAdmin();

function getAuditLogs(): AuditLog[] {
  try {
    if (fs.existsSync(AUDIT_LOGS_FILE)) {
      return JSON.parse(fs.readFileSync(AUDIT_LOGS_FILE, 'utf-8'));
    }
  } catch (e) {}
  return [];
}

function addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>) {
  const logs = getAuditLogs();
  const entry: AuditLog = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    ...log,
    timestamp: new Date().toISOString(),
  };
  logs.unshift(entry);
  try {
    fs.writeFileSync(AUDIT_LOGS_FILE, JSON.stringify(logs.slice(0, 100), null, 2), 'utf-8');
  } catch (e) {}
  return entry;
}

function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.substring(7)
    : req.cookies?.rc_admin_token;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Admin authentication token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { username: string; role: string };
    if (decoded.username !== currentAdmin.username || decoded.role !== 'owner_admin') {
      return res.status(403).json({ error: 'Forbidden: Invalid admin credentials' });
    }
    (req as any).adminUser = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expired or invalid token' });
  }
}

app.post('/api/admin/login', (req: Request, res: Response) => {
  const ip = req.ip || '127.0.0.1';
  const now = Date.now();

  if (loginAttempts[ip]) {
    if (loginAttempts[ip].lockedUntil > now) {
      const remainingSeconds = Math.ceil((loginAttempts[ip].lockedUntil - now) / 1000);
      return res.status(429).json({
        error: `Too many failed login attempts. Locked for ${remainingSeconds} seconds.`,
      });
    }
  }

  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const usernameMatch = username.trim() === currentAdmin.username;
  const passwordMatch = usernameMatch ? bcrypt.compareSync(password, currentAdmin.passwordHash) : false;

  if (!usernameMatch || !passwordMatch) {
    if (!loginAttempts[ip]) {
      loginAttempts[ip] = { count: 1, lockedUntil: 0 };
    } else {
      loginAttempts[ip].count += 1;
      if (loginAttempts[ip].count >= 5) {
        loginAttempts[ip].lockedUntil = now + 5 * 60 * 1000;
      }
    }
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  delete loginAttempts[ip];

  currentAdmin.lastLogin = new Date().toISOString();
  try {
    fs.writeFileSync(ADMIN_STORE_FILE, JSON.stringify(currentAdmin, null, 2), 'utf-8');
  } catch (e) {}

  addAuditLog({
    adminUsername: currentAdmin.username,
    action: 'login',
    reason: `Successful admin login from IP ${ip}`,
  });

  const token = jwt.sign(
    {
      username: currentAdmin.username,
      role: currentAdmin.role,
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.cookie('rc_admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  });

  return res.json({
    success: true,
    token,
    admin: {
      username: currentAdmin.username,
      role: currentAdmin.role,
      lastLogin: currentAdmin.lastLogin,
    },
  });
});

app.get('/api/admin/me', requireAdminAuth, (_req: Request, res: Response) => {
  return res.json({
    username: currentAdmin.username,
    role: currentAdmin.role,
    lastLogin: currentAdmin.lastLogin,
  });
});

app.post('/api/admin/change-password', requireAdminAuth, (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters long' });
  }

  const isCurrentValid = bcrypt.compareSync(currentPassword, currentAdmin.passwordHash);
  if (!isCurrentValid) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const salt = bcrypt.genSaltSync(10);
  currentAdmin.passwordHash = bcrypt.hashSync(newPassword, salt);

  try {
    fs.writeFileSync(ADMIN_STORE_FILE, JSON.stringify(currentAdmin, null, 2), 'utf-8');
  } catch (err) {
    return res.status(500).json({ error: 'Failed to persist password update' });
  }

  addAuditLog({
    adminUsername: currentAdmin.username,
    action: 'password_change',
    reason: 'Owner password changed successfully',
  });

  return res.json({ success: true, message: 'Password updated successfully' });
});

// ==========================================
// 6. ALL USERS DIRECTORY & MODERATION (ADMIN PROTECTED)
// ==========================================
app.get('/api/admin/users', requireAdminAuth, (req: Request, res: Response) => {
  const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
  const limit = Math.max(1, Math.min(50, parseInt((req.query.limit as string) || '10', 10)));
  const filterStatus = ((req.query.status as string) || 'all').toLowerCase();
  const search = ((req.query.search as string) || '').trim().toLowerCase();

  let allUsers = Array.from(registeredUsersStore.values()).map((u) => {
    const online = isUserOnline(u.uid);
    return {
      ...u,
      isOnline: online,
    };
  });

  // Sort newest registration first
  allUsers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalRegistered = allUsers.length;
  const onlineCount = allUsers.filter((u) => u.isOnline).length;
  const offlineCount = totalRegistered - onlineCount;

  // Apply search
  if (search) {
    allUsers = allUsers.filter(
      (u) =>
        u.publicId.toLowerCase().includes(search) ||
        u.displayName.toLowerCase().includes(search) ||
        (u.city && u.city.toLowerCase().includes(search)) ||
        (u.email && u.email.toLowerCase().includes(search))
    );
  }

  // Apply online/offline status filter
  if (filterStatus === 'online') {
    allUsers = allUsers.filter((u) => u.isOnline);
  } else if (filterStatus === 'offline') {
    allUsers = allUsers.filter((u) => !u.isOnline);
  }

  const totalFiltered = allUsers.length;
  const totalPages = Math.ceil(totalFiltered / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginatedUsers = allUsers.slice(startIndex, startIndex + limit);

  return res.json({
    users: paginatedUsers,
    total: totalFiltered,
    totalRegistered,
    onlineCount,
    offlineCount,
    page,
    limit,
    totalPages,
  });
});

app.get('/api/admin/users/:userId', requireAdminAuth, (req: Request, res: Response) => {
  const { userId } = req.params;
  const user = registeredUsersStore.get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found in registered directory' });
  }
  return res.json({
    user: {
      ...user,
      isOnline: isUserOnline(userId),
    },
  });
});

app.post('/api/admin/users/:userId/moderate', requireAdminAuth, (req: Request, res: Response) => {
  const { userId } = req.params;
  const { action, reason, durationHours } = req.body;

  if (!action || !reason) {
    return res.status(400).json({ error: 'Action and mandatory recorded reason required' });
  }

  const user = registeredUsersStore.get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const nowStr = new Date().toISOString();

  if (action === 'warn') {
    user.warningCount = (user.warningCount || 0) + 1;
    user.updatedAt = nowStr;
  } else if (action === 'suspend') {
    const hours = durationHours || 24;
    user.isSuspended = true;
    user.suspensionReason = reason;
    user.suspendedUntil = new Date(Date.now() + hours * 3600 * 1000).toISOString();
    user.updatedAt = nowStr;
  } else if (action === 'ban') {
    user.isBanned = true;
    user.banReason = reason;
    user.updatedAt = nowStr;
    waitingQueue.delete(userId);
  } else if (action === 'unban') {
    user.isBanned = false;
    user.banReason = '';
    user.isSuspended = false;
    user.updatedAt = nowStr;
  } else if (action === 'delete') {
    registeredUsersStore.delete(userId);
    waitingQueue.delete(userId);
    presenceStore.delete(userId);
  } else {
    return res.status(400).json({ error: 'Invalid moderation action' });
  }

  saveRegisteredUsers();

  addAuditLog({
    adminUsername: currentAdmin.username,
    action,
    targetUserId: userId,
    targetPublicId: user.publicId,
    targetDisplayName: user.displayName,
    reason,
  });

  return res.json({
    success: true,
    message: `Action ${action.toUpperCase()} recorded successfully.`,
  });
});

app.get('/api/admin/audit-logs', requireAdminAuth, (_req: Request, res: Response) => {
  return res.json({ logs: getAuditLogs() });
});

app.get('/api/admin/stats', requireAdminAuth, (_req: Request, res: Response) => {
  const totalUsers = registeredUsersStore.size;
  let onlineCount = 0;
  let bannedCount = 0;

  for (const [uid, u] of registeredUsersStore.entries()) {
    if (isUserOnline(uid)) onlineCount++;
    if (u.isBanned) bannedCount++;
  }

  let activeTextChats = 0;
  let activeVideoCalls = 0;
  for (const match of activeMatches.values()) {
    if (match.status === 'active') {
      if (match.type === 'text') activeTextChats++;
      if (match.type === 'video') activeVideoCalls++;
    }
  }

  return res.json({
    totalUsers,
    onlineCount,
    offlineCount: Math.max(0, totalUsers - onlineCount),
    activeTextChats,
    activeVideoCalls,
    waitingQueueSize: waitingQueue.size,
    bannedCount,
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

app.post('/api/admin/logout', (_req: Request, res: Response) => {
  res.clearCookie('rc_admin_token');
  return res.json({ success: true });
});

// ==========================================
// 7. VITE FRONTEND MOUNTING & STATIC SERVING
// ==========================================
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[Random Connect Server] Live at http://0.0.0.0:${PORT}`);
  });
}

startServer();
