/**
 * tests/setup.js
 * Global test setup — mocks Firebase Admin SDK so tests never touch real Firestore
 */

// ==================== MOCK FIREBASE ADMIN ====================
const mockFirestore = {
  collection: jest.fn().mockReturnThis(),
  doc: jest.fn().mockReturnThis(),
  get: jest.fn(),
  add: jest.fn(),
  set: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  runTransaction: jest.fn(),
  batch: jest.fn(() => ({
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    commit: jest.fn().mockResolvedValue(true)
  }))
};

const mockAuth = {
  verifyIdToken: jest.fn(),
  getUser: jest.fn(),
  updateUser: jest.fn(),
  setCustomUserClaims: jest.fn()
};

// In tests/setup.js, find your jest.mock('firebase-admin', ...) and add FieldValue:
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  credential: { cert: jest.fn() },
  firestore: Object.assign(
    jest.fn(() => mockFirestore),
    {
      FieldValue: {
        serverTimestamp: jest.fn(() => new Date().toISOString()),
        arrayUnion: jest.fn(),
        increment: jest.fn((n) => n)
      }
    }
  ),
  auth: jest.fn(() => mockAuth),
  apps: [true]
}));

// Expose mocks globally so individual tests can configure them
global.mockFirestore = mockFirestore;
global.mockAuth = mockAuth;

// ==================== HELPERS ====================

/**
 * Creates a mock Firestore document snapshot
 */
global.mockDoc = (data, id = 'mock-id') => ({
  id,
  exists: !!data,
  data: () => data,
  ref: { id, update: jest.fn(), delete: jest.fn() }
});

/**
 * Creates a mock Firestore query snapshot
 */
global.mockCollection = (items = []) => ({
  empty: items.length === 0,
  size: items.length,
  docs: items.map((item, i) =>
    global.mockDoc(item.data || item, item.id || `mock-id-${i}`)
  ),
  forEach: function (cb) { this.docs.forEach(cb); }
});

/**
 * Creates a mock Express req object
 */
global.mockReq = (overrides = {}) => ({
  params: {},
  query: {},
  body: {},
  headers: {},
  user: { uid: 'test-user-123', email: 'test@example.com', emailVerified: true },
  ...overrides
});

/**
 * Creates a mock Express res object with Jest spies
 */
global.mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res;
};

/**
 * Creates a mock next() function
 */
global.mockNext = () => jest.fn();

// ==================== ENV SETUP ====================
process.env.NODE_ENV = 'test';
process.env.FIREBASE_PROJECT_ID = 'test-project';
process.env.FIREBASE_CLIENT_EMAIL = 'test@test-project.iam.gserviceaccount.com';
process.env.FIREBASE_PRIVATE_KEY = '-----BEGIN RSA PRIVATE KEY-----\nMOCK\n-----END RSA PRIVATE KEY-----';
process.env.PORT = '3001';
process.env.ALLOWED_ORIGINS = 'http://localhost:3001';
