import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { STANDARD_CATEGORIES } from '../utils/categories';
import { csvSafe, formatIstDate, formatInr } from '../utils/format';

const CLAIM_PREFIX = 'KYR';

// Initial pre-seeded claims for instant zero-config testing
const INITIAL_CLAIMS = [
  {
    id: 'kyr-claim-001',
    reference_code: 'KYR-202611-000001',
    user_id: 'kyrotics-employee-id',
    user_name: 'Aarav Patel',
    user_email: 'employee@kyrotics.com',
    claim_category_id: 1,
    category_name: 'Travel & Transportation',
    claim_date: '2026-11-02',
    amount_paise: 45000,
    description: 'Airport taxi fare for client visit',
    missing_bill_explanation: 'Paper receipt not provided by driver',
    has_bills: false,
    status: 'pending',
    attachments: [],
    submitted_at: '2026-11-02T09:30:00Z',
  },
  {
    id: 'kyr-claim-002',
    reference_code: 'KYR-202611-000002',
    user_id: 'kyrotics-employee-id',
    user_name: 'Aarav Patel',
    user_email: 'employee@kyrotics.com',
    claim_category_id: 2,
    category_name: 'Food & Meals',
    claim_date: '2026-10-30',
    amount_paise: 125000,
    description: 'Business team lunch meeting',
    missing_bill_explanation: null,
    has_bills: false,
    status: 'approved',
    decided_by_name: 'Kyrotics Finance Admin',
    decided_at: '2026-10-31T14:15:00Z',
    decision_note: 'Approved as per business dining entitlement.',
    attachments: [],
    submitted_at: '2026-10-30T13:00:00Z',
  },
  {
    id: 'kyr-claim-003',
    reference_code: 'KYR-202611-000003',
    user_id: 'kyrotics-employee-id',
    user_name: 'Aarav Patel',
    user_email: 'employee@kyrotics.com',
    claim_category_id: 4,
    category_name: 'Fuel & Mileage',
    claim_date: '2026-10-27',
    amount_paise: 80000,
    description: 'Field site petrol expense',
    missing_bill_explanation: null,
    has_bills: false,
    status: 'settled',
    decided_by_name: 'Kyrotics Finance Admin',
    decided_at: '2026-10-28T10:00:00Z',
    settled_by_name: 'Kyrotics Finance Admin',
    settled_at: '2026-10-29T16:00:00Z',
    settlement_note: 'Reimbursed via UPI / Bank Transfer Ref #UTR998822',
    attachments: [],
    submitted_at: '2026-10-27T11:00:00Z',
  },
  {
    id: 'kyr-claim-004',
    reference_code: 'KYR-202611-000004',
    user_id: 'kyrotics-employee-id',
    user_name: 'Aarav Patel',
    user_email: 'employee@kyrotics.com',
    claim_category_id: 11,
    category_name: 'Client Entertainment',
    claim_date: '2026-10-24',
    amount_paise: 210000,
    description: 'Weekend dinner expense',
    missing_bill_explanation: 'Paper slip missing',
    has_bills: false,
    status: 'rejected',
    decided_by_name: 'Kyrotics Finance Admin',
    decided_at: '2026-10-25T11:00:00Z',
    decision_note: 'Weekend expense not pre-approved under company entertainment policy.',
    settled_at: '2026-10-25T11:00:00Z', // Auto-settled with 0 payout
    attachments: [],
    submitted_at: '2026-10-24T20:00:00Z',
  },
];

function getStoredClaims() {
  const data = localStorage.getItem('kyrotics_claims');
  if (!data) {
    localStorage.setItem('kyrotics_claims', JSON.stringify(INITIAL_CLAIMS));
    return [...INITIAL_CLAIMS];
  }
  return JSON.parse(data);
}

function saveStoredClaims(claims) {
  localStorage.setItem('kyrotics_claims', JSON.stringify(claims));
}

