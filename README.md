# Kyrotics Expense Management Platform (Full Firebase Native Stack)

Production-grade, mobile-friendly expense tracking and approval system built natively for **Firebase** and **React SPA**.

## 1. Stack Architecture

- **Frontend:** React 18 SPA + Vite 5, Vanilla CSS design system, responsive mobile layout with fixed bottom quick-action bar.
- **Hosting:** Firebase Hosting (CDN-edge static file serving with `/api/**` rewrites).
- **Authentication:** Firebase Authentication (Email/Password + Role Profile in Firestore).
- **Database:** Cloud Firestore (Document store with strict Security Rules).
- **Receipt Storage:** Firebase Cloud Storage (Private receipt uploads with PDF/PNG/JPG MIME & 5MB size guards).
- **Serverless API:** Firebase Cloud Functions (Express + Firebase Admin SDK for atomic transactions and claim reference code generation).

## 2. Key Business Rules & Workflows

1. **Claim Immutability:** Once submitted by an employee, claims are **permanently locked** and cannot be modified or deleted.
2. **First Employee Screen:** Directs immediately to the **Claim Submission** page with a top action banner leading to previous claim status.
3. **Three-State Approval Workflow:**
   - `Pending Review`
   - `Approve` → Manual transition to `Settled` by Finance Admin upon payment.
   - `Reject` → Requires mandatory rejection reason; automatically marked as closed/settled with ₹0 reimbursement.
4. **13 Standardized Expense Categories:** Includes real-time example box for each category.
5. **Mobile Quick Action Bar:** Fixed 64px bottom navigation bar for one-tap navigation on smartphones.
6. **Colorful Gradient KPI Cards:** Custom gradient badges for Pending (Amber Gold), Ready to Settle (Royal Blue), Settled (Emerald Green), and Rejected (Crimson Rose).
7. **CSV Export Security:** Formula characters (`=`, `+`, `-`, `@`) are sanitized to prevent spreadsheet formula injection.

## 3. Local Development

### Prerequisites
- Node.js >= 18
- npm >= 9

### Step 1: Install Frontend Dependencies
```bash
cd frontend
npm install
```

### Step 2: Start Vite Development Server
```bash
npm run dev
```
The app will run at `http://localhost:3000`.

### Default Demo Credentials (Zero-Config Testing)
- **Finance Admin:** `admin@kyrotics.com` / `Password123!`
- **Employee:** `employee@kyrotics.com` / `Password123!`

---

## 4. Firebase Production Deployment

### Step 1: Install Firebase CLI
```bash
npm install -g firebase-tools
firebase login
```

### Step 2: Create Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add Project** and name it `kyrotics-expense` (or your preferred ID).
3. Enable **Authentication** (Email/Password provider).
4. Enable **Cloud Firestore** in production mode.
5. Enable **Cloud Storage**.

### Step 3: Link Project & Update Config
```bash
firebase use --add
```
Paste your Firebase Web App configuration credentials into `frontend/src/firebase.js`.

### Step 4: Seed Database
```bash
node scripts/seed.js
```

### Step 5: Build Frontend & Deploy All Services
```bash
cd frontend
npm run build
cd ..
firebase deploy
```
This deploys:
- Hosting (React SPA)
- Firestore Security Rules (`firestore.rules`)
- Storage Rules (`storage.rules`)
- Cloud Functions (`functions/src/index.js`)

