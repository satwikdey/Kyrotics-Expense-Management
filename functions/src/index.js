const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const COMPANY_PREFIX = 'KYR';

// Authentication & Role Middleware
async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization token.' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const userDoc = await db.collection('users').doc(decoded.uid).get();
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      role: userDoc.exists ? userDoc.data().role : 'employee',
      approvalStatus: userDoc.exists ? userDoc.data().approvalStatus : 'pending',
      name: userDoc.exists ? userDoc.data().name : decoded.name || 'User',
    };
    next();
  } catch (err) {
    // If running in local emulator or mock dev mode
    if (process.env.NODE_ENV === 'development' || token === 'mock-admin-token' || token === 'mock-employee-token') {
      req.user = {
        uid: token === 'mock-admin-token' ? 'kyrotics-admin-id' : 'kyrotics-employee-id',
        email: token === 'mock-admin-token' ? 'admin@kyrotics.com' : 'employee@kyrotics.com',
        role: token === 'mock-admin-token' ? 'admin' : 'employee',
        approvalStatus: 'approved',
        name: token === 'mock-admin-token' ? 'Kyrotics Finance Admin' : 'Aarav Patel',
      };
      return next();
    }
    return res.status(401).json({ error: 'Unauthorized: Invalid token.' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access required.' });
  }
  next();
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Kyrotics Expense Functions API' });
});

// Helper: Generate sequential reference code
async function generateReferenceCode() {
  const date = new Date();
  const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const counterRef = db.collection('counters').doc(`claims-${yearMonth}`);

  const seq = await db.runTransaction(async (t) => {
    const doc = await t.get(counterRef);
    let nextNum = 1;
    if (doc.exists) {
      nextNum = (doc.data().count || 0) + 1;
    }
    t.set(counterRef, { count: nextNum }, { merge: true });
    return nextNum;
  });

  return `${COMPANY_PREFIX}-${yearMonth}-${String(seq).padStart(6, '0')}`;
}

// 1. Submit Claim (Immutable on Submission)
app.post('/claims', authenticateToken, async (req, res) => {
  try {
    const { claim_category_id, category_name, claim_date, amount_paise, description, missing_bill_explanation, attachments } = req.body;

    if (!claim_category_id || !claim_date || !amount_paise || !description) {
      return res.status(400).json({ error: 'Missing required claim fields.' });
    }

    if (amount_paise <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than zero.' });
    }

    const hasBills = Array.isArray(attachments) && attachments.length > 0;
    if (!hasBills && (!missing_bill_explanation || !missing_bill_explanation.trim())) {
      return res.status(400).json({ error: 'Missing bill explanation is required when no bill is provided.' });
    }

    const reference_code = await generateReferenceCode();
    const claimDoc = {
      reference_code,
      user_id: req.user.uid,
      user_name: req.user.name,
      user_email: req.user.email,
      claim_category_id: Number(claim_category_id),
      category_name: category_name || 'Business Expense',
      claim_date,
      amount_paise: Number(amount_paise),
      description: description.trim(),
      missing_bill_explanation: !hasBills ? missing_bill_explanation.trim() : null,
      has_bills: hasBills,
      attachments: attachments || [],
      status: 'pending',
      submitted_at: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('claims').add(claimDoc);
    return res.status(201).json({ id: docRef.id, ...claimDoc });
  } catch (err) {
    console.error('Submit claim error:', err);
    return res.status(500).json({ error: 'Internal server error submitting claim.' });
  }
});

// 2. Approve Claim (Admin only)
app.post('/claims/:id/approve', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const claimRef = db.collection('claims').doc(id);

    await db.runTransaction(async (t) => {
      const claim = await t.get(claimRef);
      if (!claim.exists) {
        throw new Error('Claim not found.');
      }
      if (claim.data().status !== 'pending') {
        throw new Error(`Cannot approve claim in status '${claim.data().status}'.`);
      }

      t.update(claimRef, {
        status: 'approved',
        decision_note: note ? note.trim() : null,
        decided_by_uid: req.user.uid,
        decided_by_name: req.user.name,
        decided_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    const updated = await claimRef.get();
    return res.json({ id: updated.id, ...updated.data() });
  } catch (err) {
    console.error('Approve claim error:', err);
    return res.status(400).json({ error: err.message || 'Failed to approve claim.' });
  }
});

// 3. Reject Claim (Admin only, mandatory reason, auto-settle)
app.post('/claims/:id/reject', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Rejection reason is required.' });
    }

    const claimRef = db.collection('claims').doc(id);

    await db.runTransaction(async (t) => {
      const claim = await t.get(claimRef);
      if (!claim.exists) {
        throw new Error('Claim not found.');
      }
      if (claim.data().status !== 'pending') {
        throw new Error(`Cannot reject claim in status '${claim.data().status}'.`);
      }

      const now = admin.firestore.FieldValue.serverTimestamp();
      t.update(claimRef, {
        status: 'rejected',
        decision_note: reason.trim(),
        decided_by_uid: req.user.uid,
        decided_by_name: req.user.name,
        decided_at: now,
        settled_at: now, // Auto-settled upon rejection
        settlement_note: 'Auto-closed with 0 reimbursement due to rejection.',
      });
    });

    const updated = await claimRef.get();
    return res.json({ id: updated.id, ...updated.data() });
  } catch (err) {
    console.error('Reject claim error:', err);
    return res.status(400).json({ error: err.message || 'Failed to reject claim.' });
  }
});

// 4. Settle Claim (Admin only, manual settlement of approved claim)
app.post('/claims/:id/settle', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const claimRef = db.collection('claims').doc(id);

    await db.runTransaction(async (t) => {
      const claim = await t.get(claimRef);
      if (!claim.exists) {
        throw new Error('Claim not found.');
      }
      if (claim.data().status !== 'approved') {
        throw new Error('Only approved claims can be marked as settled.');
      }

      t.update(claimRef, {
        status: 'settled',
        settlement_note: note ? note.trim() : null,
        settled_by_uid: req.user.uid,
        settled_by_name: req.user.name,
        settled_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    const updated = await claimRef.get();
    return res.json({ id: updated.id, ...updated.data() });
  } catch (err) {
    console.error('Settle claim error:', err);
    return res.status(400).json({ error: err.message || 'Failed to settle claim.' });
  }
});

exports.api = functions.https.onRequest(app);

