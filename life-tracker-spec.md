# Life Tracker — Project Specification

## Overview

Life Tracker is a personal productivity application designed to make tracking daily life easy and intuitive. The core differentiator is **natural language input** via voice, processed through a self-hosted LLM, enabling rapid capture of tasks, expenses, workouts, and more.

---

## Core Philosophy

**Flexibility vs Structure**: The app must be customizable enough to track anything, yet structured enough for specialized modules to provide intelligent features (PR tracking, macro calculation, etc.).

**Solution**: A hybrid approach with a flexible base layer and specialized "smart modules" that inherit from it.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Input Layer                          │
│      (iPhone Shortcut → iOS STT → Text to Server)       │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                 n8n Orchestration                        │
│   (Routes parsed intent to appropriate module/action)    │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│              Self-Hosted LLM (gpt-oss-20b)               │
│                  Intent Classification                   │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                  Life Tracker API                        │
│              (TypeScript / Node.js)                      │
├─────────┬─────────┬─────────┬─────────┬────────────────┤
│  Tasks  │ Finance │ Fitness │Shopping │ Future Modules  │
└─────────┴─────────┴─────────┴─────────┴────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                     PostgreSQL                           │
│         (Separate tables per module, Option B)           │
└─────────────────────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│              Output/Display Layer                        │
│      (React + Vite Web App → Web Clip → PWA later)       │
└─────────────────────────────────────────────────────────┘
```

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
3. Indicate what part of the input could not be parsed (when possible)
4. User can manually modify/categorize it later

### Module-Specific Parsing

See individual module specs for detailed extraction rules:
- **Tasks**: `tasks-module-spec.md` — extracts title, list, priority, due date, tags

### Deferred Features

- **Context awareness**: Time of day, recent actions, defaults — explore later
- **Multi-item parsing**: "Add milk and eggs" → two separate items

---

## iPhone Integration

### Shortcut Flow (Using Built-in STT)

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
[Send to n8n webhook as JSON payload]
       │
       ▼
[n8n: Call LLM for intent parsing]
       │
       ▼
[n8n: Route to Life Tracker API endpoint]
       │
       ▼
[n8n: Return response]
       │
       ▼
[iOS Shortcut: Show Notification with result]
```

**Key Decision**: Use iPhone's on-device "Dictate Text" action rather than self-hosted Whisper. Simpler, no audio files to manage.

### Deferred Features

- **Query mode vs log mode**: Short press for quick log, long press for queries — explore when implementing

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Language** | TypeScript | Known, excellent DX, type safety |
| **Backend** | Node.js (Express or Fastify) | Simple, fast, TypeScript native |
| **Database** | PostgreSQL | Robust, relational, good for structured data |
| **ORM** | Prisma | Type-safe, great DX, easy migrations |
| **Frontend** | React + Vite | Industry standard, component-based, fast builds |
| **LLM** | Self-hosted gpt-oss-20b | Privacy, no API costs, local control |
| **Orchestration** | n8n | Already in Stephen's infrastructure |
| **Auth** | Simple token/password | Single user MVP |
| **Mobile** | Web clip initially | Responsive web app, upgrade to PWA later |

### Data Model Approach

**Option B: Separate Tables with Shared Interface**

Each module has dedicated tables with proper typing, constraints, and relationships. A generic `custom_entries` table can be added later for arbitrary future modules.

Rationale:
- Fitness benefits from relational structure (workouts → movements → PRs)
- Finance needs proper decimal handling, category foreign keys
- Tasks need list relationships, recurring task logic
- Strong typing at the database level catches bugs early

---

## Raspberry Pi Dashboard (Future)

**Potential Features**:
- Morning briefing: Today's tasks, calendar, weather, overdue alerts
- Fitness widget: Current streak, week's workouts, upcoming benchmark
- Financial snapshot: Spending this week vs budget
- Touch actions: Mark task complete, quick log buttons

**Implementation**: Explore options when we reach this phase (Electron, Chromium kiosk, etc.)

---

## Development Plan

### Build Order

```
1. Define module purpose and scope
           │
           ▼
2. List user stories / use cases
           │
           ▼
3. Identify entities and relationships
           │
           ▼
4. Design data model
           │
           ▼
5. Build API (CRUD endpoints)
           │
           ▼
6. Build Frontend (UI to view/edit)
           │
           ▼
7. Build LLM intent parser + n8n workflow
           │
           ▼
8. Build iPhone Shortcut integration
           │
           ▼
9. Iterate, then repeat for next module
```

### MVP Scope

Single module (Tasks) built end-to-end. Learn patterns, then apply to subsequent modules.

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

---

## Current Status

**Phase**: Tasks module — ready for implementation

**Completed**:
- [x] Project architecture defined
- [x] Tech stack selected
- [x] MVP scope defined (Tasks module first)
- [x] Tasks module requirements complete (see `tasks-module-spec.md`)

**Next Steps**:
1. Design Prisma schema for Tasks module
2. Define API endpoints
3. Design LLM prompt for intent parsing
4. Set up project scaffold

---

## Related Documents

| Document | Description |
|----------|-------------|
| `tasks-module-spec.md` | Full specification for Tasks module including all decisions, entities, and deferred items |
