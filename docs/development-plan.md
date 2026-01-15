# LifeTracker - Comprehensive Development Plan

## Overview

This plan addresses the user's feedback and establishes a modular, extensible architecture for LifeTracker that enables easy progression from PoC → MVP → full application.

---

## 1. Authentication Strategy

### Recommendation: JWT + Refresh Token Pattern

For a single-user self-hosted application, we balance simplicity with security best practices:

#### Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    Auth Flow                                 │
├─────────────────────────────────────────────────────────────┤
│  Login (username/password)                                   │
│           │                                                  │
│           ▼                                                  │
│  Server validates credentials                                │
│           │                                                  │
│           ▼                                                  │
│  Returns: { accessToken (15min), refreshToken (7days) }     │
│           │                                                  │
│           ▼                                                  │
│  Client stores tokens (httpOnly cookies for web,            │
│  secure storage for iOS Shortcut)                           │
│           │                                                  │
│           ▼                                                  │
│  API requests include Authorization: Bearer <accessToken>    │
│           │                                                  │
│           ▼                                                  │
│  Token expired? → Auto-refresh using refreshToken            │
└─────────────────────────────────────────────────────────────┘
```

#### Implementation Details

| Component | Approach |
|-----------|----------|
| **Password Storage** | bcrypt with cost factor 12 |
| **Access Token** | JWT, 15-minute expiry, signed with RS256 |
| **Refresh Token** | Opaque token stored in DB, 7-day expiry |
| **Token Storage (Web)** | httpOnly, Secure, SameSite=Strict cookies |
| **Token Storage (iOS Shortcut)** | Stored in Shortcut variable (long-lived API key alternative) |
| **Rate Limiting** | 5 failed login attempts → 15-minute lockout |

#### iOS Shortcut Auth Strategy

Since iOS Shortcuts cannot easily handle JWT refresh flows:
- Generate a **long-lived API key** (UUID) for Shortcut use
- API key stored in Shortcut, sent as `X-API-Key` header
- API key can be revoked/regenerated from web UI
- Separate from web session tokens

#### PoC Simplification
- Start with API key only (no JWT complexity)
- Single pre-configured API key in environment variable
- Add full JWT auth in MVP phase

#### Future: Multi-User Expansion
- Architecture supports adding user_id to tokens
- Can integrate Authelia or similar if needed later

---

## 2. Offline Resilience Strategy

### The Challenge

iOS Shortcuts have limited offline capabilities. Background Sync API (ideal for PWAs) has poor iOS support.

### Recommended Approach: Hybrid Queue Strategy

#### Phase 1: PoC (iOS Shortcut Only)
```
┌─────────────────────────────────────────────────────────────┐
│                iOS Shortcut Flow                             │
├─────────────────────────────────────────────────────────────┤
│  1. Voice input captured                                     │
│  2. Shortcut attempts POST to server                         │
│  3. IF success → Show success notification                   │
│  4. IF failure (timeout/error):                              │
│     a. Show "Server unavailable" notification                │
│     b. Save to iOS Notes/Reminders as fallback              │
│     c. Append "[PENDING]" prefix to text                     │
│  5. User manually processes pending items when online        │
└─────────────────────────────────────────────────────────────┘
```

#### Phase 2: MVP (Web App Offline Support)
```
┌─────────────────────────────────────────────────────────────┐
│                Web App Offline Queue                         │
├─────────────────────────────────────────────────────────────┤
│  1. User creates task in web UI                              │
│  2. IF online → POST immediately                             │
│  3. IF offline:                                              │
│     a. Store in IndexedDB with status: "pending_sync"       │
│     b. Show task in UI with "pending" indicator              │
│     c. Register for online event                             │
│  4. When online:                                             │
│     a. Process queue in order                                │
│     b. Update status to "synced"                             │
│     c. Handle conflicts (server wins for MVP)               │
└─────────────────────────────────────────────────────────────┘
```

#### Phase 3: PWA (Background Sync)
- Add service worker with Background Sync API
- Works well on Android/Chrome
- Graceful fallback for iOS (poll on app foreground)

### Data Model Addition
```prisma
model PendingAction {
  id          String   @id @default(uuid())
  action      String   // "create_task", "complete_task", etc.
  payload     Json     // The action data
  status      String   // "pending", "syncing", "failed", "synced"
  attempts    Int      @default(0)
  lastError   String?
  createdAt   DateTime @default(now())
  syncedAt    DateTime?
}
```

### Does This Require a Mobile App?

**No.** The hybrid approach works without a native mobile app:
- iOS Shortcut handles voice capture + fallback to Notes
- PWA handles offline queuing for web interactions
- True background sync requires native app, but is not critical for PoC/MVP

---

## 3. Error Feedback Loop: "Teach the System"

### Concept

When LLM parsing fails or partially succeeds, users can correct errors to improve future parsing.

### User Flow
```
┌─────────────────────────────────────────────────────────────┐
│              "Teach the System" Flow                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. User says: "Add get milk and bread to groceries"        │
│                                                              │
│  2. LLM parses (incorrectly):                               │
│     { title: "get milk and bread", list: "groceries" }      │
│     (Should have been two separate tasks)                    │
│                                                              │
│  3. Task created in Inbox with parse_warning flag           │
│                                                              │
│  4. Web UI shows warning indicator on task                  │
│     "We parsed this as one task. Is that correct?"          │
│                                                              │
│  5. User clicks "Correct this":                             │
│     - Shows original input                                   │
│     - Shows what was parsed                                  │
│     - User can:                                              │
│       a) Confirm (it's correct)                              │
│       b) Edit (fix the parsed values)                        │
│       c) Split (create multiple tasks)                       │
│       d) Delete and re-enter                                 │
│                                                              │
│  6. Correction saved to training_examples table             │
│                                                              │
│  7. Periodically, training examples used to:                │
│     a) Improve prompt engineering                            │
│     b) Fine-tune model (future)                              │
│     c) Add to few-shot examples                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Data Model
```prisma
model TrainingExample {
  id             String   @id @default(uuid())
  rawInput       String   // Original voice input
  originalParse  Json     // What the LLM initially extracted
  correctedParse Json     // What the user corrected it to
  module         String   // "tasks", "finance", "fitness"
  feedbackType   String   // "confirmed", "corrected", "split", "rejected"
  createdAt      DateTime @default(now())
}
```

