# Life Tracker — Project Specification

## Overview

Life Tracker is a personal productivity application designed to make tracking daily life easy and intuitive. The core differentiator is **natural language input** via voice, processed through a self-hosted LLM, enabling rapid capture of tasks, expenses, workouts, and more.

**Domain:** `life.maverickapplications.com`

---

## Core Philosophy

**Flexibility vs Structure**: The app must be customizable enough to track anything, yet structured enough for specialized modules to provide intelligent features (PR tracking, macro calculation, etc.).

**Solution**: A hybrid approach with a flexible base layer and specialized "smart modules" that inherit from it.

**Modular Design**: Each module is self-contained with its own API routes, UI components, and LLM parsing logic. Adding new modules should be straightforward.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Input Layer                               │
│   ┌─────────────────┐    ┌─────────────────┐                │
│   │ iPhone Shortcut │    │  macOS Shortcut │                │
│   │  (iOS STT)      │    │   (macOS STT)   │                │
│   └────────┬────────┘    └────────┬────────┘                │
│            │                      │                          │
│            └──────────┬───────────┘                          │
│                       ▼                                      │
│              HTTPS POST to API                               │
│         (X-API-Key authentication)                           │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                  Life Tracker API                            │
│               (Fastify / TypeScript)                         │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Intent Router                           │    │
│  │   Calls LLM → Classifies intent → Routes to module  │    │
│  └─────────────────────────────────────────────────────┘    │
│                        │                                     │
│  ┌─────────┬───────────┼───────────┬─────────┐              │
│  │  Tasks  │  Finance  │  Fitness  │Shopping │  (modules)   │
│  └─────────┴───────────┴───────────┴─────────┘              │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│              Self-Hosted LLM (gpt-oss-20b)                   │
│                   via Ollama                                 │
│          Intent Classification + Entity Extraction           │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                     PostgreSQL                               │
│         (Separate tables per module, Option B)               │
│              Host: localhost (same server)                   │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│              Output/Display Layer                            │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              React + Vite Web App                    │    │
│  │     • Responsive (mobile + desktop)                  │    │
│  │     • Web clip → PWA upgrade path                    │    │
│  │     • Offline queue with IndexedDB                   │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## Authentication Strategy

### Overview

Single-user self-hosted application with two auth mechanisms:

| Context | Method | Details |
|---------|--------|---------|
| **iOS/macOS Shortcuts** | API Key | Long-lived UUID, sent as `X-API-Key` header |
| **Web Application** | JWT + Refresh Token | Access token (15min) + Refresh token (7 days) |

### API Key Authentication (Shortcuts)

- UUID generated on first setup, stored in environment
- Sent in `X-API-Key` header with every request
- Can be revoked/regenerated from web UI
- Stored securely in Shortcut variables

### JWT Authentication (Web)

```
Login (username/password)
        │
        ▼
Server validates credentials (bcrypt, cost factor 12)
        │
        ▼
Returns: { accessToken (15min), refreshToken (7 days) }
        │
        ▼
Tokens stored in httpOnly, Secure, SameSite=Strict cookies
        │
        ▼
API requests include Authorization: Bearer <accessToken>
        │
        ▼
Token expired? → Auto-refresh using refreshToken
```

### Security Measures

- Rate limiting: 5 failed login attempts → 15-minute lockout
- Refresh tokens stored in database (can be revoked)
- Access tokens signed with RS256
- HTTPS required for all connections

### PoC Simplification

- API key only (single key in environment variable)
- No JWT complexity until MVP phase

---

## Offline Resilience Strategy

### Problem

Network failures shouldn't lose user input. iOS Shortcuts have limited offline capabilities.

### Solution: Hybrid Queue Strategy

#### iOS/macOS Shortcut Flow
```
Voice input captured
        │
        ▼
Shortcut attempts POST to API (3-second timeout)
        │
        ├── SUCCESS → Show success notification
        │
        └── FAILURE →
                │
                ├── Show "Server unavailable" notification
                │
                └── Save to iOS Reminders with "[PENDING] " prefix
                    (User manually processes when online)
```

#### Web App Flow (MVP)
```
User creates/modifies task
        │
        ├── ONLINE → POST immediately
        │
        └── OFFLINE →
                │
                ├── Store in IndexedDB (status: "pending_sync")
                │
                ├── Show in UI with sync indicator (⏳)
                │
                └── Register for online event
                        │
                        ▼
                When online: Process queue → Update status → Show (✓)
```

#### PWA Phase (Future)
- Service worker with Background Sync API
- Works automatically on Android/Chrome
- Graceful fallback for iOS (sync on app foreground)

### Data Model
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

---

## Error Feedback Loop: "Teach the System"

