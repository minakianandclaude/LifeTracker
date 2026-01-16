# Phase 2: CI/CD Pipeline Implementation

## Status: Complete (Ready for PR)

**Branch**: `mvp-phase-2-cicd`
**Started**: 2026-01-15
**Last Updated**: 2026-01-15

---

## Progress Tracker

| Step | Description | Status |
|------|-------------|--------|
| 1 | Install dependencies (root + packages) | ✅ Complete |
| 2 | Configure root package.json scripts | ✅ Complete |
| 3 | Create vitest.config.ts (root + web) | ✅ Complete |
| 4 | Create playwright.config.ts | ✅ Complete |
| 5 | Setup Husky & lint-staged | ✅ Complete |
| 6 | Create GitHub Actions CI workflow | ✅ Complete |
| 7 | Create GitHub Actions Deploy workflow | ✅ Complete |
| 8 | Update turbo.json with new tasks | ✅ Complete |
| 9 | Add package-level scripts (api, core, web) | ✅ Complete |
| 10 | Create test utilities and sample tests | ✅ Complete |
| 11 | Create rollback procedure docs | ✅ Complete |
| 12 | Verify all scripts work | ✅ Complete |

---

## Implementation Details

### Step 1: Install Dependencies

**Root `package.json`:**
```bash
bun add -D @biomejs/biome vitest @vitest/coverage-v8 husky lint-staged
```

**`packages/api/package.json`:**
```bash
cd packages/api && bun add -D vitest @types/node
```

**`packages/web/package.json`:**
```bash
cd packages/web && bun add -D vitest @testing-library/react @testing-library/jest-dom jsdom @playwright/test
```

---

### Step 2: Configure Root Scripts

Add to root `package.json`:
```json
{
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "typecheck": "turbo typecheck",
    "test": "turbo test",
    "test:unit": "vitest run",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:e2e": "playwright test",
    "test:coverage": "vitest run --coverage",
    "prepare": "husky"
  },
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": ["biome check --write"],
    "*.prisma": ["bunx prisma format"]
  }
}
```

---

### Step 3: Create Vitest Configs

**Root `vitest.config.ts`:**
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['**/node_modules/**', '**/*.test.ts', '**/dist/**'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      }
    }
  }
});
```

**`packages/web/vitest.config.ts`:**
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['**/e2e/**']
  }
});
```

---

### Step 4: Create Playwright Config

**Root `playwright.config.ts`:**
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './packages/web/src/__tests__/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ],
  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI
  }
});
```

---

### Step 5: Setup Husky & lint-staged

```bash
bunx husky init
```

**`.husky/pre-commit`:**
```bash
bunx lint-staged
```

---

### Step 6: Create GitHub Actions CI Workflow

**`.github/workflows/ci.yml`:**
```yaml
name: CI

on:
  push:
    branches: [main, mvp]
  pull_request:
    branches: [main, mvp]

env:
  DATABASE_URL: postgresql://test:test@localhost:5432/lifetracker_test
  API_KEY: test-api-key
  JWT_SECRET: test-jwt-secret-32-characters-long

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun run lint
      - run: bun run typecheck

  test-unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun run test:unit
      - uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: false

  test-integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
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
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: cd packages/core && bunx prisma db push
      - run: bun run test:integration

  test-e2e:
    runs-on: ubuntu-latest
    needs: [lint, test-unit, test-integration]
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bunx playwright install --with-deps chromium
      - run: bun run test:e2e

  build:
    runs-on: ubuntu-latest
    needs: [test-e2e]
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - run: docker compose build api web
```

---

### Step 7: Create GitHub Actions Deploy Workflow

**`.github/workflows/deploy.yml`:**
```yaml
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
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_SSH_KEY }}
          script: |
            cd /opt/lifetracker
            git pull origin mvp
            docker compose up -d --build

      - name: Verify deployment
        run: |
          sleep 15
          curl -f https://lifetracker.maverickapplications.com/health || exit 1
```

---

### Step 8: Update turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "lint": {},
    "clean": {
      "cache": false
    }
  }
}
```

---

### Step 9: Add Package-Level Scripts

**`packages/api/package.json`** - add:
```json
{
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

**`packages/core/package.json`** - add:
```json
{
  "typecheck": "tsc --noEmit",
  "test": "vitest run"
}
```

**`packages/web/package.json`** - add:
```json
{
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:e2e": "playwright test"
}
```

---

### Step 10: Create Test Utilities and Sample Tests

**Files to create:**

1. `packages/core/src/test/db.ts` - Database test utilities
2. `packages/web/src/test/setup.ts` - Jest-DOM setup
3. `packages/core/src/utils/normalize.ts` - List name utilities
4. `packages/core/src/utils/normalize.test.ts` - Sample unit test
5. `packages/web/src/__tests__/e2e/health.spec.ts` - Sample E2E test

---

### Step 11: Create Rollback Procedure

**`docs/rollback-procedure.md`:**
- Quick rollback via SSH
- Database rollback with Prisma

---

### Step 12: Verification

1. `bun run lint` - passes
2. `bun run typecheck` - passes
3. `bun run test:unit` - passes
4. Pre-commit hook - triggers lint-staged
5. Push to GitHub - CI runs successfully

---

## Files Modified/Created

| File | Action | Status |
|------|--------|--------|
| `package.json` | Modify | Pending |
| `vitest.config.ts` | Create | Pending |
| `playwright.config.ts` | Create | Pending |
| `.husky/pre-commit` | Create | Pending |
| `.github/workflows/ci.yml` | Create | Pending |
| `.github/workflows/deploy.yml` | Create | Pending |
| `turbo.json` | Modify | Pending |
| `packages/api/package.json` | Modify | Pending |
| `packages/core/package.json` | Modify | Pending |
| `packages/web/package.json` | Modify | Pending |
| `packages/web/vitest.config.ts` | Create | Pending |
| `packages/core/src/test/db.ts` | Create | Pending |
| `packages/web/src/test/setup.ts` | Create | Pending |
| `packages/core/src/utils/normalize.ts` | Create | Pending |
| `packages/core/src/utils/normalize.test.ts` | Create | Pending |
| `packages/web/src/__tests__/e2e/health.spec.ts` | Create | Pending |
| `docs/rollback-procedure.md` | Create | Pending |

---

## GitHub Configuration (Manual)

After implementation, configure on GitHub:

### Secrets Required
- `DEPLOY_HOST`: Server hostname
- `DEPLOY_USER`: SSH username
- `DEPLOY_SSH_KEY`: SSH private key
- `CODECOV_TOKEN`: (optional) Codecov upload token

### Branch Protection Rules
1. Settings → Branches → Add rule
2. Pattern: `main` and `mvp`
3. Enable: Require status checks (`lint`, `test-unit`, `test-integration`, `test-e2e`, `build`)

---

## Done Criteria

From `docs/mvp-development-plan.md`:

- [ ] `.github/workflows/ci.yml` runs on PR
- [ ] `.github/workflows/deploy.yml` exists with manual trigger
- [ ] `bun run lint` checks all packages
- [ ] `bun run typecheck` validates TypeScript
- [ ] `bun run test:unit` runs unit tests with coverage
- [ ] `bun run test:integration` runs against test database
- [ ] `bun run test:e2e` runs Playwright tests
- [ ] Vitest configured with 80% coverage thresholds
- [ ] Playwright configured for E2E
- [ ] Test database service in CI
- [ ] Pre-commit hook runs lint-staged
- [ ] Rollback procedure documented