### UI Components
1. **Parse Warning Badge** - Yellow indicator on tasks with parse_errors
2. **Correction Modal** - Shows original input, parsed output, allows edits
3. **Training Dashboard** (future) - View corrections, export for fine-tuning

### PoC Scope
- Store raw_input and parse_errors on tasks
- Show warning badge
- Allow manual editing (no formal correction flow yet)

### MVP Scope
- Full correction modal
- Save corrections to training_examples
- Use corrections as few-shot examples in prompts

---

## 4. List Name Handling

### Storage vs Display

| Operation | Format | Example |
|-----------|--------|---------|
| Storage (DB) | lowercase, trimmed | `"grocery shopping"` |
| Display (UI) | Title Case | `"Grocery Shopping"` |
| Comparison | lowercase, trimmed | `"grocery shopping" === "grocery shopping"` |
| URL slug | kebab-case | `/lists/grocery-shopping` |

### Implementation
```typescript
// utils/listName.ts
export const normalizeListName = (name: string): string => {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
};

export const displayListName = (name: string): string => {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const slugifyListName = (name: string): string => {
  return normalizeListName(name).replace(/\s+/g, '-');
};
```

### Collision Prevention
- Unique constraint on normalized name in database
- LLM prompt instructs: "Match existing lists case-insensitively"
- Fuzzy matching (future): Levenshtein distance < 2 suggests existing list

---

## 5. Modular Architecture

### Design Principles

1. **Module Independence** - Each module is self-contained
2. **Shared Core** - Common utilities, auth, and base classes
3. **Plugin Pattern** - New modules register with the system
4. **Consistent Interfaces** - All modules follow same patterns