export const claimService = {
  getCategories() {
    return STANDARD_CATEGORIES;
  },

  async getClaims({ userId, status, categoryId, employeeId, dateFrom, dateTo }) {
    try {
      // 1. Try Firestore
      let q = collection(db, 'claims');
      const constraints = [];
      if (userId) constraints.push(where('user_id', '==', userId));
      if (status) constraints.push(where('status', '==', status));
      if (categoryId) constraints.push(where('claim_category_id', '==', Number(categoryId)));
      if (employeeId) constraints.push(where('user_id', '==', employeeId));
      if (dateFrom) constraints.push(where('claim_date', '>=', dateFrom));
      if (dateTo) constraints.push(where('claim_date', '<=', dateTo));
      constraints.push(orderBy('claim_date', 'desc'));

      const snapshot = await getDocs(query(q, ...constraints));
      if (!snapshot.empty) {
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      }
    } catch {
      // Fallback to local storage
    }

    // Filter local claims
    let list = getStoredClaims();
    if (userId) list = list.filter((c) => c.user_id === userId);
    if (status) list = list.filter((c) => c.status === status);
    if (categoryId) list = list.filter((c) => Number(c.claim_category_id) === Number(categoryId));
    if (employeeId) list = list.filter((c) => c.user_id === employeeId);
    if (dateFrom) list = list.filter((c) => c.claim_date >= dateFrom);
    if (dateTo) list = list.filter((c) => c.claim_date <= dateTo);

    return list.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
  },

  async getClaimById(claimId) {
    try {
      const snap = await getDoc(doc(db, 'claims', claimId));
      if (snap.exists()) return { id: snap.id, ...snap.data() };
    } catch {
      // Fallback
    }
    const list = getStoredClaims();
    return list.find((c) => c.id === claimId) || null;
  },

  async submitClaim({ user, categoryId, claimDate, amountPaise, description, missingBillExplanation, files = [] }) {
    if (!user || user.approvalStatus !== 'approved' || user.isActive === false) {
      throw new Error('Only approved and active employees can submit claims.');
    }

    const cat = STANDARD_CATEGORIES.find((c) => c.id === Number(categoryId));
    if (!cat) throw new Error('Invalid expense category selected.');

    if (files.length > 5) throw new Error('A maximum of 5 files is allowed per claim.');
    for (const f of files) {
      if (f.size > 5 * 1024 * 1024) throw new Error(`File ${f.name} exceeds 5 MB limit.`);
    }

    if (files.length === 0 && (!missingBillExplanation || missingBillExplanation.trim().length === 0)) {
      throw new Error('An explanation is required when no receipt or bill is attached.');
    }

    const now = new Date();
    const dateCode = now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0');
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const referenceCode = `${CLAIM_PREFIX}-${dateCode}-${randomSuffix}`;
    const claimId = 'clm-' + Date.now();

    const attachments = [];
    for (const file of files) {
      try {
        const fileRef = ref(storage, `receipts/${claimId}/${file.name}`);
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);
        attachments.push({
          name: file.name,
          size: file.size,
          type: file.type,
          url,
        });
      } catch {
        attachments.push({
          name: file.name,
          size: file.size,
          type: file.type,
          url: '#',
        });
      }
    }

    const newClaim = {
      id: claimId,
      reference_code: referenceCode,
      user_id: user.uid,
      user_name: user.name,
      user_email: user.email,
      claim_category_id: cat.id,
      category_name: cat.name,
      claim_date: claimDate,
      amount_paise: amountPaise,
      description: description.trim(),
      missing_bill_explanation: files.length === 0 ? missingBillExplanation.trim() : null,
      has_bills: attachments.length > 0,
      status: 'pending',
      attachments,
      submitted_at: now.toISOString(),
    };

    try {
      await setDoc(doc(db, 'claims', claimId), {
        ...newClaim,
        createdAt: serverTimestamp(),
      });
    } catch {
      // Local fallback
    }

    const all = getStoredClaims();
    all.unshift(newClaim);
    saveStoredClaims(all);

    return newClaim;
  },

  async approveClaim(claimId, adminUser, decisionNote = null) {
    const update = {
      status: 'approved',
      decided_by_id: adminUser.uid,
      decided_by_name: adminUser.name,
      decided_at: new Date().toISOString(),
      decision_note: decisionNote?.trim() || null,
    };

    try {
      await updateDoc(doc(db, 'claims', claimId), update);
    } catch {
      // Fallback
    }

    const list = getStoredClaims();
    const idx = list.findIndex((c) => c.id === claimId);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...update };
      saveStoredClaims(list);
      return list[idx];
    }
    throw new Error('Claim not found.');
  },

  async rejectClaim(claimId, adminUser, rejectionReason) {
    if (!rejectionReason || rejectionReason.trim().length < 3) {
      throw new Error('A rejection reason is required.');
    }

    const now = new Date().toISOString();
    const update = {
      status: 'rejected',
      decided_by_id: adminUser.uid,
      decided_by_name: adminUser.name,
      decided_at: now,
      decision_note: rejectionReason.trim(),
      settled_by_id: adminUser.uid,
      settled_by_name: adminUser.name,
      settled_at: now, // Auto-settled with 0 payout
    };

    try {
      await updateDoc(doc(db, 'claims', claimId), update);
    } catch {
      // Fallback
    }

    const list = getStoredClaims();
    const idx = list.findIndex((c) => c.id === claimId);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...update };
      saveStoredClaims(list);
      return list[idx];
    }
    throw new Error('Claim not found.');
  },

  async settleClaim(claimId, adminUser, settlementNote = null) {
    const update = {
      status: 'settled',
      settled_by_id: adminUser.uid,
      settled_by_name: adminUser.name,
      settled_at: new Date().toISOString(),
      settlement_note: settlementNote?.trim() || null,
    };

    try {
      await updateDoc(doc(db, 'claims', claimId), update);
    } catch {
      // Fallback
    }

    const list = getStoredClaims();
    const idx = list.findIndex((c) => c.id === claimId);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...update };
      saveStoredClaims(list);
      return list[idx];
    }
    throw new Error('Claim not found.');
  },

  async getEmployees({ statusFilter = '', search = '' } = {}) {
    const defaults = [
      {
        uid: 'kyrotics-employee-id',
        name: 'Aarav Patel',
        email: 'employee@kyrotics.com',
        phone: '+91 9123456789',
        role: 'employee',
        approvalStatus: 'approved',
        isActive: true,
        claims_count: 4,
        createdAt: '2026-10-15T10:00:00Z',
      },
    ];

    let allUsers = [];
    try {
      const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'employee')));
      if (!snap.empty) {
        allUsers = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
      }
    } catch {
      // Fallback
    }

    const registered = JSON.parse(localStorage.getItem('kyrotics_registered_users') || '[]');
    const combined = [...defaults, ...registered, ...allUsers];
    const unique = Array.from(new Map(combined.map((u) => [u.email, u])).values());

    let filtered = unique;
    if (statusFilter === 'pending') filtered = filtered.filter((u) => u.approvalStatus === 'pending');
    if (statusFilter === 'approved') filtered = filtered.filter((u) => u.approvalStatus === 'approved' && u.isActive !== false);
    if (statusFilter === 'rejected') filtered = filtered.filter((u) => u.approvalStatus === 'rejected');
    if (statusFilter === 'inactive') filtered = filtered.filter((u) => u.isActive === false);

    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter((u) => u.name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s));
    }

    return filtered;
  },

  async approveEmployee(uid) {
    try {
      await updateDoc(doc(db, 'users', uid), {
        approvalStatus: 'approved',
        isActive: true,
      });
    } catch {}

    const registered = JSON.parse(localStorage.getItem('kyrotics_registered_users') || '[]');
    const idx = registered.findIndex((u) => u.uid === uid);
    if (idx !== -1) {
      registered[idx].approvalStatus = 'approved';
      registered[idx].isActive = true;
      localStorage.setItem('kyrotics_registered_users', JSON.stringify(registered));
    }
  },

  async rejectEmployee(uid) {
    try {
      await updateDoc(doc(db, 'users', uid), {
        approvalStatus: 'rejected',
      });
    } catch {}

    const registered = JSON.parse(localStorage.getItem('kyrotics_registered_users') || '[]');
    const idx = registered.findIndex((u) => u.uid === uid);
    if (idx !== -1) {
      registered[idx].approvalStatus = 'rejected';
      localStorage.setItem('kyrotics_registered_users', JSON.stringify(registered));
    }
  },

  async toggleEmployeeActive(uid, currentState) {
    const newState = !currentState;
    try {
      await updateDoc(doc(db, 'users', uid), {
        isActive: newState,
      });
    } catch {}

    const registered = JSON.parse(localStorage.getItem('kyrotics_registered_users') || '[]');
    const idx = registered.findIndex((u) => u.uid === uid);
    if (idx !== -1) {
      registered[idx].isActive = newState;
      localStorage.setItem('kyrotics_registered_users', JSON.stringify(registered));
    }
  },

  exportClaimsCsv(claims) {
    const headers = [
      'Reference Code',
      'Employee Name',
      'Employee Email',
      'Category',
      'Claim Date',
      'Amount (INR)',
      'Amount (Paise)',
      'Status',
      'Has Bills',
      'Description',
      'Missing Bill Explanation',
      'Decided By',
      'Decided At (IST)',
      'Decision Note / Reason',
      'Settled By',
      'Settled At (IST)',
      'Settlement Note',
      'Submitted At (IST)',
    ];

    const rows = claims.map((c) => [
      csvSafe(c.reference_code),
      csvSafe(c.user_name || ''),
      csvSafe(c.user_email || ''),
      csvSafe(c.category_name || ''),
      csvSafe(c.claim_date || ''),
      csvSafe((c.amount_paise / 100).toFixed(2)),
      String(c.amount_paise),
      csvSafe((c.status || '').toUpperCase()),
      c.has_bills ? 'YES' : 'NO',
      csvSafe(c.description || ''),
      csvSafe(c.missing_bill_explanation || ''),
      csvSafe(c.decided_by_name || ''),
      csvSafe(c.decided_at ? formatIstDate(c.decided_at) : ''),
      csvSafe(c.decision_note || ''),
      csvSafe(c.settled_by_name || ''),
      csvSafe(c.settled_at ? formatIstDate(c.settled_at) : ''),
      csvSafe(c.settlement_note || ''),
      csvSafe(formatIstDate(c.submitted_at)),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `kyrotics_claims_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
};

export async function fetchClaims(status = null, userId = null) {
  return claimService.getClaims({ status: status === 'all' ? null : status, userId });
}

export async function fetchClaimById(id) {
  return claimService.getClaimById(id);
}

export async function submitClaim(claimData, files, user) {
  return claimService.submitClaim({
    user,
    categoryId: claimData.claim_category_id,
    claimDate: claimData.claim_date,
    amountPaise: claimData.amount_paise,
    description: claimData.description,
    missingBillExplanation: claimData.missing_bill_explanation,
    files,
  });
}

export async function approveClaim(claimId, note, adminUser) {
  return claimService.approveClaim(claimId, adminUser, note);
}

export async function rejectClaim(claimId, reason, adminUser) {
  return claimService.rejectClaim(claimId, adminUser, reason);
}

export async function settleClaim(claimId, note, adminUser) {
  return claimService.settleClaim(claimId, adminUser, note);
}

export async function fetchEmployees() {
  const emps = await claimService.getEmployees();
  return emps.map((e) => ({ id: e.uid, ...e }));
}

export async function updateEmployeeStatus(employeeId, status) {
  if (status === 'approved') return claimService.approveEmployee(employeeId);
  if (status === 'rejected') return claimService.rejectEmployee(employeeId);
  if (status === 'deactivated') return claimService.toggleEmployeeActive(employeeId, true);
}

export async function inviteEmployee(employeeData) {
  const newEmp = {
    uid: 'emp-' + Date.now(),
    name: employeeData.name,
    email: employeeData.email,
    phone: employeeData.phone || '',
    role: 'employee',
    approvalStatus: 'approved',
    isActive: true,
    created_at: new Date().toISOString(),
  };
  try {
    await setDoc(doc(db, 'users', newEmp.uid), newEmp);
  } catch {}
  const registered = JSON.parse(localStorage.getItem('kyrotics_registered_users') || '[]');
  registered.push(newEmp);
  localStorage.setItem('kyrotics_registered_users', JSON.stringify(registered));
  return newEmp;
}

export function exportClaimsToCsv(claims, filename) {
  return claimService.exportClaimsCsv(claims);
}

export function calculateStats(claims = []) {
  const stats = {
    total: claims.length,
    pending: 0,
    pendingAmount: 0,
    approved: 0,
    approvedAmount: 0,
    settled: 0,
    settledAmount: 0,
    rejected: 0,
    rejectedAmount: 0,
  };

  claims.forEach((c) => {
    const amt = Number(c.amount_paise) || 0;
    if (c.status === 'pending') {
      stats.pending += 1;
      stats.pendingAmount += amt;
    } else if (c.status === 'approved') {
      stats.approved += 1;
      stats.approvedAmount += amt;
    } else if (c.status === 'settled') {
      stats.settled += 1;
      stats.settledAmount += amt;
    } else if (c.status === 'rejected') {
      stats.rejected += 1;
      stats.rejectedAmount += amt;
    }
  });

  return stats;
}