### Purpose

When LLM parsing fails or partially succeeds, users can correct errors. Corrections are saved and used to improve future parsing.

### User Flow
```
┌─────────────────────────────────────────────────────────────┐
│  1. User says: "Add get milk and bread to groceries"        │
│                                                              │
│  2. LLM parses (incorrectly):                               │
│     { title: "get milk and bread", list: "groceries" }      │
│     (Should have been two separate tasks)                    │
│                                                              │
│  3. Task created with parse_warning flag set                │
│                                                              │
│  4. Web UI shows warning badge (⚠️) on task                 │
│     Tooltip: "We parsed this as one task. Correct?"         │
│                                                              │
│  5. User clicks badge → Correction Modal opens:             │
│     ┌─────────────────────────────────────────────────┐     │
│     │  Original Input:                                 │     │
│     │  "Add get milk and bread to groceries"          │     │
│     │                                                  │     │
│     │  We Parsed:                                      │     │
│     │  • Title: "get milk and bread"                  │     │
│     │  • List: Groceries                              │     │
│     │                                                  │     │
│     │  Actions:                                        │     │
│     │  [✓ Correct] [✏️ Edit] [📋 Split] [🗑️ Delete]   │     │
│     └─────────────────────────────────────────────────┘     │
│                                                              │
│  6. Correction saved to training_examples table             │
│                                                              │
│  7. Training examples used to:                              │
│     • Improve prompt engineering (few-shot examples)        │
│     • Fine-tune model (future)                              │
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

### Implementation Phases

| Phase | Scope |
|-------|-------|
| PoC | Store raw_input on tasks, no correction UI |
| MVP | Warning badge + correction modal + save to training_examples |
| Future | Use corrections as few-shot examples, fine-tuning pipeline |

---

## Modules

### MVP Module

**Tasks/Todos** — Requirements complete, ready for implementation. See `tasks-module-spec.md` for full details.

### Planned Modules (Post-MVP)

| Module | Description | Key Features |
|--------|-------------|--------------|
| **Financial Tracking** | Track spending, categorize expenses | Quick entry, categories, budgets |
| **Fitness (CrossFit)** | Log workouts, track PRs | WOD types (AMRAP, EMOM, For Time), movement library, PR tracking |
| **Shopping Lists** | Multiple lists for various purposes | Groceries, project supplies, general shopping; quantities, checkboxes |

### Future Modules (Backlog)

| Module | Description | Notes |
|--------|-------------|-------|
| **Nutrition/Diet** | Track meals, calculate macros | Requires nutrition database API (USDA, Open Food Facts) — LLM cannot reliably generate macros |
| **Social/Relationships** | Contact frequency reminders | Last interaction tracking, birthday reminders, relationship notes |
| **Home Management** | Recurring chores, maintenance logs | Room-based organization, seasonal tasks, inventory tracking |
| **Custom Modules** | User-defined entity types | For arbitrary tracking (school courses, etc.) |

---

## Module Details

### Tasks/Todos (MVP) — See `tasks-module-spec.md` for full details

**Purpose**: Capture, organize, and complete tasks — optimized for fast input via voice/natural language.

**Status**: Requirements complete, ready for implementation

**Key Decisions**:
- Hybrid lists: Protected Inbox (system) + unlimited user-created lists
- 3-level optional priority (High/Medium/Low)
- Due dates only (reminders deferred)
- Flat tasks (subtasks deferred)
- Freeform tags for cross-list filtering
- Title + plain text notes
- LLM extracts: title, list, priority, due date, tags
- Auto-create lists when referenced list doesn't exist
- Smart completion visibility (today's completions shown, older auto-hidden, toggle available)

**Entities**: Task, List, Tag, TaskTag (join table)

**Deferred for Tasks Module**:
- Recurring tasks (high priority)
- Manual drag-drop ordering (medium)
- Multi-item NLP parsing (medium)
- Reminders, rich text notes, subtasks (lower)

### Financial Tracking

**Features**:
- Quick expense entry: "Spent $45 at Costco groceries"
- Category auto-suggestion based on merchant/keywords
- Recurring expenses (rent, subscriptions)
- Budget envelopes per category
- Cash flow visualization

**Future**: Bank sync via Plaid or CSV import

### Fitness (CrossFit-Tailored)

**Features**:
- WOD types: AMRAP, EMOM, For Time, Chipper, Hero WODs, benchmarks
- Movement library with standards (rx weights, scaling options)
- Quick logging: "Fran 4:32 rx" should just work
- PR tracking per movement (1RM, max reps, fastest time)
- Volume tracking (total tonnage per week/month)
- Benchmark history over time
- Perceived exertion (RPE) and notes

**Not Included**: WOD generator (tracking only)

### Shopping Lists

**Features**:
- Multiple named lists (Groceries, Hardware Store, Project X Supplies, General)
- Items with optional quantities
- Checkboxes for marking purchased
- Easy add via voice: "Add milk to groceries", "Add 2x4 lumber to shed project list"

---

## Natural Language Interface

### Intent Classification

The LLM parses user input and classifies intent + extracts entities. Each module defines its own extraction rules.

| Example Input | Module | Action |
|---------------|--------|--------|
| "Add buy milk to groceries" | Tasks | create task |
| "Spent $45 at Costco" | Finance | create expense |
| "Log 225 back squat for 5" | Fitness | log workout |
| "What's on my list today?" | Tasks | query |

### Fallback Behavior

If a command cannot be properly classified:
1. Add the raw request to the **Inbox** (for Tasks) or appropriate default location
2. Notify the user that it was not properly processed
3. Flag the task with `parse_warning` for correction UI
4. Indicate what part of the input could not be parsed (when possible)
5. User can manually modify/categorize it later via "Teach the System" flow

### Module-Specific Parsing

See individual module specs for detailed extraction rules:
- **Tasks**: `tasks-module-spec.md` — extracts title, list, priority, due date, tags

### Deferred Features

- **Context awareness**: Time of day, recent actions, defaults — explore later
- **Multi-item parsing**: "Add milk and eggs" → two separate items

---

## Input Methods

### iPhone Integration

**Shortcut Flow (Using Built-in STT)**
```
[Action Button Press]
       │
       ▼