### Directory Structure
```
lifetracker/
├── packages/
│   ├── core/                    # Shared utilities, auth, types
│   │   ├── src/
│   │   │   ├── auth/            # Authentication logic
│   │   │   ├── db/              # Prisma client, base models
│   │   │   ├── llm/             # LLM client, prompt utilities
│   │   │   ├── utils/           # Common utilities
│   │   │   └── types/           # Shared TypeScript types
│   │   └── package.json
│   │
│   ├── api/                     # Express/Fastify API server
│   │   ├── src/
│   │   │   ├── server.ts        # Server setup, middleware
│   │   │   ├── routes/          # Route registration
│   │   │   └── modules/         # Module route handlers
│   │   └── package.json
│   │
│   ├── web/                     # React + Vite frontend
│   │   ├── src/
│   │   │   ├── components/      # Shared UI components
│   │   │   ├── modules/         # Module-specific UI
│   │   │   ├── hooks/           # Shared React hooks
│   │   │   └── stores/          # State management
│   │   └── package.json
│   │
│   └── modules/                 # Feature modules
│       ├── tasks/               # Tasks module
│       │   ├── api/             # API routes & handlers
│       │   ├── web/             # React components
│       │   ├── llm/             # LLM prompts & parsing
│       │   ├── schema.prisma    # Module-specific schema
│       │   └── index.ts         # Module registration
│       │
│       ├── finance/             # Finance module (future)
│       ├── fitness/             # Fitness module (future)
│       └── shopping/            # Shopping module (future)
│
├── prisma/
│   └── schema.prisma            # Combined schema (imports modules)
│
├── docker-compose.yml           # Local development setup
├── package.json                 # Monorepo root (Bun workspaces)
└── turbo.json                   # Turborepo config
```

### Module Interface

Each module exports a standard interface:

```typescript
// packages/modules/tasks/index.ts
import type { Module } from '@lifetracker/core';

export const tasksModule: Module = {
  name: 'tasks',
  version: '1.0.0',

  // API routes
  routes: (router) => {
    router.get('/tasks', handlers.list);
    router.post('/tasks', handlers.create);
    router.patch('/tasks/:id', handlers.update);
    router.delete('/tasks/:id', handlers.remove);
  },

  // LLM intent patterns
  intents: [
    { pattern: 'add|create|new.*task', action: 'create_task' },
    { pattern: 'complete|done|finish', action: 'complete_task' },
    { pattern: 'show|list|what.*tasks?', action: 'query_tasks' },
  ],

  // LLM parsing function
  parseIntent: async (input: string, llm: LLMClient) => {
    // Module-specific parsing logic
  },

  // Prisma schema path
  schema: './schema.prisma',
};
```

### Module Registration

```typescript
// packages/api/src/server.ts
import { tasksModule } from '@lifetracker/module-tasks';
// import { financeModule } from '@lifetracker/module-finance';

const modules = [
  tasksModule,
  // financeModule,  // Uncomment when ready
];

// Auto-register all module routes
modules.forEach(module => {
  app.use(`/api/${module.name}`, module.routes);
});

// Build combined intent router
const intentRouter = buildIntentRouter(modules);
```

---

## 6. PoC Development Phases (Detailed)

> **Reference:** Full implementation details in `poc-development-plan.md`

---

### Phase 1: Project Scaffold

**Goal:** Set up monorepo structure with all configuration files

**Deliverable:** Empty but properly configured monorepo that builds without errors

#### Task List
| # | Task | Parallel Group | Status |
|---|------|----------------|--------|
| 1.1 | Initialize monorepo root (package.json with Bun workspaces, turbo.json) | A | ✅ |
| 1.2 | Create .gitignore and root tsconfig.json | A | ✅ |
| 1.3 | Create packages/core structure and config | B | ✅ |
| 1.4 | Create packages/api structure and config | B | ✅ |
| 1.5 | Create packages/web structure and config | B | ✅ |
| 1.6 | Run bun install and verify build | C | ✅ |
| 1.7 | Test API health endpoint | C | ✅ |
| 1.8 | Test web dev server | C | ✅ |

**Status:** ✅ COMPLETED - PR #1 merged

**Parallelization:** Tasks in Group B can run simultaneously (3 agents working on Core, API, Web packages)

---

### Phase 2: Database Setup

**Goal:** Set up PostgreSQL and Prisma with minimal PoC schema

