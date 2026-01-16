# LifeTracker MVP — Development Plan

## Overview

This document outlines the phased development plan for the LifeTracker MVP (Minimum Viable Product). Building on the completed PoC, the MVP delivers a production-ready Tasks module with full features.

**Starting Point**: Working PoC with basic task CRUD, voice input, and simple LLM parsing.

**End State**: Full-featured Tasks module with JWT authentication, tags, lists management, responsive design, and macOS integration.

---

## Table of Contents

| Phase | Description | Status |
|-------|-------------|--------|
| [Phase 1](#phase-1-database-schema-extension) | Database Schema Extension | Complete |
| [Pre-Phase 2](#pre-phase-2-fix-typescript-errors) | Fix TypeScript Errors | Complete |
| [Phase 2](#phase-2-cicd-pipeline) | CI/CD Pipeline | Complete |
| [Phase 3](#phase-3-authentication-system) | Authentication System (JWT + API Key) | Pending |
| [Phase 4](#phase-4-list-management) | List Management (Full CRUD) | Pending |
| [Phase 5](#phase-5-tags-system) | Tags System | Pending |
| [Phase 6](#phase-6-enhanced-task-features) | Enhanced Task Features | Pending |
| [Phase 7](#phase-7-full-llm-parsing) | Full LLM Parsing | Pending |
| [Phase 8](#phase-8-responsive-ui) | Responsive UI | Pending |
| [Phase 9](#phase-9-macos-shortcut-integration) | macOS Shortcut Integration | Pending |
| [Phase 10](#phase-10-integration-testing--polish) | Integration Testing & Polish | Pending |
| [Phase 11](#phase-11-deployment-automation) | Deployment Automation | Pending |

**Other Sections:**
- [MVP Scope Summary](#mvp-scope-summary)
- [Prerequisites](#prerequisites)
- [Testing Requirements](#testing-requirements-all-phases)
- [Definition of Done](#definition-of-done)
- [Summary Timeline](#summary-timeline)
- [Deferred to Post-MVP](#deferred-to-post-mvp)

---

## MVP Scope Summary

| Feature | Included | Deferred |
|---------|----------|----------|
| Full task schema (priority, due dates, notes) | ✓ | |
| Tags (freeform labels) | ✓ | |
| List CRUD (create, rename, delete) | ✓ | |
| List auto-creation from voice | ✓ | |
| JWT authentication (web) | ✓ | |
| API key auth (shortcuts) | ✓ | |
| Full LLM parsing (all fields) | ✓ | |
| Responsive design (mobile-first) | ✓ | |
| macOS Shortcut integration | ✓ | |
| Recurring tasks | | ✓ (Post-MVP) |
| "Teach the System" correction UI | | ✓ (Post-MVP) |
| Offline queue (IndexedDB) | | ✓ (Post-MVP) |
| Multi-item NLP parsing | | ✓ (Post-MVP) |

---

## Prerequisites

Before starting MVP development:

- [x] PoC complete and working (Phases 1-7)
- [x] PostgreSQL running with existing schema
- [x] Ollama with gpt-oss-20b model available
- [x] iOS Shortcut working for voice input
- [ ] Development environment ready (`bun install`, services running)

---

## Testing Requirements (All Phases)

**Important:** Phase 2 establishes the CI/CD pipeline. All subsequent phases must add automated tests that run in CI. Manual testing is only for exploratory testing and real-device verification—all repeatable tests must be automated.

Each phase must meet these testing standards before being marked complete:

### Unit Tests
- **Location:** Co-located with source as `*.test.ts` or `*.spec.ts`
- **Coverage Target:** ≥ 80% for new business logic and utilities
- **Framework:** Vitest (configured in Phase 2)
- **Required for:**
  - Utility functions (date parsing, name normalization, etc.)
  - Service layer methods
  - Zod validation schemas
  - React hooks with complex logic

### Integration Tests
- **Location:** `packages/api/src/__tests__/` or co-located
- **Framework:** Vitest with test database (configured in Phase 2)
- **Required for:**
  - All new API endpoints
  - Database operations (Prisma queries)
  - Authentication flows (JWT and API key)

### E2E Tests
- **Location:** `packages/web/src/__tests__/e2e/`
- **Framework:** Playwright (configured in Phase 2)
- **Required for:**
  - Critical user flows (login, task CRUD, voice input)
  - Cross-browser compatibility
  - Mobile responsiveness (Phase 8)

### CI Pipeline Integration
After completing each phase:
1. All new tests must pass in CI: `bun test`
2. Code coverage must not decrease
3. All existing tests must continue to pass
4. PR cannot be merged if any CI check fails

### Test Naming Convention
```typescript
describe('ComponentOrFunction', () => {
  it('should return error when input is empty', () => { });
  it('should normalize list name to lowercase', () => { });
});
```

### What Requires Manual Testing
Only these scenarios require manual verification:
- Real device testing (actual iPhone, Android, macOS)
- Voice input quality (dictation accuracy)
- Visual appearance on different screen sizes
- Performance feel (subjective smoothness)

---

## Phase 1: Database Schema Extension

### Goal
Extend the database schema to support all MVP features: tags, user authentication, and any missing task fields.

### Deliverable
Updated Prisma schema with migrations applied, ready for new features.

### Sub-Phase 1A: Schema Design

| # | Task | Parallel Group | Status |
|---|------|----------------|--------|
| 1A.1 | Add User model (id, username, passwordHash, createdAt) | A | Complete |
| 1A.2 | Add RefreshToken model (id, token, userId, expiresAt, createdAt) | A | Complete |
| 1A.3 | Add Tag model (id, name, createdAt) | A | Complete |
| 1A.4 | Add TaskTag join table (taskId, tagId) | A | Complete |
| 1A.5 | Update Task model (ensure all fields from spec are present) | A | Complete |

### Sub-Phase 1B: Migration & Seed

| # | Task | Status |
|---|------|--------|
| 1B.1 | Apply schema changes via `db:push` (dev workflow) | Complete |
| 1B.2 | Update seed script (create default admin user: admin/admin123) | Complete |
| 1B.3 | Verify tables via database query | Complete |

### Data Model Additions

```prisma
model User {
  id           String         @id @default(uuid())
  username     String         @unique
  passwordHash String         @map("password_hash")
  createdAt    DateTime       @default(now()) @map("created_at")
  updatedAt    DateTime       @updatedAt @map("updated_at")

  refreshTokens RefreshToken[]

  @@map("users")
}

model RefreshToken {
  id        String   @id @default(uuid())
  token     String   @unique
  userId    String   @map("user_id")
  expiresAt DateTime @map("expires_at")
  createdAt DateTime @default(now()) @map("created_at")

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("refresh_tokens")
}

model Tag {
  id        String    @id @default(uuid())
  name      String    @unique
  createdAt DateTime  @default(now()) @map("created_at")

  tasks     TaskTag[]

  @@map("tags")
}

model TaskTag {
  taskId String @map("task_id")
  tagId  String @map("tag_id")

  task   Task   @relation(fields: [taskId], references: [id], onDelete: Cascade)
  tag    Tag    @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([taskId, tagId])
  @@map("task_tags")
}
```

### Test Plan

| Test | Command | Expected Result |
|------|---------|-----------------|
| Generate migration | `bun run db:migrate` | Migration created successfully |
| Apply migration | `bun run db:push` | Tables created in database |
| Verify User table | Prisma Studio | User table visible with correct columns |
| Verify Tag tables | Prisma Studio | Tag and TaskTag tables visible |
| Seed admin user | `bun run db:seed` | Admin user created (username: admin, password: admin123 - dev only) |

### Migration Rollback Strategy

If migration fails or needs reverting:
```bash
# View migration history
bunx prisma migrate status

# Revert to previous state (development only)
bunx prisma migrate reset --skip-seed

# For production, create a new down migration manually
```

**Note:** Always backup database before running migrations in production.

### Edge Cases

| Scenario | Handling |
|----------|----------|
| Migration conflicts with existing data | Prisma handles gracefully; existing tasks preserved |
| Duplicate tag names | Unique constraint prevents duplicates |
| Orphaned TaskTag records | Cascade delete cleans up when task/tag deleted |

### Done Criteria

- [x] All tasks in Sub-Phase 1A and 1B marked complete
- [x] Schema applied without errors: `bun run db:push` (dev workflow)
- [x] All new tables visible in database with correct columns (verified via psql)
- [x] User table: id, username, password_hash, created_at, updated_at
- [x] RefreshToken table: id, token, user_id, expires_at, created_at with FK to users
- [x] Tag table: id, name (unique), created_at
- [x] TaskTag table: task_id, tag_id composite PK with FKs to tasks and tags
- [x] Seed script creates admin user without error
- [x] Existing tasks preserved after schema update
- [x] `bun run db:generate` succeeds and types are available
- [x] All existing API endpoints still function (regression check - all 9 endpoints tested)
- [x] Code passes type-check: `bunx tsc --noEmit` (after Pre-Phase 2 fix)

---

## Pre-Phase 2: Fix TypeScript Errors

### Goal
Fix pre-existing TypeScript errors in the API package before establishing CI/CD pipeline.

### Background
During Phase 1 verification, type-checking revealed errors in `packages/api/src/services/llm.ts` that predate MVP development. These must be fixed before Phase 2 establishes CI with mandatory type-check passing.

### Task List

| # | Task | Status |
|---|------|--------|
| P2.1 | Fix type errors in `packages/api/src/services/llm.ts` (lines 38, 146) | Complete |
| P2.2 | Verify `bunx tsc --noEmit` passes for all packages | Complete |

### Errors to Fix

```
src/services/llm.ts(38,11): error TS2322: Type 'unknown' is not assignable to type 'OllamaResponse'.
src/services/llm.ts(146,22): error TS18046: 'data' is of type 'unknown'.
```

### Done Criteria

- [x] `bunx tsc --noEmit` passes in packages/api
- [x] `bunx tsc --noEmit` passes in packages/core
- [x] `bunx tsc --noEmit` passes in packages/web
- [x] No regression in existing functionality

---

## Phase 2: CI/CD Pipeline

### Goal
Establish automated testing, linting, and deployment pipeline using GitHub Actions. All subsequent phases will add to this test suite, ensuring continuous quality validation.

### Deliverable
Complete CI/CD pipeline that runs on every PR and push, with automated deployment capability.

### Sub-Phase 2A: GitHub Actions Setup

| # | Task | Parallel Group | Status |
|---|------|----------------|--------|
| 2A.1 | Create `.github/workflows/ci.yml` for PR checks | A | Pending |
| 2A.2 | Create `.github/workflows/deploy.yml` for deployment | A | Pending |
| 2A.3 | Configure branch protection rules for `main` | B | Pending |
| 2A.4 | Set up GitHub repository secrets (DATABASE_URL, API_KEY, etc.) | B | Pending |

### Sub-Phase 2B: Linting & Type Checking

| # | Task | Parallel Group | Status |
|---|------|----------------|--------|
| 2B.1 | Configure Biome for linting and formatting | A | Pending |
| 2B.2 | Add `bun run lint` script to root package.json | A | Pending |
| 2B.3 | Add `bun run typecheck` script for tsc --noEmit | A | Pending |
| 2B.4 | Create pre-commit hook for lint-staged | B | Pending |
| 2B.5 | Add CI job for lint and typecheck | B | Pending |

### Sub-Phase 2C: Test Infrastructure

| # | Task | Parallel Group | Status |
|---|------|----------------|--------|
| 2C.1 | Configure Vitest for unit/integration tests | A | Pending |
| 2C.2 | Set up test database (Docker service in CI) | A | Pending |
| 2C.3 | Create test utilities (database reset, factories) | A | Pending |
| 2C.4 | Add code coverage reporting (Vitest + Codecov/Coveralls) | B | Pending |
| 2C.5 | Configure Playwright for E2E tests | B | Pending |
| 2C.6 | Create E2E test database seeding script | B | Pending |

### Sub-Phase 2D: Deployment Pipeline

| # | Task | Parallel Group | Status |
|---|------|----------------|--------|
| 2D.1 | Create Docker build job in CI | A | Pending |
| 2D.2 | Configure staging environment (optional) | A | Pending |
| 2D.3 | Create production deployment workflow (manual trigger) | B | Pending |
| 2D.4 | Add deployment health check verification | B | Pending |
| 2D.5 | Configure rollback procedure documentation | C | Pending |

### CI Workflow Structure

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run lint
      - run: bun run typecheck

  test-unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run test:unit
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  test-integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: lifetracker_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bunx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/lifetracker_test
      - run: bun run test:integration
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/lifetracker_test

  test-e2e:
    runs-on: ubuntu-latest
    needs: [lint, test-unit, test-integration]
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bunx playwright install --with-deps
      - run: bun run test:e2e

  build:
    runs-on: ubuntu-latest
    needs: [test-e2e]
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - run: docker compose build
```

### Deployment Workflow Structure

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deployment environment'
        required: true
        default: 'production'
        type: choice
        options:
          - production

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to server
        run: |
          # SSH to server and pull latest, rebuild containers
          ssh ${{ secrets.DEPLOY_HOST }} "cd /opt/lifetracker && git pull && docker compose up -d --build"
      - name: Verify deployment
        run: |
          sleep 10
          curl -f https://lifetracker.maverickapplications.com/health
```

### Test Scripts (package.json)

```json
{
  "scripts": {
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "typecheck": "tsc --noEmit",
    "test": "bun run test:unit && bun run test:integration",
    "test:unit": "vitest run --coverage",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:e2e": "playwright test",
    "test:watch": "vitest"
  }
}
```

### Test Organization

```
packages/
├── core/
│   └── src/
│       ├── utils/
│       │   ├── normalize.ts
│       │   └── normalize.test.ts      # Unit test (co-located)
│       └── __tests__/
│           └── prisma.integration.ts  # Integration tests
├── api/
│   └── src/
│       ├── routes/
│       │   ├── tasks.ts
│       │   └── tasks.test.ts          # Route unit tests
│       └── __tests__/
│           └── tasks.integration.ts   # API integration tests
└── web/
    └── src/
        ├── components/
        │   ├── TaskList.tsx
        │   └── TaskList.test.tsx      # Component tests
        └── __tests__/
            └── e2e/                   # Playwright tests
                ├── auth.spec.ts
                └── tasks.spec.ts
```

### Branch Protection Rules

Configure on GitHub:
- Require PR reviews before merging
- Require status checks to pass:
  - `lint`
  - `test-unit`
  - `test-integration`
  - `test-e2e`
  - `build`
- Require branches to be up to date before merging
- Do not allow bypassing the above settings

### Test Plan

| Test | Action | Expected Result |
|------|--------|-----------------|
| PR lint check | Create PR with lint error | CI fails, PR blocked |
| PR type check | Create PR with type error | CI fails, PR blocked |
| Unit tests | Run `bun run test:unit` | All tests pass, coverage reported |
| Integration tests | Run `bun run test:integration` | Tests run against test DB |
| E2E tests | Run `bun run test:e2e` | Browser tests pass |
| Build check | Push to main | Docker images built successfully |
| Deploy | Trigger manual deploy | App deployed, health check passes |

### Done Criteria

- [x] All tasks in Sub-Phases 2A, 2B, 2C, and 2D marked complete
- [x] `.github/workflows/ci.yml` exists and runs on PR
- [x] `.github/workflows/deploy.yml` exists with manual trigger
- [x] `bun run lint` checks all packages
- [x] `bun run typecheck` validates all TypeScript
- [x] `bun run test:unit` runs unit tests with coverage
- [x] `bun run test:integration` runs against test database
- [x] `bun run test:e2e` runs Playwright tests
- [x] Vitest configured with coverage thresholds (≥80%)
- [ ] ~~Codecov or Coveralls integration shows coverage on PRs~~ (Deferred to Phase 11)
- [x] Playwright installed and configured for E2E
- [x] Test database spins up in CI via Docker service
- [ ] ~~Branch protection enabled on `main`~~ (Deferred to Phase 11)
- [ ] ~~All required status checks configured~~ (Deferred to Phase 11)
- [ ] ~~Manual deployment workflow deploys successfully~~ (Deferred to Phase 11)
- [ ] ~~Health check verification passes after deployment~~ (Deferred to Phase 11)
- [x] Rollback procedure documented
- [x] All existing PoC tests pass in CI
- [x] PR with intentional lint error is blocked by CI (verified via CI)

---

## Phase 3: Authentication System

### Goal
Implement JWT-based authentication for the web app while maintaining API key auth for shortcuts.

### Deliverable
Working login/logout with JWT access tokens (15min) and refresh tokens (7 days), with API key auth preserved for iOS/macOS Shortcuts.

### Dual Authentication Strategy

The system supports **two authentication methods** that coexist:

| Method | Use Case | How It Works |
|--------|----------|--------------|
| **API Key** | iOS/macOS Shortcuts | `X-API-Key` header, stateless, no expiry management |
| **JWT** | Web App | httpOnly cookies, access/refresh token rotation |

**Why both?**
- Shortcuts cannot manage JWT refresh flows (no browser, no cookies)
- Web apps need secure, rotating credentials with CSRF protection
- API key remains simple and reliable for voice input

**Auth Middleware Logic:**
```typescript
// Middleware checks in order:
// 1. If X-API-Key header present → validate API key
// 2. Else if Authorization cookie present → validate JWT
// 3. Else → 401 Unauthorized

const authenticate = async (req, reply) => {
  const apiKey = req.headers['x-api-key'];

  if (apiKey) {
    // API Key auth (for shortcuts)
    if (apiKey !== process.env.API_KEY) {
      return reply.status(401).send({ error: 'Invalid API key' });
    }
    req.authMethod = 'api-key';
    return; // Authenticated via API key
  }

  // JWT auth (for web app)
  const token = req.cookies.access_token;
  if (!token) {
    return reply.status(401).send({ error: 'Authentication required' });
  }

  try {
    const payload = await verifyJWT(token);
    req.user = payload;
    req.authMethod = 'jwt';
  } catch (err) {
    return reply.status(401).send({ error: 'Invalid or expired token' });
  }
};
```

**Security Considerations:**
- API key should be long, random, and rotatable
- Consider separate API keys per device/shortcut in future
- Rate limiting applies to both auth methods
- Audit logging should distinguish auth method used

### Sub-Phase 3A: Backend Auth

| # | Task | Parallel Group | Status |
|---|------|----------------|--------|
| 3A.1 | Install bcrypt and jose dependencies | A | Pending |
| 3A.2 | Create password hashing utilities | A | Pending |
| 3A.3 | Create JWT utilities (sign, verify, refresh) | A | Pending |
| 3A.4 | Create auth service (login, logout, refresh) | B | Pending |
| 3A.5 | Create auth routes (POST /auth/login, POST /auth/logout, POST /auth/refresh) | B | Pending |
| 3A.6 | Update auth middleware to support both JWT and API key | C | Pending |
| 3A.7 | Add rate limiting for login attempts (5 attempts → 15min lockout) | C | Pending |

### Sub-Phase 3B: Cookie Configuration

| # | Task | Status |
|---|------|--------|
| 3B.1 | Configure httpOnly, Secure, SameSite=Strict cookies | Pending |
| 3B.2 | Set up access token cookie (15min expiry) | Pending |
| 3B.3 | Set up refresh token cookie (7 day expiry) | Pending |
| 3B.4 | Implement automatic token refresh logic | Pending |

### Sub-Phase 3C: Frontend Auth

| # | Task | Parallel Group | Status |
|---|------|----------------|--------|
| 3C.1 | Create login page component | A | Pending |
| 3C.2 | Create auth context/store (Zustand) | A | Pending |
| 3C.3 | Update API client for cookie-based auth | B | Pending |
| 3C.4 | Add automatic token refresh interceptor | B | Pending |
| 3C.5 | Add protected route wrapper | C | Pending |
| 3C.6 | Add logout functionality | C | Pending |

### Implementation Details

```typescript
// JWT Configuration
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

// Cookie Configuration
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
};
```

### API Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/login` | Login with username/password | No |
| POST | `/auth/logout` | Clear tokens, invalidate refresh token | Yes (any) |
| POST | `/auth/refresh` | Get new access token using refresh token | No (uses cookie) |
| GET | `/auth/me` | Get current user info | Yes |

### Test Plan

| Test | Action | Expected Result |
|------|--------|-----------------|
| Login success | POST valid credentials | Access + refresh tokens set as cookies |
| Login failure | POST wrong password | 401 Unauthorized, no cookies set |
| Rate limiting | 5 failed attempts | 429 Too Many Requests for 15 minutes |
| Access token expired | Wait 15+ min, make request | Auto-refresh occurs, request succeeds |
| Refresh token expired | Wait 7+ days | Redirected to login |
| Logout | POST /auth/logout | Cookies cleared, refresh token invalidated |
| API key still works | Request with X-API-Key header | Request succeeds (for shortcuts) |

### Edge Cases

| Scenario | Handling |
|----------|----------|
| Concurrent refresh requests | Only first succeeds, others get new token from first |
| Refresh token reuse after rotation | Invalidate all tokens for user (security) |
| Missing cookies | Return 401, redirect to login |
| Invalid JWT signature | Return 401, redirect to login |

### Environment Variables Required

Add to `.env` and `.env.example`:
```bash
JWT_SECRET=<random-32-char-string>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
BCRYPT_ROUNDS=12
```

### Done Criteria

- [ ] All tasks in Sub-Phases 3A, 3B, and 3C marked complete
- [ ] New environment variables documented in `.env.example`
- [ ] POST `/auth/login` returns tokens on valid credentials
- [ ] POST `/auth/login` returns 401 on invalid credentials
- [ ] Rate limiting blocks after 5 failed attempts (verify with test)
- [ ] Access token expires after 15 minutes (verify by waiting or mocking time)
- [ ] Refresh token auto-refresh works when access token expires
- [ ] POST `/auth/logout` clears cookies and invalidates refresh token
- [ ] GET `/auth/me` returns current user info
- [ ] API key authentication still works for all endpoints (regression test)
- [ ] iOS Shortcut voice input still creates tasks with API key auth
- [ ] Auth middleware correctly prioritizes API key over JWT when both present
- [ ] Web app shows login page when not authenticated
- [ ] Web app redirects to main page after successful login
- [ ] Protected routes redirect unauthenticated users to login
- [ ] Cookies have httpOnly, Secure (in prod), and SameSite=Strict flags
- [ ] Unit tests for password hashing utilities pass
- [ ] Unit tests for JWT utilities pass
- [ ] Integration tests for auth routes pass
- [ ] All existing API endpoints still function with API key auth (regression check)
- [ ] Code passes type-check and lint

---

## Phase 4: List Management

### Goal
Implement full CRUD operations for lists with proper validation and auto-creation.

### Deliverable
Complete list management UI and API including create, rename, delete, and reorder.

### Sub-Phase 4A: API Endpoints

| # | Task | Parallel Group | Status |
|---|------|----------------|--------|
| 4A.1 | Create list validation schemas (Zod) | A | Pending |
| 4A.2 | Implement POST /api/lists (create list) | B | Pending |
| 4A.3 | Implement PATCH /api/lists/:id (rename list) | B | Pending |
| 4A.4 | Implement DELETE /api/lists/:id (delete list) | B | Pending |
| 4A.5 | Implement PATCH /api/lists/reorder (reorder lists) | B | Pending |
| 4A.6 | Add list name normalization (lowercase, trim) | A | Pending |
| 4A.7 | Prevent Inbox deletion/rename | C | Pending |

### Sub-Phase 4B: List Utilities

| # | Task | Status |
|---|------|--------|
| 4B.1 | Create normalizeListName utility | Pending |
| 4B.2 | Create displayListName utility (Title Case) | Pending |
| 4B.3 | Create slugifyListName utility | Pending |
| 4B.4 | Create findOrCreateList helper for voice input | Pending |

### Sub-Phase 4C: Frontend Components

| # | Task | Parallel Group | Status |
|---|------|----------------|--------|
| 4C.1 | Create ListSidebar component | A | Pending |
| 4C.2 | Create CreateListModal component | A | Pending |
| 4C.3 | Create RenameListModal component | A | Pending |
| 4C.4 | Create DeleteListConfirmation component | A | Pending |
| 4C.5 | Add list selection state to app | B | Pending |
| 4C.6 | Filter tasks by selected list | B | Pending |

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/lists` | Get all lists with task counts |
| GET | `/api/lists/:id` | Get list with tasks |
| POST | `/api/lists` | Create new list |
| PATCH | `/api/lists/:id` | Update list (rename) |
| DELETE | `/api/lists/:id` | Delete list (moves tasks to Inbox) |
| PATCH | `/api/lists/reorder` | Reorder lists |

### Validation Rules

```typescript
const createListSchema = z.object({
  name: z.string()
    .min(1, 'List name is required')
    .max(100, 'List name too long')
    .transform(normalizeListName),
});

const updateListSchema = z.object({
  name: z.string()
    .min(1)
    .max(100)
    .transform(normalizeListName)
    .optional(),
  position: z.number().int().min(0).optional(),
});
```

### Test Plan

| Test | Action | Expected Result |
|------|--------|-----------------|
| Create list | POST /api/lists { name: "Groceries" } | List created, stored as "groceries" |
| Duplicate name | Create "groceries" when exists | 400 error: List already exists |
| Rename list | PATCH /api/lists/:id { name: "Shopping" } | List renamed |
| Rename Inbox | Try to rename Inbox | 400 error: Cannot modify system list |
| Delete list | DELETE /api/lists/:id | List deleted, tasks moved to Inbox |
| Delete Inbox | Try to delete Inbox | 400 error: Cannot delete system list |
| Delete list with tasks | Delete list containing 5 tasks | Tasks moved to Inbox, then list deleted |
| Case insensitive | Create "Errands" when "errands" exists | 400 error: List already exists |

### Edge Cases

| Scenario | Handling |
|----------|----------|
| Empty list name | Validation error |
| Whitespace-only name | Validation error (after trim) |
| Very long name | Truncate or error at 100 chars |
| Special characters | Allow but normalize |
| Delete last user list | Allowed; user still has Inbox |

### Done Criteria

- [ ] All tasks in Sub-Phases 4A, 4B, and 4C marked complete
- [ ] POST `/api/lists` creates list with normalized name
- [ ] GET `/api/lists` returns all lists with task counts
- [ ] PATCH `/api/lists/:id` renames list successfully
- [ ] DELETE `/api/lists/:id` deletes list and moves tasks to Inbox
- [ ] Inbox cannot be renamed (returns 400)
- [ ] Inbox cannot be deleted (returns 400)
- [ ] Duplicate list name returns 400 error
- [ ] Case-insensitive duplicate detection works ("Errands" blocked when "errands" exists)
- [ ] `normalizeListName` utility: lowercases and trims input
- [ ] `displayListName` utility: returns Title Case
- [ ] `findOrCreateList` helper: finds existing or creates new list
- [ ] ListSidebar component displays all lists
- [ ] Clicking a list filters tasks to that list
- [ ] CreateListModal creates new lists
- [ ] RenameListModal renames existing lists
- [ ] DeleteListConfirmation shows warning and deletes on confirm
- [ ] Unit tests for list name utilities pass
- [ ] Integration tests for list routes pass
- [ ] All previous phase functionality still works (regression check)
- [ ] Code passes type-check and lint

---

## Phase 5: Tags System

### Goal
Implement freeform tags for cross-list task organization and filtering.

### Deliverable
Complete tag system with CRUD, task association, and filter UI.

### Sub-Phase 5A: API Endpoints

| # | Task | Parallel Group | Status |
|---|------|----------------|--------|
| 5A.1 | Create tag validation schemas | A | Pending |
| 5A.2 | Implement GET /api/tags (list all tags with usage count) | B | Pending |
| 5A.3 | Implement POST /api/tags (create tag) | B | Pending |
| 5A.4 | Implement DELETE /api/tags/:id (delete tag) | B | Pending |
| 5A.5 | Implement POST /api/tasks/:id/tags (add tag to task) | C | Pending |
| 5A.6 | Implement DELETE /api/tasks/:id/tags/:tagId (remove tag) | C | Pending |
| 5A.7 | Update task endpoints to include tags in response | C | Pending |

### Sub-Phase 5B: Frontend Components

| # | Task | Parallel Group | Status |
|---|------|----------------|--------|
| 5B.1 | Create TagBadge component | A | Pending |
| 5B.2 | Create TagInput component (autocomplete) | A | Pending |
| 5B.3 | Create TagFilter component (sidebar/header) | A | Pending |
| 5B.4 | Update TaskList to show tags | B | Pending |
| 5B.5 | Update AddTaskForm to support tags | B | Pending |
| 5B.6 | Add tag filtering to task views | C | Pending |

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tags` | Get all tags with usage counts |
| POST | `/api/tags` | Create new tag |
| DELETE | `/api/tags/:id` | Delete tag (removes from all tasks) |
| POST | `/api/tasks/:id/tags` | Add tag(s) to task |
| DELETE | `/api/tasks/:id/tags/:tagId` | Remove tag from task |
| GET | `/api/tasks?tags=tag1,tag2` | Filter tasks by tags |

### Test Plan

| Test | Action | Expected Result |
|------|--------|-----------------|
| Create tag | POST /api/tags { name: "urgent" } | Tag created |
| Duplicate tag | Create "urgent" when exists | 400 error or return existing |
| Add tag to task | POST /api/tasks/:id/tags { tagId: "..." } | Tag associated |
| Remove tag from task | DELETE /api/tasks/:id/tags/:tagId | Association removed |
| Delete tag | DELETE /api/tags/:id | Tag removed from all tasks |
| Filter by tag | GET /api/tasks?tags=urgent | Only tasks with "urgent" tag |
| Filter by multiple tags | GET /api/tasks?tags=urgent,home | Tasks with any of the tags |

### Edge Cases

| Scenario | Handling |
|----------|----------|
| Tag with no tasks | Still visible in tag list |
| Add same tag twice | Idempotent (no error, no duplicate) |
| Case sensitivity | Normalize to lowercase like lists |
| Empty tag name | Validation error |

### Done Criteria

- [ ] All tasks in Sub-Phases 5A and 5B marked complete
- [ ] GET `/api/tags` returns all tags with usage counts
- [ ] POST `/api/tags` creates tag with normalized name
- [ ] DELETE `/api/tags/:id` removes tag from all tasks and deletes it
- [ ] POST `/api/tasks/:id/tags` adds tag(s) to task
- [ ] DELETE `/api/tasks/:id/tags/:tagId` removes tag from task
- [ ] GET `/api/tasks?tags=urgent,home` filters by tags correctly
- [ ] Adding same tag twice is idempotent (no error, no duplicate)
- [ ] Tags normalized to lowercase
- [ ] Empty tag name returns validation error
- [ ] TagBadge component displays individual tags
- [ ] TagInput component provides autocomplete from existing tags
- [ ] TagFilter component allows filtering by tag selection
- [ ] TaskList displays tags on each task item
- [ ] AddTaskForm allows adding tags during task creation
- [ ] Tag filtering works in combination with list filtering
- [ ] Integration tests for tag routes pass
- [ ] All previous phase functionality still works (regression check)
- [ ] Code passes type-check and lint

---

## Phase 6: Enhanced Task Features

### Goal
Extend task functionality with proper priority handling, due dates, notes, and improved completion behavior.

### Deliverable
Full task editing capabilities matching the specification.

### Sub-Phase 6A: API Updates

| # | Task | Parallel Group | Status |
|---|------|----------------|--------|
| 6A.1 | Update task validation for all fields | A | Pending |
| 6A.2 | Add priority enum handling | A | Pending |
| 6A.3 | Add due date handling with proper date parsing | A | Pending |
| 6A.4 | Add notes field support | A | Pending |
| 6A.5 | Implement completion behavior (completedAt timestamp) | B | Pending |
| 6A.6 | Add task filtering (by due date, priority, completion) | B | Pending |
| 6A.7 | Add task sorting options | B | Pending |

### Sub-Phase 6B: Frontend Components

| # | Task | Parallel Group | Status |
|---|------|----------------|--------|
| 6B.1 | Create TaskDetailModal component | A | Pending |
| 6B.2 | Create PrioritySelector component | A | Pending |
| 6B.3 | Create DueDatePicker component | A | Pending |
| 6B.4 | Create NotesEditor component | A | Pending |
| 6B.5 | Update TaskList item to show priority/due date | B | Pending |
| 6B.6 | Add completed tasks section with auto-hide logic | B | Pending |
| 6B.7 | Add sort controls to task list | C | Pending |
| 6B.8 | Add filter controls (due today, overdue, high priority) | C | Pending |

### Completion Visibility Logic

```typescript
// Task visibility rules
const isTaskVisible = (task: Task, showCompleted: boolean) => {
  // Incomplete tasks always visible
  if (!task.completed) return true;

  // Completed toggle off: hide all completed
  if (!showCompleted) return false;

  // Show tasks completed today
  const today = new Date().toDateString();
  const completedDay = task.completedAt?.toDateString();
  return completedDay === today;
};
```

### API Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `list` | UUID | Filter by list ID |
| `priority` | HIGH\|MEDIUM\|LOW | Filter by priority |
| `dueDate` | today\|week\|overdue | Filter by due date |
| `completed` | boolean | Include completed tasks |
| `tags` | string (comma-separated) | Filter by tags |
| `sort` | created\|due\|priority | Sort order |
| `order` | asc\|desc | Sort direction |

### Test Plan

| Test | Action | Expected Result |
|------|--------|-----------------|
| Set priority | PATCH { priority: "HIGH" } | Task priority updated |
| Set due date | PATCH { dueDate: "2025-01-20" } | Task due date set |
| Add notes | PATCH { notes: "Call between 9-5" } | Notes saved |
| Complete task | POST /tasks/:id/complete | completed=true, completedAt set |
| Uncomplete task | Toggle on completed task | completed=false, completedAt null |
| Filter due today | GET /tasks?dueDate=today | Only today's tasks |
| Filter overdue | GET /tasks?dueDate=overdue | Only past-due incomplete tasks |
| Sort by priority | GET /tasks?sort=priority | HIGH first, then MEDIUM, then LOW |

### Done Criteria

- [ ] All tasks in Sub-Phases 6A and 6B marked complete
- [ ] PATCH `/api/tasks/:id` accepts and saves priority (HIGH/MEDIUM/LOW)
- [ ] PATCH `/api/tasks/:id` accepts and saves due date
- [ ] PATCH `/api/tasks/:id` accepts and saves notes
- [ ] POST `/api/tasks/:id/complete` sets completed=true and completedAt timestamp
- [ ] Uncompleting a task clears completedAt
- [ ] GET `/api/tasks?dueDate=today` returns only tasks due today
- [ ] GET `/api/tasks?dueDate=overdue` returns only overdue incomplete tasks
- [ ] GET `/api/tasks?priority=HIGH` returns only high priority tasks
- [ ] GET `/api/tasks?completed=true` includes completed tasks
- [ ] GET `/api/tasks?sort=priority&order=desc` sorts HIGH→MEDIUM→LOW
- [ ] GET `/api/tasks?sort=due&order=asc` sorts by due date ascending
- [ ] TaskDetailModal opens when clicking a task
- [ ] TaskDetailModal allows editing all fields (title, list, priority, due date, notes, tags)
- [ ] PrioritySelector component shows HIGH/MEDIUM/LOW options
- [ ] DueDatePicker component allows date selection
- [ ] NotesEditor component allows multiline text editing
- [ ] TaskList item shows priority indicator (color/badge)
- [ ] TaskList item shows due date (with overdue styling)
- [ ] Completed tasks section auto-hides tasks completed before today
- [ ] Sort and filter controls work in UI
- [ ] Integration tests for enhanced task endpoints pass
- [ ] All previous phase functionality still works (regression check)
- [ ] Code passes type-check and lint

---

## Phase 7: Full LLM Parsing

### Goal
Enhance LLM prompts to extract all task fields from natural language input.

### Deliverable
Voice input that correctly extracts title, list, priority, due date, and tags.

### Sub-Phase 7A: Prompt Engineering

| # | Task | Status |
|---|------|--------|
| 7A.1 | Design comprehensive extraction prompt | Pending |
| 7A.2 | Add few-shot examples for each field type | Pending |
| 7A.3 | Handle relative dates (tomorrow, next Friday, in 3 days) | Pending |
| 7A.4 | Handle priority shortcuts (p1, p2, p3, high priority) | Pending |
| 7A.5 | Handle tag extraction ("tag it X", "tags: X, Y") | Pending |
| 7A.6 | Handle list references ("to my X list", "in X") | Pending |

### Sub-Phase 7B: Parser Implementation

| # | Task | Parallel Group | Status |
|---|------|----------------|--------|
| 7B.1 | Create enhanced parseTaskInput function | A | Pending |
| 7B.2 | Implement relative date resolution | A | Pending |
| 7B.3 | Implement list matching/auto-creation | B | Pending |
| 7B.4 | Implement tag matching/auto-creation | B | Pending |
| 7B.5 | Update voice endpoint to use all parsed fields | C | Pending |
| 7B.6 | Add confidence scoring for each extracted field | C | Pending |

### LLM Prompt Structure

```typescript
const EXTRACTION_PROMPT = `
You are a task extraction assistant. Parse the user's voice input and extract structured task data.

Extract the following fields:
- title: The core task action (required)
- list: Target list name (default: "inbox")
- priority: HIGH, MEDIUM, or LOW (if specified)
- dueDate: ISO date string (if specified)
- tags: Array of tag names (if specified)

Priority shortcuts:
- "p1", "priority 1", "high priority" → HIGH
- "p2", "priority 2", "medium priority" → MEDIUM
- "p3", "priority 3", "low priority" → LOW

Date handling:
- "today" → today's date
- "tomorrow" → tomorrow's date
- "next Monday" → next occurrence of Monday
- "in 3 days" → 3 days from now
- Specific dates: "March 15", "3/15", "March 15th 2025"

Examples:
Input: "Add buy milk to groceries"
Output: {"title": "Buy milk", "list": "groceries"}

Input: "High priority: finish report by Friday"
Output: {"title": "Finish report", "priority": "HIGH", "dueDate": "2025-01-17"}

Input: "Add call dentist to health list, tag it insurance"
Output: {"title": "Call dentist", "list": "health", "tags": ["insurance"]}

Input: "P1 submit taxes by April 15"
Output: {"title": "Submit taxes", "priority": "HIGH", "dueDate": "2025-04-15"}

Now parse this input:
Input: "{input}"
Output:`;
```

### Test Plan

| Test | Input | Expected Extraction |
|------|-------|---------------------|
| Simple task | "Add buy milk" | title: "Buy milk", list: "inbox" |
| With list | "Add buy milk to groceries" | title: "Buy milk", list: "groceries" |
| With priority | "P1 finish report" | title: "Finish report", priority: HIGH |
| With due date | "Call mom tomorrow" | title: "Call mom", dueDate: tomorrow |
| With tags | "Fix bug, tag it urgent backend" | title: "Fix bug", tags: ["urgent", "backend"] |
| Complex | "Add high priority review PR to work by Monday, tag it code-review" | All fields extracted |
| Natural priority | "High priority: submit expenses" | priority: HIGH extracted |
| Relative date | "Dentist appointment in 3 days" | dueDate: correct date calculated |

### Edge Cases

| Scenario | Handling |
|----------|----------|
| Ambiguous date | Default to next occurrence (e.g., "Friday" = next Friday) |
| Unknown list | Auto-create list with normalized name |
| Multiple priorities mentioned | Use first/most explicit |
| No extractable task | Fallback to raw input as title, flag warning |

### Done Criteria

- [ ] All tasks in Sub-Phases 7A and 7B marked complete
- [ ] Extraction prompt handles all field types (title, list, priority, due date, tags)
- [ ] "Add buy milk to groceries" extracts: title="Buy milk", list="groceries"
- [ ] "P1 finish report" extracts: priority=HIGH
- [ ] "High priority: submit expenses" extracts: priority=HIGH
- [ ] "Call mom tomorrow" extracts: dueDate=tomorrow's ISO date
- [ ] "Dentist in 3 days" extracts: dueDate=3 days from now ISO date
- [ ] "next Friday" resolves to correct future Friday
- [ ] "Fix bug, tag it urgent backend" extracts: tags=["urgent", "backend"]
- [ ] Unknown list names auto-create the list
- [ ] Unknown tags auto-create the tags
- [ ] Confidence scoring returns values for each field
- [ ] Unparseable input falls back to raw text as title with parse_warning=true
- [ ] Voice endpoint creates task with all extracted fields
- [ ] Created list is properly normalized (lowercase, trimmed)
- [ ] Unit tests for date resolution pass (today, tomorrow, relative, absolute)
- [ ] Unit tests for priority parsing pass
- [ ] Integration tests for enhanced voice endpoint pass
- [ ] LLM response time < 3 seconds for typical input
- [ ] All previous phase functionality still works (regression check)
- [ ] Code passes type-check and lint

---

## Phase 8: Responsive UI

### Goal
Create a fully mobile-optimized web experience with touch-friendly interactions.

### Deliverable
Responsive design that works great on phones, tablets, and desktops.

### Sub-Phase 8A: Layout & Navigation

| # | Task | Parallel Group | Status |
|---|------|----------------|--------|
| 8A.1 | Implement responsive layout (mobile-first) | A | Pending |
| 8A.2 | Create mobile navigation (hamburger menu or bottom nav) | A | Pending |
| 8A.3 | Create collapsible sidebar for lists | A | Pending |
| 8A.4 | Add swipe gestures for task actions (complete, delete) | B | Pending |
| 8A.5 | Optimize touch targets (min 44px) | B | Pending |

### Sub-Phase 8B: Component Updates

| # | Task | Parallel Group | Status |
|---|------|----------------|--------|
| 8B.1 | Update TaskList for mobile layout | A | Pending |
| 8B.2 | Update AddTaskForm for mobile | A | Pending |
| 8B.3 | Update TaskDetailModal for mobile (full screen) | A | Pending |
| 8B.4 | Add pull-to-refresh functionality | B | Pending |
| 8B.5 | Optimize date picker for mobile | B | Pending |
| 8B.6 | Add loading skeletons for better perceived performance | C | Pending |

### Sub-Phase 8C: Styling & Polish

| # | Task | Status |
|---|------|--------|
| 8C.1 | Define responsive breakpoints (mobile < 768px, tablet, desktop) | Pending |
| 8C.2 | Implement dark mode support | Pending |
| 8C.3 | Add CSS transitions for smoother interactions | Pending |
| 8C.4 | Ensure keyboard accessibility throughout | Pending |
| 8C.5 | Test on actual mobile devices | Pending |

### Responsive Breakpoints

```css
/* Mobile first approach */
/* Default: Mobile (< 640px) */

/* Tablet */
@media (min-width: 640px) { }

/* Desktop */
@media (min-width: 1024px) { }

/* Large Desktop */
@media (min-width: 1280px) { }
```

### Mobile Navigation Options

**Option A: Bottom Navigation Bar**
- Always visible at bottom
- Icons for: Tasks, Lists, Add, Settings
- Thumb-friendly

**Option B: Hamburger Menu**
- Collapsible sidebar
- Full list navigation
- More content space

**Recommended**: Bottom nav for primary actions + hamburger for list selection

### Test Plan

| Test | Device | Expected Result |
|------|--------|-----------------|
| Mobile layout | iPhone 12/13 size | Single column, bottom nav visible |
| Tablet layout | iPad size | Sidebar visible, wider cards |
| Desktop layout | 1920x1080 | Full sidebar, comfortable spacing |
| Touch targets | Mobile | All interactive elements ≥ 44px |
| Swipe complete | Mobile | Swipe right completes task |
| Swipe delete | Mobile | Swipe left reveals delete |
| Add task | Mobile | Form accessible, keyboard doesn't obscure |

### Done Criteria

- [ ] All tasks in Sub-Phases 8A, 8B, and 8C marked complete
- [ ] Mobile layout (< 640px): single column, no horizontal scroll
- [ ] Tablet layout (640-1024px): sidebar visible, wider content area
- [ ] Desktop layout (> 1024px): full sidebar, comfortable spacing
- [ ] All touch targets ≥ 44px (verify with browser dev tools)
- [ ] Mobile navigation (bottom nav or hamburger) works correctly
- [ ] List sidebar is collapsible on mobile
- [ ] Swipe right on task completes it (mobile)
- [ ] Swipe left on task reveals delete option (mobile)
- [ ] TaskDetailModal shows full-screen on mobile
- [ ] Pull-to-refresh reloads task list
- [ ] Date picker is usable on mobile (native or responsive custom)
- [ ] Loading skeletons display during data fetch
- [ ] Dark mode toggle works and persists preference
- [ ] CSS transitions are smooth (no jank)
- [ ] Keyboard navigation works throughout (Tab, Enter, Escape)
- [ ] ARIA labels present on interactive elements
- [ ] Tested on real iPhone (Safari)
- [ ] Tested on real Android (Chrome)
- [ ] Page load time < 2 seconds on 3G throttled connection (Chrome DevTools)
- [ ] Lighthouse Performance score ≥ 80 on mobile
- [ ] Lighthouse Accessibility score ≥ 90
- [ ] All previous phase functionality still works (regression check)
- [ ] Code passes type-check and lint

---

## Phase 9: macOS Shortcut Integration

### Goal
Create macOS Shortcuts integration mirroring the iOS experience.

### Deliverable
Working macOS Shortcut for voice input with keyboard trigger.

### Task List

| # | Task | Status |
|---|------|--------|
| 9.1 | Document macOS Shortcut setup guide | Pending |
| 9.2 | Verify API works from macOS (same as iOS) | Pending |
| 9.3 | Create macOS-specific shortcut instructions | Pending |
| 9.4 | Configure keyboard shortcut trigger (e.g., ⌘⇧Space) | Pending |
| 9.5 | Test dictation accuracy on macOS | Pending |
| 9.6 | Add error handling for macOS-specific issues | Pending |
| 9.7 | Document alternative options (Raycast, Alfred) for future | Pending |

### macOS Shortcut Flow

```
[Keyboard Shortcut: ⌘⇧Space]
       │
       ▼
[macOS Shortcuts: "Dictate Text" action]
       │
       ▼
[Returns transcribed text]
       │
       ▼
[POST to https://lifetracker.maverickapplications.com/api/voice]
       │
       ├── SUCCESS → Show notification: "✓ <task_title> added"
       │
       └── FAILURE → Show notification: "Server unavailable"
```

### Test Plan

| Test | Action | Expected Result |
|------|--------|-----------------|
| Keyboard trigger | Press ⌘⇧Space | Dictation starts |
| Voice input | Say "Add buy groceries to shopping" | Task created with correct list |
| Notification | After successful add | macOS notification shows "Added: Buy groceries" |
| Server offline | API unreachable | Error notification displayed |
| Cancel dictation | Press Escape during dictation | No task created |

### Documentation Outline

Create `docs/macos-shortcut-setup.md`:
1. Prerequisites
2. Creating the Shortcut
3. Configuring keyboard trigger
4. Testing the shortcut
5. Troubleshooting
6. Alternative options (Raycast, Alfred)

### Done Criteria

- [ ] All tasks in Phase 9 task list marked complete
- [ ] `docs/macos-shortcut-setup.md` document created with all sections
- [ ] Shortcut can be created following the documentation
- [ ] Keyboard trigger (⌘⇧Space or chosen alternative) launches dictation
- [ ] Voice input "Add buy groceries to shopping" creates correct task
- [ ] Success notification displays on macOS: "Added: Buy groceries"
- [ ] Error notification displays when API unavailable
- [ ] Canceling dictation (Escape) does not create task
- [ ] Full LLM parsing works (priority, due date, tags extracted)
- [ ] Created task visible in web app immediately
- [ ] Shortcut works on macOS Sonoma (14.x) or later
- [ ] Documentation includes screenshots
- [ ] Troubleshooting section covers common issues (permissions, network)
- [ ] Alternative options (Raycast, Alfred) documented for future reference
- [ ] iOS Shortcut still works after any shared changes (regression check)
- [ ] All previous phase functionality still works (regression check)

---

## Phase 10: Integration Testing & Polish

### Goal
Comprehensive testing and final polish before MVP release.

### Deliverable
Stable, production-ready MVP.

### Sub-Phase 10A: End-to-End Testing

| # | Test Scenario | Status |
|---|--------------|--------|
| 10A.1 | Full voice flow (iOS shortcut → API → web) | Pending |
| 10A.2 | Full voice flow (macOS shortcut → API → web) | Pending |
| 10A.3 | Login → add task → complete → logout | Pending |
| 10A.4 | Create list → add tasks → filter → delete list | Pending |
| 10A.5 | Add tags → filter by tags → remove tags | Pending |
| 10A.6 | Priority and due date extraction from voice | Pending |
| 10A.7 | Multiple devices showing same data | Pending |
| 10A.8 | Server restart data persistence | Pending |
| 10A.9 | LLM restart recovery | Pending |

### Sub-Phase 10B: Performance Testing

| # | Metric | Target | Status |
|---|--------|--------|--------|
| 10B.1 | Voice → Notification latency | < 5 sec | Pending |
| 10B.2 | Web page load (mobile) | < 2 sec | Pending |
| 10B.3 | Task creation (API) | < 500ms | Pending |
| 10B.4 | LLM full parsing | < 3 sec | Pending |
| 10B.5 | JWT refresh | < 200ms | Pending |
| 10B.6 | List with 100 tasks | Smooth scroll | Pending |

### Sub-Phase 10C: Security Review

| # | Check | Status |
|---|-------|--------|
| 10C.1 | Password hashing (bcrypt cost 12+) | Pending |
| 10C.2 | JWT signature validation | Pending |
| 10C.3 | Refresh token rotation | Pending |
| 10C.4 | Rate limiting on auth endpoints | Pending |
| 10C.5 | Input sanitization (XSS prevention) | Pending |
| 10C.6 | SQL injection prevention (Prisma handles) | Pending |
| 10C.7 | CORS configuration | Pending |
| 10C.8 | Secure cookie flags | Pending |

### Sub-Phase 10D: Documentation & Cleanup

| # | Task | Status |
|---|------|--------|
| 10D.1 | Update CLAUDE.md with MVP features | Pending |
| 10D.2 | Update API documentation | Pending |
| 10D.3 | Update DEPLOYMENT.md for production | Pending |
| 10D.4 | Create user guide for new features | Pending |
| 10D.5 | Clean up TODO comments in code | Pending |
| 10D.6 | Remove debug logging | Pending |
| 10D.7 | Final code review | Pending |

### Done Criteria

- [ ] All tasks in Sub-Phases 10A, 10B, 10C, and 10D marked complete
- [ ] **E2E Tests Pass:**
  - [ ] iOS voice flow creates task and shows in web
  - [ ] macOS voice flow creates task and shows in web
  - [ ] Login → add task → complete → logout flow works
  - [ ] Create list → add tasks → filter → delete list works
  - [ ] Tags CRUD and filtering works
  - [ ] Priority and due date extraction from voice works
  - [ ] Multiple browser tabs show consistent data
  - [ ] Data persists across server restart
  - [ ] App recovers gracefully from LLM restart
- [ ] **Performance Targets Met:**
  - [ ] Voice → notification latency < 5 seconds
  - [ ] Web page load (mobile) < 2 seconds
  - [ ] Task creation API < 500ms
  - [ ] LLM full parsing < 3 seconds
  - [ ] JWT refresh < 200ms
  - [ ] 100-task list scrolls smoothly (no jank)
- [ ] **Security Checklist Complete:**
  - [ ] Password hashing uses bcrypt cost 12+
  - [ ] JWT signatures validated correctly
  - [ ] Refresh token rotation implemented
  - [ ] Rate limiting active on auth endpoints
  - [ ] XSS prevention verified (no unescaped user content)
  - [ ] SQL injection prevented (Prisma parameterized queries)
  - [ ] CORS configured for production domain only
  - [ ] Cookies have Secure, httpOnly, SameSite=Strict flags
- [ ] **Documentation Updated:**
  - [ ] CLAUDE.md reflects all MVP features
  - [ ] API documentation complete for all endpoints
  - [ ] DEPLOYMENT.md updated for production
  - [ ] User guide created for new features
- [ ] **Code Quality:**
  - [ ] No TODO comments remaining in code
  - [ ] No console.log debug statements
  - [ ] Final code review completed
  - [ ] All tests pass: `bun test`
  - [ ] Code passes lint: `bun lint`
  - [ ] Code passes type-check: `bunx tsc --noEmit`

---

## Phase 11: Deployment Automation

### Goal
Configure GitHub Actions deployment workflow with proper secrets and optional code coverage reporting.

### Deliverable
Working automated deployment pipeline triggered manually from GitHub Actions, with optional Codecov integration for PR coverage reports.

### Background
Phase 2 created the deployment workflow (`deploy.yml`) but deferred secrets configuration. This phase completes the deployment automation setup.

### Task List

| # | Task | Status |
|---|------|--------|
| 11.1 | Configure `DEPLOY_HOST` secret in GitHub | Pending |
| 11.2 | Configure `DEPLOY_USER` secret in GitHub | Pending |
| 11.3 | Configure `DEPLOY_SSH_KEY` secret in GitHub | Pending |
| 11.4 | Test manual deployment workflow | Pending |
| 11.5 | Set up Codecov account and link repository | Pending |
| 11.6 | Configure `CODECOV_TOKEN` secret in GitHub | Pending |
| 11.7 | Verify coverage reports appear on PRs | Pending |
| 11.8 | Configure branch protection rules for `main` and `mvp` | Pending |

### GitHub Secrets Required

| Secret | Description |
|--------|-------------|
| `DEPLOY_HOST` | Server hostname or IP (e.g., `lifetracker.maverickapplications.com`) |
| `DEPLOY_USER` | SSH username with deploy permissions |
| `DEPLOY_SSH_KEY` | Private SSH key for authentication |
| `CODECOV_TOKEN` | Upload token from codecov.io (optional) |

### Branch Protection Rules

Configure on GitHub (Settings → Branches → Add rule):

**For `main` and `mvp` branches:**
- Require pull request reviews before merging
- Require status checks to pass:
  - `lint`
  - `test-unit`
  - `test-integration`
  - `test-e2e`
  - `build`
- Require branches to be up to date before merging

### Test Plan

| Test | Action | Expected Result |
|------|--------|-----------------|
| Manual deploy | Trigger deploy workflow from GitHub Actions | App deploys, health check passes |
| Coverage report | Create PR with test changes | Codecov comment appears on PR |
| Branch protection | Try to push directly to `main` | Push rejected |

### Done Criteria

- [ ] All tasks in Phase 11 task list marked complete
- [ ] `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY` secrets configured
- [ ] Manual deployment workflow completes successfully
- [ ] Health check passes after deployment
- [ ] Codecov account created and linked (optional)
- [ ] `CODECOV_TOKEN` secret configured (optional)
- [ ] Coverage reports visible on PRs (optional)
- [ ] Branch protection enabled on `main`
- [ ] Branch protection enabled on `mvp`
- [ ] Direct push to protected branches is blocked

---

## Definition of Done

### MVP Complete When:

- [ ] Can log in with username/password
- [ ] Can create, rename, and delete lists
- [ ] Can add tags to tasks
- [ ] Can filter tasks by list, tags, priority, or due date
- [ ] Voice input extracts title, list, priority, due date, and tags
- [ ] Lists are auto-created when referenced in voice input
- [ ] UI works well on mobile devices
- [ ] macOS Shortcut works like iOS Shortcut
- [ ] All tests in Phase 9 pass
- [ ] Documentation is updated

### Quality Criteria:

- [ ] No critical bugs
- [ ] Page load < 2 seconds on mobile
- [ ] Voice → notification < 5 seconds
- [ ] Responsive design tested on real devices
- [ ] Security checklist complete

---

## Summary Timeline

| Phase | Description | Dependencies |
|-------|-------------|--------------|
| 1 | Database Schema Extension | None |
| 2 | CI/CD Pipeline | Phase 1 |
| 3 | Authentication System | Phase 1 |
| 4 | List Management | Phase 1 |
| 5 | Tags System | Phase 1 |
| 6 | Enhanced Task Features | Phases 4, 5 |
| 7 | Full LLM Parsing | Phases 4, 5 |
| 8 | Responsive UI | Phases 4, 5, 6 |
| 9 | macOS Shortcut | Phase 7 |
| 10 | Integration Testing | All phases |
| 11 | Deployment Automation | Phase 2 |

**Parallelization Notes:**
- Phase 2 (CI/CD) should be completed early so all subsequent phases benefit from automated testing
- Phases 3, 4, 5 can be developed in parallel after Phases 1 and 2
- Phase 6 depends on 4 and 5 for list/tag integration
- Phase 7 depends on 4 and 5 for list/tag matching
- Phase 8 can begin once basic components exist (Phase 6)
- Phase 9 can begin once voice endpoint is updated (Phase 7)
- Each phase adds tests to the CI pipeline established in Phase 2

---

## Deferred to Post-MVP

| Feature | Notes |
|---------|-------|
| Recurring tasks | High priority for next iteration |
| "Teach the System" UI | Correction modal for parse errors |
| Offline queue | IndexedDB + sync logic |
| Multi-item NLP | "Add milk and eggs" → two tasks |
| PWA / Service Worker | For installable app |
| Smart "Today" view | Auto-populated based on due dates |

---

## Files to Create (MVP)

| File | Purpose |
|------|---------|
| `packages/core/prisma/schema.prisma` | Updated with User, Tag, TaskTag |
| `packages/api/src/routes/auth.ts` | Authentication routes |
| `packages/api/src/services/auth.ts` | JWT/password utilities |
| `packages/api/src/middleware/jwt-auth.ts` | JWT verification middleware |
| `packages/web/src/pages/Login.tsx` | Login page |
| `packages/web/src/stores/auth.ts` | Auth state (Zustand) |
| `packages/web/src/components/ListSidebar.tsx` | List navigation |
| `packages/web/src/components/TagBadge.tsx` | Tag display |
| `packages/web/src/components/TagInput.tsx` | Tag autocomplete |
| `packages/web/src/components/TaskDetailModal.tsx` | Full task editing |
| `packages/web/src/components/PrioritySelector.tsx` | Priority picker |
| `packages/web/src/components/DueDatePicker.tsx` | Date picker |
| `packages/web/src/components/MobileNav.tsx` | Mobile navigation |
| `packages/api/src/services/llm-enhanced.ts` | Full extraction prompt |
| `docs/macos-shortcut-setup.md` | macOS setup guide |
