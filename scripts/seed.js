const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Use serviceAccountKey.json if present, otherwise default application credentials or emulator
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

if (fs.existsSync(serviceAccountPath)) {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log('Initialized Firebase Admin with serviceAccountKey.json');
} else {
  // If running against emulator
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || 'localhost:9099';
  admin.initializeApp({
    projectId: 'kyrotics-expense-prod',
  });
  console.log('Initialized Firebase Admin for project: kyrotics-expense-prod (emulator mode)');
}

const db = admin.firestore();
const auth = admin.auth();

const CATEGORIES = [
  { id: 1, name: 'Travel & Transportation', examples: 'Flight, train, bus, cab, taxi' },
  { id: 2, name: 'Food & Meals', examples: 'Business lunch, dinner, refreshments' },
  { id: 3, name: 'Accommodation', examples: 'Hotel, guest house, Airbnb' },
  { id: 4, name: 'Fuel & Mileage', examples: 'Petrol, diesel, vehicle mileage' },
  { id: 5, name: 'Internet & Telephone', examples: 'Mobile recharge, broadband, data plans' },
  { id: 6, name: 'Office Supplies', examples: 'Stationery, printer ink, office materials' },
  { id: 7, name: 'Medical Expenses', examples: 'Doctor consultation, medicines, medical tests' },
  { id: 8, name: 'Learning & Development', examples: 'Courses, certifications, books, workshops' },
  { id: 9, name: 'Equipment & Hardware', examples: 'Laptop accessories, keyboard, mouse, monitor' },
  { id: 10, name: 'Software & Subscriptions', examples: 'Software licences, cloud services, SaaS tools' },
  { id: 11, name: 'Client Entertainment', examples: 'Client meetings, business events' },
  { id: 12, name: 'Relocation', examples: 'Shifting, transportation, temporary accommodation' },
  { id: 13, name: 'Other Expenses', examples: 'Approved miscellaneous business expenses' },
];

async function seed() {
  console.log('--- Starting Kyrotics Seeder ---');

  // 1. Seed Categories
  console.log('Seeding 13 standard categories...');
  for (const cat of CATEGORIES) {
    await db.collection('categories').doc(String(cat.id)).set(cat);
  }
  console.log('Categories seeded.');

  // 2. Seed Admin User
  console.log('Seeding default Admin user...');
  let adminUid = 'kyrotics-admin-id';
  try {
    const existing = await auth.getUserByEmail('admin@kyrotics.com');
    adminUid = existing.uid;
    console.log('Admin user already exists in Auth.');
  } catch {
    try {
      const created = await auth.createUser({
        uid: adminUid,
        email: 'admin@kyrotics.com',
        password: 'Password123!',
        displayName: 'Kyrotics Finance Admin',
      });
      adminUid = created.uid;
      console.log('Created Admin user in Auth.');
    } catch (e) {
      console.warn('Auth user creation warning:', e.message);
    }
  }

  await db.collection('users').doc(adminUid).set({
    name: 'Kyrotics Finance Admin',
    email: 'admin@kyrotics.com',
    role: 'admin',
    approvalStatus: 'approved',
    isActive: true,
    created_at: new Date().toISOString(),
  });

  // 3. Seed Employee User
  console.log('Seeding default Employee user...');
  let employeeUid = 'kyrotics-employee-id';
  try {
    const existing = await auth.getUserByEmail('employee@kyrotics.com');
    employeeUid = existing.uid;
    console.log('Employee user already exists in Auth.');
  } catch {
    try {
      const created = await auth.createUser({
        uid: employeeUid,
        email: 'employee@kyrotics.com',
        password: 'Password123!',
        displayName: 'Aarav Patel',
        phoneNumber: '+919876543210',
      });
      employeeUid = created.uid;
      console.log('Created Employee user in Auth.');
    } catch (e) {
      console.warn('Auth user creation warning:', e.message);
    }
  }

  await db.collection('users').doc(employeeUid).set({
    name: 'Aarav Patel',
    email: 'employee@kyrotics.com',
    phone: '+91 98765 43210',
    role: 'employee',
    approvalStatus: 'approved',
    isActive: true,
    created_at: new Date().toISOString(),
  });

  // 4. Seed Sample Claims
  console.log('Seeding initial claims...');
  const sampleClaims = [
    {
      id: 'kyr-claim-001',
      reference_code: 'KYR-202611-000001',
      user_id: employeeUid,
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
      user_id: employeeUid,
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
      user_id: employeeUid,
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
      user_id: employeeUid,
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
      settled_at: '2026-10-25T11:00:00Z',
      settlement_note: 'Auto-closed with 0 reimbursement due to rejection.',
      attachments: [],
      submitted_at: '2026-10-24T20:00:00Z',
    },
  ];

  for (const claim of sampleClaims) {
    await db.collection('claims').doc(claim.id).set(claim);
  }
  console.log('Sample claims seeded.');

  // 5. Seed Counter
  await db.collection('counters').doc('claims-202611').set({ count: 4 });

  console.log('--- Kyrotics Seeder Completed Successfully ---');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeder failed:', err);
  process.exit(1);
});