**Deliverable:** Working database with tasks table, seeded with Inbox list

#### Task List
| # | Task | Parallel Group | Status |
|---|------|----------------|--------|
| 2.1 | Create docker-compose.yml (PostgreSQL + Ollama) | A | ✅ |
| 2.2 | Add Prisma dependencies to core package | A | ✅ |
| 2.3 | Create Prisma schema (List, Task models) | B | ✅ |
| 2.4 | Create seed script (Inbox list) | B | ✅ |
| 2.5 | Create environment files (.env) | A | ✅ |
| 2.6 | Export Prisma client from core package | B | ✅ |
| 2.7 | Start database and run migrations | C | ✅ |
| 2.8 | Run seed and verify with Prisma Studio | C | ✅ |

**Status:** ✅ COMPLETED - PR #2 merged

**Parallelization:** Group A (infrastructure) and Group B (code) can run in parallel

---

### Phase 3: API Endpoints

**Goal:** Create CRUD endpoints for tasks (without LLM)

**Deliverable:** Working REST API for task management

#### Sub-Phase 3A: Foundation
| # | Task | Parallel Group | Status |
|---|------|----------------|--------|
| 3A.1 | Update API package dependencies (zod) | A | ✅ |
| 3A.2 | Create API key auth middleware | A | ✅ |
| 3A.3 | Create task validation schemas (Zod) | A | ✅ |
| 3A.4 | Create API environment file | A | ✅ |

#### Sub-Phase 3B: Routes (can parallelize)
| # | Task | Parallel Group | Status |
|---|------|----------------|--------|
| 3B.1 | Create task routes (CRUD + toggle complete) | B | ✅ |
| 3B.2 | Create list routes (read-only for PoC) | B | ✅ |
| 3B.3 | Update server.ts with route registration | C | ✅ |
| 3B.4 | Add error handler middleware | C | ✅ |

#### Sub-Phase 3C: Verification
| # | Task | Parallel Group | Status |
|---|------|----------------|--------|
| 3C.1 | Test all task endpoints with curl | D | ✅ |
| 3C.2 | Test auth rejection (missing/wrong key) | D | ✅ |
| 3C.3 | Test validation errors | D | ✅ |
| 3C.4 | Test edge cases (not found, etc.) | D | ✅ |

**Status:** ✅ COMPLETED - PR #3 pending review

**Parallelization:**
- Sub-phase 3A completes first
- 3B.1 and 3B.2 can run in parallel (2 agents)
- 3C runs after 3B completes

---

### Phase 4: Frontend UI

**Goal:** Create minimal React UI for task management

**Deliverable:** Web interface to view, add, complete, and delete tasks

#### Sub-Phase 4A: Setup
| # | Task | Status |
|---|------|--------|
| 4A.1 | Verify web package dependencies | ✅ |
| 4A.2 | Create API client utility | ✅ |
| 4A.3 | Define TypeScript interfaces for Task/List | ✅ |

#### Sub-Phase 4B: Components (can parallelize)
| # | Task | Parallel Group | Status |
|---|------|----------------|--------|
| 4B.1 | Create TaskList component | A | ✅ |
| 4B.2 | Create AddTaskForm component | A | ✅ |
| 4B.3 | Create ErrorMessage component | A | ✅ |

#### Sub-Phase 4C: Integration
| # | Task | Status |
|---|------|--------|
| 4C.1 | Update App.tsx with state management | ✅ |
| 4C.2 | Wire up API calls (fetch, create, toggle, delete) | ✅ |
| 4C.3 | Add loading and error states | ✅ |
| 4C.4 | Test full UI flow | ✅ |

**Status:** ✅ COMPLETED

**Parallelization:** All three components in 4B can be built simultaneously (3 agents)

---

### Phase 5: LLM Integration

**Goal:** Integrate gpt-oss-20b for voice input parsing

**Deliverable:** Voice endpoint that parses text and creates tasks

