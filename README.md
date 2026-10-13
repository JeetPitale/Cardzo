# Cardzo — Production Identity Wallet & Dynamic Attendance Platform

> **Tagline:** One Pass. Every Identity.  
> Inspired by Apple Wallet's simplicity, original visual pass preservation, and zero-trust verification.

---

## 🏛️ System Architecture

```
Cardzo/
├── assets/
│   └── cardzo-logo.png             # Official high-resolution Cardzo brand icon
├── backend/                        # Node.js + TypeScript + Express + Prisma + SQLite/Postgres
│   ├── src/
│   │   ├── index.ts                # REST API server & CORS configuration
│   │   ├── prisma.ts               # Prisma ORM client
│   │   ├── middleware/auth.ts      # Single-device session enforcement & RBAC
│   │   ├── routes/
│   │   │   ├── auth.ts             # Atomic device login, session invalidation, JWT
│   │   │   ├── cards.ts            # Physical card scan & digital pass storage
│   │   │   ├── qr.ts               # Cryptographic short-lived dynamic QR tokens (45s)
│   │   │   ├── attendance.ts       # Attendance history, stats & current session
│   │   │   ├── garud.ts            # Garud Verifier atomic check-in/out state machine
│   │   │   └── admin.ts            # Institutional registrar, CSV bulk import, audits
│   │   └── test-suite.ts           # 15/15 automated tests verifying security guarantees
│   └── prisma/
│       ├── schema.prisma           # Relational schema (Users, Sessions, Cards, Attendance, Audits)
│       └── seed.ts                 # Realistic database seeder
├── admin/                          # Institutional Web Admin Portal (React + Vite + TypeScript)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx          # Brand header, persona switcher, quick navigation
│   │   │   ├── DashboardView.tsx   # Live KPIs, real-time gate stream, architecture
│   │   │   ├── UsersView.tsx       # User directory, 1-click Garud role assignment, CSV bulk import
│   │   │   ├── CredentialsView.tsx # Digital pass lifecycle, issuer-verified vs scanned copies
│   │   │   ├── AttendanceView.tsx  # Turnstile logs, audited forgotten checkout manual corrections
│   │   │   ├── GarudScannerSimulator.tsx # High-contrast gate verifier terminal with live verdicts
│   │   │   └── MobileWalletPreview.tsx   # Interactive iPhone Apple Wallet simulator
│   │   └── index.css               # Apple-inspired dark mode glassmorphism design system
└── mobile/                         # Mobile React Native (Expo + TypeScript)
    ├── App.tsx                     # Mobile wallet, stacked passes, dynamic QR overlay, card scanner
    └── src/
        ├── services/api.ts         # Secure token handling & session invalidation listener
        └── types.ts                # TypeScript data interfaces
```

---

## 🔐 Core Security & Business Rules Enforced

1. **Single-Device Session Enforcement**:
   - Each account has strictly one active authenticated session.
   - When signing in on a new device, all prior sessions are revoked atomically.
   - Any API request from an invalidated session receives `401 Unauthorized` with `code: SESSION_REVOKED`.

2. **Dynamic Short-Lived QR Tokens**:
   - Cryptographically unpredictable SHA-256 tokens generated server-side.
   - Configurable 45-second lifespan with visual countdown timer.
   - Opaque hash containing no plaintext passwords or PII.

3. **Garud Verifier Atomic State Machine**:
   - $\text{Checked Out} \xrightarrow{\text{Valid Dynamic QR}} \text{Checked In}$
   - $\text{Checked In} \xrightarrow{\text{Fresh Dynamic QR}} \text{Checked Out}$
   - Replay attacks strictly prevented: Consumed tokens are atomically flagged in database.
   - Duplicate active sessions prevented by database transactions.

4. **Audited Manual Corrections**:
   - Forgotten checkouts can be corrected by administrators only with a mandatory justification reason logged into the immutable `AuditLog`.

5. **Original Visual Pass Preservation**:
   - Scanned physical cards preserve aspect ratio, front/back views, and colors.
   - Clearly labeled as `SCANNED PHYSICAL COPY` to prevent misleading representation as issuer-authenticated passes.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js (v18+)
- npm (v9+)

### 2. Start the Backend API
```bash
cd backend
npm install
npx prisma db push
npm run prisma:seed
npm run dev
```
*Backend runs on `http://localhost:4000`.*

### 3. Run the Automated Test Suite
```bash
cd backend
npx tsx src/test-suite.ts
```
*Verifies 15 critical security scenarios: Single-device logout, dynamic token expiry, Garud state transitions, replay rejection, and RBAC.*

### 4. Start the Institutional Web Portal
```bash
cd admin
npm install
npm run dev
```
*Open `http://localhost:3000` in your browser.*

---

## 👥 Seeded Demonstration Accounts

| Role | Name | Email | Password |
|---|---|---|---|
| **Institutional Admin** | Dr. Elena Vance | `admin@cardzo.io` | `Password123!` |
| **Garud Verifier** | Officer Vikram Singh | `garud@cardzo.io` | `Password123!` |
| **Student Cardholder** | Aarav Sharma | `aarav@cardzo.io` | `Password123!` |
| **Student Cardholder** | Priya Patel | `priya@cardzo.io` | `Password123!` |

*(Use the quick persona switcher in the top right of the Web Admin Portal to seamlessly switch between identities.)*