[iOS Shortcut: "Dictate Text" action]
       │
       ▼
[Returns transcribed text string]
       │
       ▼
[POST to https://life.maverickapplications.com/api/voice]
[Header: X-API-Key: <api_key>]
[Body: { "input": "<transcribed_text>" }]
       │
       ├── SUCCESS → Show notification: "✓ <task_title> added"
       │
       └── FAILURE → Show notification: "Server unavailable"
                     Save to Reminders: "[PENDING] <text>"
```

**Key Decision**: Use iPhone's on-device "Dictate Text" action rather than self-hosted Whisper. Simpler, no audio files to manage.

### macOS Integration

**Primary**: macOS Shortcuts app (mirrors iOS flow)
- Keyboard shortcut trigger (e.g., ⌘⇧Space)
- Uses macOS dictation
- Same API endpoint and flow as iOS

**Alternatives to Investigate Later**:
- Raycast extension (popular launcher with voice support)
- Alfred workflow (powerful automation)
- Custom menu bar app (always accessible)

### Deferred Features

- **Query mode vs log mode**: Short press for quick log, long press for queries — explore when implementing

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Monorepo** | pnpm + Turborepo | Fast builds, efficient dependency management |
| **Language** | TypeScript (strict mode) | Type safety, excellent DX |
| **Backend** | Fastify | Faster than Express, better TypeScript support, schema validation |
| **Database** | PostgreSQL | Robust, relational, good for structured data |
| **ORM** | Prisma | Type-safe, great DX, easy migrations |
| **Frontend** | React 18 + Vite | Industry standard, component-based, fast builds |
| **State** | Zustand | Simple, minimal boilerplate, good TypeScript support |
| **Styling** | Tailwind CSS | Utility-first, rapid development, responsive design |
| **LLM** | gpt-oss-20b via Ollama | Privacy, no API costs, local control, 16GB memory requirement |
| **Auth** | Custom JWT + API keys | Simple, no external dependencies |
| **Hosting** | Local home server | Full control, no recurring costs |

### Data Model Approach

**Option B: Separate Tables with Shared Interface**

Each module has dedicated tables with proper typing, constraints, and relationships. A generic `custom_entries` table can be added later for arbitrary future modules.

Rationale:
- Fitness benefits from relational structure (workouts → movements → PRs)
- Finance needs proper decimal handling, category foreign keys
- Tasks need list relationships, recurring task logic
- Strong typing at the database level catches bugs early

---

## Project Structure

```
lifetracker/
├── packages/
│   ├── core/                    # Shared utilities, auth, types
│   │   ├── src/
│   │   │   ├── auth/            # Authentication logic
│   │   │   ├── db/              # Prisma client, base models
│   │   │   ├── llm/             # LLM client, prompt utilities
│   │   │   ├── utils/           # Common utilities (listName, etc.)
│   │   │   └── types/           # Shared TypeScript types
│   │   └── package.json
│   │
│   ├── api/                     # Fastify API server
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
│   │   │   └── stores/          # Zustand stores
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
│   └── schema.prisma            # Combined schema
│
├── docker-compose.yml           # PostgreSQL + Ollama
├── package.json                 # Monorepo root
├── pnpm-workspace.yaml          # Workspace config
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

  // LLM intent patterns for routing
  intents: [
    { pattern: /add|create|new.*task/i, action: 'create_task' },
    { pattern: /complete|done|finish/i, action: 'complete_task' },
    { pattern: /show|list|what.*tasks?/i, action: 'query_tasks' },
  ],

  // Module-specific LLM parsing
  parseIntent: async (input: string, llm: LLMClient) => {
    // Returns structured extraction
  },
};
```

---

## LLM Setup (gpt-oss-20b via Ollama)

### Prerequisites
- Home server with 16GB+ RAM (for gpt-oss-20b)
- Docker installed

### Installation
```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull gpt-oss-20b model
ollama pull gpt-oss:20b