#### Task List
| # | Task | Parallel Group | Status |
|---|------|----------------|--------|
| 5.1 | Start Ollama and pull gpt-oss-20b model | A | ✅ |
| 5.2 | Create LLM client service (prompt, parse, fallback) | B | ✅ |
| 5.3 | Create LLM health check function | B | ✅ |
| 5.4 | Create voice input endpoint (/api/voice) | C | ✅ |
| 5.5 | Register voice routes in server | C | ✅ |
| 5.6 | Update /health to include LLM status | C | ✅ |
| 5.7 | Test voice endpoint with various inputs | D | ✅ |
| 5.8 | Test fallback when LLM unavailable | D | ✅ |

**Parallelization:** 5.1 (model download) runs while 5.2-5.3 (code) are written

---

### Phase 6: iOS Shortcut Integration

**Goal:** Create iOS Shortcut for voice capture

**Deliverable:** Working shortcut triggered by Action Button

**Status:** ✅ COMPLETED

#### Task List
| # | Task | Status |
|---|------|--------|
| 6.1 | Verify API is accessible from phone (domain/IP) | ✅ |
| 6.2 | Create basic shortcut (Dictate → POST → Notify) | ✅ |
| 6.3 | Add error handling (If/Otherwise blocks) | ✅ |
| 6.4 | Add offline fallback (save to Reminders) | ✅ |
| 6.5 | Assign to Action Button (optional) | ✅ |
| 6.6 | Test with various voice inputs | ✅ |
| 6.7 | Test offline/error scenarios | ✅ |

**Deliverables:**
- Comprehensive setup guide: `docs/ios-shortcut-setup.md`
- API voice endpoint verified and tested
- Domain: `lifetracker.maverickapplications.com`

**Note:** iOS Shortcut creation is manual phone work. Follow `docs/ios-shortcut-setup.md` for step-by-step instructions.

---

### Phase 7: Integration Testing & Polish

**Goal:** Verify end-to-end flow, create dev tooling

**Deliverable:** Stable PoC ready for daily use

#### Sub-Phase 7A: End-to-End Testing
| # | Test Scenario | Status |
|---|--------------|--------|
| 7A.1 | Full voice flow (shortcut → API → web) | ☐ |
| 7A.2 | Manual web add | ☐ |
| 7A.3 | Complete task in web | ☐ |
| 7A.4 | Delete task | ☐ |
| 7A.5 | Multiple rapid adds | ☐ |
| 7A.6 | Server restart persistence | ☐ |
| 7A.7 | LLM restart recovery | ☐ |
| 7A.8 | Concurrent device access | ☐ |

#### Sub-Phase 7B: Performance Verification
| # | Metric | Target | Status |
|---|--------|--------|--------|
| 7B.1 | Voice → Notification latency | < 5 sec | ☐ |
| 7B.2 | Web page load | < 2 sec | ☐ |
| 7B.3 | API task creation | < 500ms | ☐ |
| 7B.4 | LLM parsing | < 3 sec | ☐ |

#### Sub-Phase 7C: Dev Tooling
| # | Task | Status |
|---|------|--------|
| 7C.1 | Create scripts/start-dev.sh | ☐ |
| 7C.2 | Create DEPLOYMENT.md | ☐ |
| 7C.3 | Final cleanup and documentation | ☐ |

---

### PoC Definition of Done

- [ ] Speak "Add buy milk" on iPhone → task appears in web UI within 5 seconds
- [ ] Can mark task complete in web UI
- [ ] Can delete task in web UI
- [ ] Can add task directly in web UI
- [ ] Tasks persist across server restarts
- [ ] System recovers gracefully when LLM unavailable
- [ ] Error messages are user-friendly

---

## 7. Post-PoC Phases

### Phase 8: Tasks MVP

**Goal:** Full Tasks module with all specified features

#### Scope
- [ ] Full task schema (lists, priority, due dates, tags)
- [ ] List CRUD with auto-creation
- [ ] JWT auth with refresh tokens
- [ ] Full LLM parsing (all task fields)
- [ ] Parse error handling + correction UI
- [ ] Offline queue for web app
- [ ] Responsive design (mobile-friendly)
- [ ] Mac Shortcut integration (mirror iOS flow)

### Phase 9: Polish + Second Module

**Goal:** Production-ready tasks + start next module

