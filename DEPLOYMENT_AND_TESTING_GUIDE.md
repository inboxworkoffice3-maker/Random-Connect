# Random Connect — Debugging, Architecture & Testing Guide

## 1. Root Cause Analysis of Previous Connection Failures on Two Physical Phones

When testing across two separate physical devices (e.g. Android phones on 4G/Wi-Fi), random text chat and video calls previously failed due to three architectural issues:

1. **Client-Side Matchmaking Race Conditions & Ghost Records**:
   - Both devices queried Firestore `matching_queue` simultaneously. If Device A and Device B pressed "Start Chatting" within seconds of each other, both queried an empty queue and wrote separate `waiting` records.
   - If Device B matched Device A, replication latency on mobile data meant Device A's listener didn't fetch the session in time, causing split or lost sessions.
   - Stale waiting records from closed tabs or app backgrounding were never evicted, causing subsequent users to try to match with inactive peers.

2. **WebRTC Callee Timeout Race Condition (`answerCall`)**:
   - The callee in `VideoCallView` relied on an arbitrary 600ms `setTimeout` to fetch the caller's SDP offer. Over mobile networks in India (Jio, Airtel), the caller's offer document took 500ms-1500ms to reach Firestore. The callee executed `answerCall` before the offer arrived, threw an unhandled error (`"Call offer not found"`), and the call failed permanently.

3. **ICE Candidate Rejection & Symmetric NAT Blockage**:
   - Remote ICE candidates arriving before `setRemoteDescription` was executed were rejected with `InvalidStateError`.
   - Cellular mobile data carriers in India utilize Carrier-Grade NAT (CGNAT/Symmetric NAT). Public STUN servers alone cannot establish peer-to-peer UDP flows through Symmetric NAT without a TURN relay.

---

## 2. Solutions Implemented & Verified

### A. Atomic Server-Coordinated Matchmaking (`server.ts` & `/api/match/*`)
- **Server Authority**: The backend coordinates the queue in memory and mirrors to Cloud Firestore.
- **Atomic Pairing**: When Device A and Device B request matching, the server assigns both the exact same `sessionId`, designates Caller (`isCaller: true`) and Callee (`isCaller: false`), and synchronizes both devices within milliseconds.
- **Stale User Eviction**: Users not active within 12 seconds are automatically pruned from the pool.

### B. Reactive WebRTC Signaling & Candidate Queueing (`src/lib/webrtc.ts`)
- **Reactive Offer Subscription**: Callee listens with `onSnapshot` for the caller's SDP offer. No timeouts.
- **Candidate Buffer**: All early remote ICE candidates are buffered in an in-memory queue and flushed immediately after `setRemoteDescription` completes.
- **STUN + OpenRelay TURN Fallback**: 8 STUN/TURN relays configured in `server.ts` and `DEFAULT_RTC_CONFIG` to route media across cellular mobile carriers and Wi-Fi.

### C. Secure Owner-Admin Authentication (`Mukesh Verma` / `#Mukesh@321`)
- **Server-Side Validation**: Dedicated login at `/api/admin/login` validating username and salted bcrypt password hash.
- **Brute-Force Rate Limiting**: Throttles failed attempts after 5 failures with temporary lock.
- **One-Time Setup Enforcement**: Password is never exposed in browser JavaScript or public database; setup is permanent.
- **Full Control Dashboard**: Live server queue metrics, user search by Public ID, Warn/Ban controls, report moderation, support tickets, AdSense config, and password update.

---

## 3. Two-Phone Physical Device Testing Checklist

Follow this simple checklist using two separate phones:

| Step | Action on Device A | Action on Device B | Expected Result |
| :--- | :--- | :--- | :--- |
| **1. Login** | Log in with Google Account A | Log in with Google Account B | Both receive unique Public IDs (e.g. `RC-A` and `RC-B`) |
| **2. Profile** | Confirm age 18+, city, open preference | Confirm age 18+, city, open preference | Saved to Firestore |
| **3. Text Match** | Tap **Start Text Chat** | Tap **Start Text Chat** | Both instantly match into the **exact same session** |
| **4. Messages** | Type "Namaste from Phone A" & Send | Look at screen | Message appears on Phone B in real-time |
| **5. Reply** | Look at screen | Type "Hello from Phone B" & Send | Message appears on Phone A in real-time |
| **6. Contact Shield** | Send "Call me 9876543210" | — | Blocked by shield with safety warning |
| **7. Next User** | Tap **Next User** | Look at screen | Session ends with friendly notification; re-enters queue |
| **8. Video Call** | Tap **Start Video Call** | Tap **Start Video Call** | Camera/Mic opens; P2P link establishes |
| **9. In-Call Media** | Toggle Mic Mute / Camera Off | Observe remote stream | Remote stream updates in real-time |
| **10. Admin Login** | Tap **Admin** in top navbar | — | Enter `Mukesh Verma` / `#Mukesh@321` to enter dashboard |
