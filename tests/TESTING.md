# FiTribe Backend — Complete Testing Guide

## Overview

This testing suite covers **unit tests**, **integration tests**, **coverage reports**, and a full **CI/CD pipeline** via GitHub Actions.

---

## Setup Instructions

### 1. Copy files into your backend
Place everything from this folder into your existing `backend/` directory:

```
backend/
├── tests/
│   ├── setup.js                          ← Global Firebase mock
│   ├── unit/
│   │   ├── middleware/
│   │   │   ├── auth.test.js
│   │   │   └── validation.test.js
│   │   ├── services/
│   │   │   ├── badgeService.test.js
│   │   │   ├── challengeService.test.js
│   │   │   └── progressService.test.js
│   │   └── utils/
│   │       ├── progressUtils.test.js
│   │       ├── challengeUtils.test.js
│   │       └── badgeUtils.test.js
│   └── integration/
│       └── routes/
│           ├── challenge.routes.test.js
│           ├── progress.routes.test.js
│           └── badge.routes.test.js
├── .github/
│   └── workflows/
│       └── ci.yml                        ← GitHub Actions pipeline
└── package.json                          ← Updated with test scripts
```

### 2. Replace your package.json scripts section

Copy the `scripts` and `jest` sections from the provided `package.json` into your existing one. No new dependencies needed — `jest` and `supertest` are already in your devDependencies.

### 3. Run the tests

```bash
# All unit tests
npm run test:unit

# All integration tests
npm run test:integration

# Everything with coverage report
npm run test:coverage

# Watch mode during development
npm run test:watch

# CI mode (used by GitHub Actions)
npm run test:ci
```

---

## What's Being Tested

### Unit Tests (no network, no Firestore)

| File | What it tests |
|------|--------------|
| `auth.test.js` | Token verification, ownership checks, admin guard, optional auth |
| `validation.test.js` | All 7 middleware validators — workout, challenge, pagination, period, idParam, sanitize |
| `badgeService.test.js` | Badge condition checking, progress calculation, awarding logic |
| `challengeService.test.js` | Join/leave validation, active challenge queries |
| `progressService.test.js` | Session recording, calorie calculation, badge/challenge integration |
| `progressUtils.test.js` | Calorie summing, form score averaging |
| `challengeUtils.test.js` | Date logic, status labels, rank changes, progress formatting |
| `badgeUtils.test.js` | Badge validation, stats formatting, next-milestone logic |

### Integration Tests (real HTTP requests via supertest)

| File | What it tests |
|------|--------------|
| `challenge.routes.test.js` | GET /active, GET /:id, POST /join, POST /leave — auth, validation, ownership |
| `progress.routes.test.js` | POST /session, GET /:userId, GET /:userId/stats |
| `badge.routes.test.js` | GET /, GET /:id, GET /user/:userId, GET /user/:userId/progress |

### Coverage Thresholds

The pipeline will **fail** if coverage drops below:
- Branches: 70%
- Functions: 75%
- Lines: 75%
- Statements: 75%

---

## CI/CD Pipeline (GitHub Actions)

The pipeline in `.github/workflows/ci.yml` runs on every push and PR:

```
push/PR → Lint → Unit Tests (+ coverage) → Integration Tests → Full Coverage Report → Security Audit
```

- **Lint**: ESLint + Prettier check
- **Unit Tests**: Fast, isolated, runs in parallel
- **Integration Tests**: Full HTTP request flow with `--runInBand` (sequential)
- **Coverage**: Uploads to Codecov (add `CODECOV_TOKEN` to GitHub Secrets)
- **Security**: `npm audit` checks for high/critical vulnerabilities

### Setting up GitHub Secrets

For Codecov integration, add to your repo's Settings → Secrets:
```
CODECOV_TOKEN = <your token from codecov.io>
```

---

## How Firebase is Mocked

`tests/setup.js` intercepts `firebase-admin` before any test file loads it. This means:
- Tests **never touch real Firestore**
- Tests run in milliseconds (no network)
- You control exactly what Firestore returns per test

Global helpers available in every test:
```javascript
mockDoc(data, id)        // Fake document snapshot
mockCollection(items)    // Fake query snapshot
mockReq(overrides)       // Fake Express request
mockRes()                // Fake Express response with Jest spies
mockNext()               // Fake next() function
```

---

## Common Issues

**"Cannot find module '../../../middleware/auth'"**  
Make sure your test files are in `tests/unit/middleware/` and your `middleware/` folder is at the backend root.

**Integration tests hang**  
Add `--forceExit` to the Jest command (already included in `test:ci`).

**Firebase already initialized error**  
The setup file sets `admin.apps.length = 1` to trick Firebase into thinking it's already initialized.