# Verify installation
ollama run gpt-oss:20b "Hello, world"
```

### Docker Compose (Alternative)
```yaml
services:
  ollama:
    image: ollama/ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - capabilities: [gpu]  # If GPU available

volumes:
  ollama_data:
```

### API Usage
```typescript
// packages/core/src/llm/client.ts
const response = await fetch('http://localhost:11434/api/generate', {
  method: 'POST',
  body: JSON.stringify({
    model: 'gpt-oss:20b',
    prompt: buildPrompt(userInput),
    stream: false,
  }),
});
```

---

## Raspberry Pi Dashboard (Future)

**Potential Features**:
- Morning briefing: Today's tasks, calendar, weather, overdue alerts
- Fitness widget: Current streak, week's workouts, upcoming benchmark
- Financial snapshot: Spending this week vs budget
- Touch actions: Mark task complete, quick log buttons

**Implementation**: Explore options when we reach this phase (Electron, Chromium kiosk, etc.)

---

## Development Phases

### Phase 1: PoC — Validate Core Flow

**Goal**: Voice → Data → Display working end-to-end

**Scope**:
- [ ] Project scaffold (monorepo)
- [ ] PostgreSQL + Prisma (minimal tasks schema)
- [ ] Fastify API (4 endpoints: list, create, update, delete)
- [ ] Simple LLM parsing (title extraction only)
- [ ] Basic React UI (task list, add form, checkbox)
- [ ] iOS Shortcut setup
- [ ] API key auth (single key)

**Deliverable**: Speak "Add buy milk" → task appears in web UI → mark complete

### Phase 2: Tasks MVP — Full Module

**Goal**: Complete Tasks module per specification

**Scope**:
- [ ] Full schema (lists, priority, due dates, tags)
- [ ] List CRUD with auto-creation
- [ ] Full LLM parsing (all task fields)
- [ ] JWT auth for web
- [ ] Parse error handling + correction UI
- [ ] Offline queue for web
- [ ] Responsive design
- [ ] macOS Shortcut setup

### Phase 3: Polish + Second Module

**Goal**: Production-ready Tasks + begin next module

**Scope**:
- [ ] PWA manifest + service worker
- [ ] Training examples UI
- [ ] Smart "Today" view
- [ ] Begin second module (TBD: Finance, Fitness, or Shopping)

### Phase 4+: Expansion

- Additional modules
- Recurring tasks
- Raspberry Pi dashboard
- Push notifications

---

## Deferred / Notes for Later

- [ ] Query mode vs log mode (short press / long press on action button)
- [ ] Context awareness in LLM parsing (time of day, recent context, defaults)
- [ ] Raspberry Pi dashboard implementation
- [ ] Nutrition module with USDA API integration (LLM cannot reliably generate macros)
- [ ] Social/relationship reminders module
- [ ] Home maintenance tracking module
- [ ] Custom module builder
- [ ] Multi-user support
- [ ] PWA upgrade (manifest.json + service worker)
- [ ] Bank sync for finance module (Plaid or CSV import)
- [ ] Raycast / Alfred / menu bar app alternatives for macOS

---

## Current Status

**Phase**: Tasks module — ready for PoC implementation

**Completed**:
- [x] Project architecture defined
- [x] Tech stack selected
- [x] MVP scope defined (Tasks module first)
- [x] Tasks module requirements complete (see `tasks-module-spec.md`)
- [x] Authentication strategy defined
- [x] Offline resilience strategy defined
- [x] Error feedback loop designed
- [x] Modular architecture designed

**Next Steps**:
1. Set up monorepo scaffold
2. Configure PostgreSQL + Prisma
3. Set up Ollama + gpt-oss-20b
4. Build PoC API endpoints
5. Build basic React UI
6. Create iOS Shortcut

---

## Related Documents

| Document | Description |
|----------|-------------|
| `tasks-module-spec.md` | Full specification for Tasks module including all decisions, entities, and deferred items |