#### Scope
- [ ] PWA manifest + service worker
- [ ] Training examples collection
- [ ] Smart "Today" view
- [ ] Finance module OR Fitness module (user choice)
- [ ] Shared component library refinement

### Phase 10+: Expansion

- Additional modules (Shopping, Fitness, etc.)
- Recurring tasks
- Raspberry Pi dashboard
- Full PWA with push notifications

---

## 8. Tech Stack Finalization

| Layer | Technology | Notes |
|-------|------------|-------|
| **Runtime/Package Manager** | Bun | All-in-one JS runtime, fastest package installs, native TS |
| **Monorepo** | Bun Workspaces + Turborepo | Fast builds, efficient caching |
| **Language** | TypeScript (strict) | Full type safety, native Bun support |
| **Backend** | Fastify (on Bun) | 5% faster on Bun than Node, great TS support |
| **Database** | PostgreSQL | Robust, relational |
| **ORM** | Prisma | Type-safe, great migrations, official Bun support |
| **Frontend** | React 18 + Vite | Fast builds, modern React (keep Vite for HMR) |
| **State** | Zustand | Simple, minimal boilerplate |
| **Styling** | Tailwind CSS | Utility-first, rapid development |
| **LLM** | gpt-oss-20b via Ollama | Local hosting, good performance |
| **Auth** | Custom JWT + API keys | Simple, no external dependencies |

---

## 9. Critical Files to Create (PoC)

1. `package.json` - Monorepo root (includes Bun workspaces config)
2. `turbo.json` - Build pipeline
3. `bunfig.toml` - Bun configuration (optional)
4. `packages/core/prisma/schema.prisma` - Database schema
5. `packages/api/src/server.ts` - API entry point
6. `packages/api/src/routes/tasks.ts` - Task endpoints
7. `packages/web/src/App.tsx` - React entry
8. `packages/web/src/components/TaskList.tsx` - Task UI
9. `docker-compose.yml` - PostgreSQL + Ollama
10. `ios-shortcut-export.shortcut` - iOS Shortcut template

> **Note:** Bun uses `workspaces` field in package.json instead of separate workspace config file.

---

## 10. Open Questions (Resolved)

| Question | Answer |
|----------|--------|
| Database location | Same home server as API |
| Domain/URL | `lifetracker.maverickapplications.com` |
| LLM hosting | Needs setup (Ollama + gpt-oss-20b) |
| Mac integration | macOS Shortcuts (note Raycast/Alfred as alternatives) |
| Priority for second module | TBD after Tasks MVP |

---

## 11. Items Needing Future Review

> **Note:** These items are documented but may need replanning when we reach them in development.

| Item | Status | Notes |
|------|--------|-------|
| **Offline Queue (Web)** | Planned but not detailed | IndexedDB + sync logic needs detailed implementation plan when we reach MVP phase |
| **JWT Auth Flow** | Deferred to MVP | PoC uses API key only; full JWT + refresh token flow needs detailed design |
| **Training Examples UI** | Conceptual only | "Teach the System" correction modal needs UI/UX design |
| **PWA Service Worker** | Future phase | Background Sync API implementation not planned yet |
| **macOS Shortcut** | Noted as alternative | Mirrors iOS but not detailed; Raycast/Alfred alternatives not explored |
| **Second Module Selection** | TBD | Finance vs Fitness vs Shopping - decision deferred |
| **Recurring Tasks** | Deferred | High priority for MVP but no schema/logic designed yet |
| **Multi-item NLP Parsing** | Deferred | "Add milk and eggs" → two tasks; LLM prompt not designed |
| **Raspberry Pi Dashboard** | Future | No implementation plan |

### Bun-Specific Items to Verify During Implementation

| Item | Concern | Resolution |
|------|---------|------------|
| Prisma + Bun | Works but verify `--bun` flag behavior | Test `bunx prisma generate` and migrations |
| Fastify + Bun | Works (5% faster) but verify all plugins | Test @fastify/cors compatibility |
| Vite + Bun | Using Vite for frontend (not Bun's bundler) | Keep this approach for better React HMR |
| Turborepo + Bun | Should work; uses Bun as package manager | Verify turbo commands work with bun |
