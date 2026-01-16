# Voice Bridge Development Plan

Personal voice AI system using self-hosted applications for task management, finance tracking, and fitness logging.

## Vision

**One button. Your voice. Your servers. Your data.**

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│     "Add milk to shopping"     "Spent 50 on groceries"          │
│     "Log bench press 135x10"   "What's on my work list?"        │
│                                                                  │
│                         iPhone Action Button                     │
│                                ↓                                 │
│                          iOS Shortcut                            │
│                                ↓                                 │
│                        Voice Bridge API                          │
│                                ↓                                 │
│                         Self-Hosted LLM                          │
│                                ↓                                 │
│              ┌─────────────────┼─────────────────┐              │
│              ↓                 ↓                 ↓              │
│          ┌───────┐       ┌──────────┐       ┌───────┐          │
│          │ Plane │       │ Firefly  │       │ wger  │          │
│          │ Tasks │       │ Finance  │       │Fitness│          │
│          └───────┘       └──────────┘       └───────┘          │
│                                                                  │
│                    All self-hosted. All yours.                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Core Services

| Service | Purpose | Self-Hosted | API | Mobile App |
|---------|---------|-------------|-----|------------|
| **Plane** | Tasks, projects, lists | Docker | REST + API Key | Web (PWA) |
| **Firefly III** | Expenses, budgets, accounts | Docker | REST + Bearer Token | Web + 3rd party |
| **wger** | Workouts, exercises, weight | Docker | REST + JWT | Official iOS/Android |

## Why This Stack?

1. **Complete data ownership** - Everything runs on your servers
2. **No subscriptions** - One-time setup, zero recurring costs
3. **Full-featured UIs** - Don't reinvent the wheel for viewing/editing
4. **Proven APIs** - All three have mature, documented REST APIs
5. **Extensible** - Add more services later (Home Assistant, notes, etc.)
6. **Siri coexistence** - Action Button for your AI, Siri for Apple stuff

---

## Service Specifications

### 1. Plane (Task Management)

**URL**: `https://plane.yourdomain.com`

**Capabilities**:
- Workspaces (one per user/context)
- Projects (your "lists": Shopping, Work, Home, etc.)
- Work Items (tasks with priority, due dates, labels)
- Cycles (sprints, if you want time-boxing)
- Modules (group related tasks)

**API Authentication**:
```
Header: X-API-Key: plane_api_xxxxx
```

**Key Endpoints**:
```
POST   /api/v1/workspaces/{slug}/projects/{id}/work-items/   Create task
GET    /api/v1/workspaces/{slug}/projects/{id}/work-items/   List tasks
PATCH  /api/v1/workspaces/{slug}/projects/{id}/work-items/{id}/  Update task
DELETE /api/v1/workspaces/{slug}/projects/{id}/work-items/{id}/  Delete task
```

**Voice Commands**:
| Say | Action |
|-----|--------|
| "Add milk to shopping" | Create work item in Shopping project |
| "Add fix login bug to work p1" | Create high-priority work item in Work project |
| "Mark buy milk as done" | Complete work item |
| "What's on my shopping list?" | List work items in Shopping project |

**Project Mapping** (spoken → Plane project slug):
```
shopping, groceries, shop     → shopping
work, office                  → work
home, house, chores           → home
personal                      → personal
inbox (default)               → inbox
```

---

### 2. Firefly III (Finance Tracking)

**URL**: `https://firefly.yourdomain.com`

**Capabilities**:
- Accounts (checking, savings, credit cards, cash)
- Transactions (withdrawals, deposits, transfers)
- Categories (groceries, dining, transport, etc.)
- Budgets (monthly spending limits per category)
- Tags (for cross-category grouping)
- Recurring transactions (subscriptions, bills)
- Reports and insights

**API Authentication**:
```
Header: Authorization: Bearer ff_pat_xxxxx
```

**Key Endpoints**:
```
POST   /api/v1/transactions          Create transaction
GET    /api/v1/transactions          List transactions
GET    /api/v1/accounts              List accounts
GET    /api/v1/categories            List categories
GET    /api/v1/budgets               List budgets
GET    /api/v1/summary/basic         Get spending summary
```

**Transaction Payload**:
```json
{
  "error_if_duplicate_hash": false,
  "apply_rules": true,
  "transactions": [{
    "type": "withdrawal",
    "date": "2025-01-15",
    "amount": "45.00",
    "description": "Grocery run",
    "source_name": "Checking",
    "destination_name": "Grocery Store",
    "category_name": "Groceries"
  }]
}
```

**Voice Commands**:
| Say | Action |
|-----|--------|
| "Spent 45 dollars on groceries" | Create withdrawal, category: Groceries |
| "Spent 12.50 on lunch" | Create withdrawal, category: Dining |
| "Got paid 3000" | Create deposit |
| "Transferred 500 to savings" | Create transfer |
| "How much did I spend on food this month?" | Query transactions |
| "What's my budget for dining?" | Query budget |

**Category Mapping** (spoken → Firefly category):
```
groceries, food, grocery store  → Groceries
lunch, dinner, coffee, eating   → Dining Out
gas, uber, lyft, transit        → Transportation
amazon, online                  → Shopping
rent, utilities, electric       → Bills
```

**Amount Parsing**:
```
"fifty dollars"         → 50.00
"12 fifty" / "12.50"    → 12.50
"twenty bucks"          → 20.00
"about 30"              → 30.00
```

---

### 3. wger (Fitness Tracking)

**URL**: `https://wger.yourdomain.com`

**Capabilities**:
- Workout templates (routines you repeat)
- Workout sessions (actual logged workouts)
- Exercise library (800+ exercises with muscles, equipment)
- Weight tracking (body weight over time)
- Nutrition tracking (optional: calories, macros)
- REST periods, supersets

**API Authentication**:
```
# Get token
POST /api/v2/token { "username": "...", "password": "..." }

# Use token
Header: Authorization: Bearer eyJxxx...
```

**Key Endpoints**:
```
POST   /api/v2/workout/             Create workout session
POST   /api/v2/set/                 Log a set
GET    /api/v2/exercise/            List exercises
POST   /api/v2/weightentry/         Log body weight
GET    /api/v2/workout/             List workouts
```

**Set Payload**:
```json
{
  "exercisebase": 192,
  "reps": 10,
  "weight": "135",
  "weight_unit": 1,
  "rir": "2"
}
```

**Voice Commands**:
| Say | Action |
|-----|--------|
| "Log bench press 135 for 10" | Create set: exercise=bench, weight=135, reps=10 |
| "Did 3 sets of squats 185 for 8" | Create 3 sets |
| "Weight is 180 pounds" | Log body weight |
| "Did 30 minutes of cardio" | Log cardio session |
| "Start push day workout" | Start workout from template |

**Exercise Mapping** (spoken → wger exercise ID):
```
bench, bench press              → 192 (Bench Press)
squat, squats                   → 111 (Squat)
deadlift                        → 105 (Deadlift)
pullup, pullups, pull up        → 107 (Pull Up)
row, barbell row                → 110 (Bent Over Row)
ohp, overhead press, shoulder   → 119 (Military Press)
curl, curls, bicep              → 81 (Bicep Curl)
```

---

## Voice Bridge Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                       Voice Bridge API                           │
│                       (Bun + Fastify)                            │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    POST /voice                           │   │
│  │                                                          │   │
│  │  1. Receive transcribed text                             │   │
│  │  2. Send to LLM for intent classification                │   │
│  │  3. Route to appropriate service adapter                 │   │
│  │  4. Return unified response                              │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    LLM Parser                            │   │
│  │                    (Ollama)                              │   │
│  │                                                          │   │
│  │  Input:  "spent 45 on groceries"                         │   │
│  │  Output: {                                               │   │
│  │    service: "firefly",                                   │   │
│  │    action: "create_transaction",                         │   │
│  │    data: { amount: 45, category: "Groceries" }           │   │
│  │  }                                                       │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│         ┌────────────────────┼────────────────────┐             │
│         ▼                    ▼                    ▼             │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│  │   Plane     │     │  Firefly    │     │    wger     │       │
│  │   Adapter   │     │   Adapter   │     │   Adapter   │       │
│  └─────────────┘     └─────────────┘     └─────────────┘       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Project Structure

```
voice-bridge/
├── src/
│   ├── index.ts                 # Entry point
│   ├── server.ts                # Fastify setup
│   ├── config/
│   │   ├── index.ts             # Environment variables
│   │   ├── services.ts          # Service URLs and keys
│   │   └── mappings/
│   │       ├── projects.ts      # Plane project mappings
│   │       ├── categories.ts    # Firefly category mappings
│   │       └── exercises.ts     # wger exercise mappings
│   ├── routes/
│   │   ├── voice.ts             # POST /voice
│   │   ├── health.ts            # GET /health
│   │   └── services.ts          # GET /services
│   ├── services/
│   │   ├── llm/
│   │   │   ├── index.ts         # LLM client
│   │   │   ├── parser.ts        # Intent parsing
│   │   │   └── prompts.ts       # System prompts
│   │   ├── router.ts            # Intent → Adapter routing
│   │   └── adapters/
│   │       ├── types.ts         # Adapter interface
│   │       ├── plane.ts         # Plane API adapter
│   │       ├── firefly.ts       # Firefly III adapter
│   │       └── wger.ts          # wger adapter
│   └── types/
│       └── index.ts             # Shared types
├── test/
│   ├── parser.test.ts           # LLM parsing tests
│   └── adapters/
│       ├── plane.test.ts
│       ├── firefly.test.ts
│       └── wger.test.ts
├── .env.example
├── Dockerfile
├── docker-compose.yml
└── package.json
```

---

## Development Phases

### Phase 0: Infrastructure Setup
**Goal**: Get all three services running and accessible

| Task | Details |
|------|---------|
| 0.1 | Deploy Plane via Docker, create workspace and projects |
| 0.2 | Deploy Firefly III via Docker, create accounts and categories |
| 0.3 | Deploy wger via Docker, configure exercise preferences |
| 0.4 | Configure Traefik for HTTPS routing to all services |
| 0.5 | Generate API keys/tokens for each service |
| 0.6 | Verify all APIs accessible via curl |

**Deliverable**: Three running services with working APIs

---

### Phase 1: Voice Bridge Scaffold
**Goal**: Basic API structure with health checks

| Task | Details |
|------|---------|
| 1.1 | Initialize Bun project with TypeScript |
| 1.2 | Set up Fastify with CORS and error handling |
| 1.3 | Create `/health` endpoint |
| 1.4 | Create `/services` endpoint (returns available services) |
| 1.5 | Set up environment config with validation |
| 1.6 | Add Docker and docker-compose configuration |

**Deliverable**: Running API skeleton

---

### Phase 2: LLM Integration
**Goal**: Parse voice input into structured intents

| Task | Details |
|------|---------|
| 2.1 | Create Ollama client wrapper |
| 2.2 | Design system prompt for intent classification |
| 2.3 | Implement intent parser with typed output |
| 2.4 | Add confidence scoring |
| 2.5 | Handle ambiguous/unknown intents gracefully |
| 2.6 | Create test suite with example utterances |

**Intent Output Schema**:
```typescript
interface ParsedIntent {
  service: 'plane' | 'firefly' | 'wger' | 'unknown';
  action: string;
  confidence: number;
  data: Record<string, unknown>;
  rawInput: string;
}
```

**Deliverable**: Working LLM parser with tests

---

### Phase 3: Plane Adapter
**Goal**: Create and manage tasks via voice

| Task | Details |
|------|---------|
| 3.1 | Implement Plane API client |
| 3.2 | Create project name → ID resolver |
| 3.3 | Implement `create_task` action |
| 3.4 | Implement `complete_task` action |
| 3.5 | Implement `list_tasks` action |
| 3.6 | Add priority mapping (p1/p2/p3 → urgent/high/medium) |
| 3.7 | Add due date parsing ("tomorrow", "next friday") |
| 3.8 | Integration tests against real Plane instance |

**Voice Examples**:
```
"add buy milk to shopping"
  → POST /work-items { name: "Buy milk", project: "shopping" }

"add fix bug to work p1 due tomorrow"
  → POST /work-items { name: "Fix bug", project: "work", priority: "urgent", target_date: "2025-01-16" }
```

**Deliverable**: Working Plane integration

---

### Phase 4: Firefly Adapter
**Goal**: Log expenses and income via voice

| Task | Details |
|------|---------|
| 4.1 | Implement Firefly III API client |
| 4.2 | Create category name → ID resolver |
| 4.3 | Implement `create_transaction` (withdrawal) |
| 4.4 | Implement `create_transaction` (deposit) |
| 4.5 | Implement `create_transaction` (transfer) |
| 4.6 | Add amount parsing ("fifty dollars", "12.50") |
| 4.7 | Add account selection logic |
| 4.8 | Integration tests against real Firefly instance |

**Voice Examples**:
```
"spent 45 on groceries"
  → POST /transactions { type: "withdrawal", amount: 45, category: "Groceries" }

"got paid 3000"
  → POST /transactions { type: "deposit", amount: 3000, category: "Income" }
```

**Deliverable**: Working Firefly integration

---

### Phase 5: wger Adapter
**Goal**: Log workouts and body metrics via voice

| Task | Details |
|------|---------|
| 5.1 | Implement wger API client with JWT refresh |
| 5.2 | Create exercise name → ID resolver |
| 5.3 | Implement `log_set` action |
| 5.4 | Implement `log_weight` action |
| 5.5 | Implement `start_workout` action |
| 5.6 | Add rep/set/weight parsing ("3 sets of 10 at 135") |
| 5.7 | Add unit handling (lbs vs kg) |
| 5.8 | Integration tests against real wger instance |

**Voice Examples**:
```
"log bench press 135 for 10"
  → POST /set { exercise: 192, weight: 135, reps: 10 }

"weight is 180"
  → POST /weightentry { weight: 180 }
```

**Deliverable**: Working wger integration

---

### Phase 6: Voice Endpoint & Router
**Goal**: Unified endpoint that routes to correct service

| Task | Details |
|------|---------|
| 6.1 | Create `POST /voice` endpoint |
| 6.2 | Implement service router |
| 6.3 | Create unified response format |
| 6.4 | Add request validation (Zod) |
| 6.5 | Add rate limiting |
| 6.6 | Add request logging |
| 6.7 | End-to-end tests for all voice commands |

**Deliverable**: Complete Voice Bridge API

---

### Phase 7: iOS Shortcut
**Goal**: Action Button triggers voice assistant

| Task | Details |
|------|---------|
| 7.1 | Create iOS Shortcut with Dictation |
| 7.2 | Configure API call to Voice Bridge |
| 7.3 | Parse response and show notification |
| 7.4 | Add offline fallback (save to Notes) |
| 7.5 | Map to iPhone Action Button |
| 7.6 | Create setup documentation |

**Deliverable**: Working end-to-end flow

---

### Phase 8: Polish & Documentation
**Goal**: Production-ready deployment

| Task | Details |
|------|---------|
| 8.1 | Error handling audit |
| 8.2 | Add structured logging |
| 8.3 | Performance testing (<2s response time) |
| 8.4 | Security audit (input validation, rate limiting) |
| 8.5 | Write deployment documentation |
| 8.6 | Create user guide for voice commands |
| 8.7 | Docker compose for full stack |

**Deliverable**: Production-ready system

---

## LLM Prompt Design

### System Prompt

```
You are a voice command parser for a personal assistant. Parse the user's spoken command and return structured JSON.

## Available Services

### plane (Task Management)
Actions: create_task, complete_task, list_tasks
Projects: shopping, work, home, personal, inbox
Priorities: p1/urgent/high → "urgent", p2/medium → "high", p3/low → "medium"

### firefly (Finance)
Actions: create_transaction, query_spending
Transaction types: withdrawal (spending), deposit (income), transfer
Categories: Groceries, Dining Out, Transportation, Shopping, Bills, Entertainment

### wger (Fitness)
Actions: log_set, log_weight, start_workout
Exercises: bench press, squat, deadlift, pullup, row, overhead press, curl

## Rules

1. Default service is "plane" if ambiguous
2. Default project is "inbox" if no list mentioned
3. Extract numbers for amounts, weights, reps
4. Parse dates naturally ("tomorrow" = next day, "friday" = next Friday)
5. Set confidence 0.0-1.0 based on certainty
6. If truly unclear, return service: "unknown"

## Output Format

{
  "service": "plane|firefly|wger|unknown",
  "action": "action_name",
  "confidence": 0.0-1.0,
  "data": { ... action-specific fields ... }
}

## Examples

Input: "add eggs to shopping list"
Output: {"service":"plane","action":"create_task","confidence":0.95,"data":{"title":"Eggs","project":"shopping"}}

Input: "spent 23 dollars on lunch"
Output: {"service":"firefly","action":"create_transaction","confidence":0.92,"data":{"type":"withdrawal","amount":23,"category":"Dining Out"}}

Input: "did squats 185 for 8 reps"
Output: {"service":"wger","action":"log_set","confidence":0.90,"data":{"exercise":"squat","weight":185,"reps":8}}
```

---

## Environment Variables

```bash
# Voice Bridge
PORT=3000
API_KEY=your-voice-bridge-api-key
LOG_LEVEL=info

# LLM
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=gpt-oss:20b

# Plane
PLANE_URL=https://plane.yourdomain.com
PLANE_API_KEY=plane_api_xxxxx
PLANE_WORKSPACE=personal

# Firefly III
FIREFLY_URL=https://firefly.yourdomain.com
FIREFLY_TOKEN=ff_pat_xxxxx
FIREFLY_DEFAULT_ACCOUNT=Checking

# wger
WGER_URL=https://wger.yourdomain.com
WGER_USERNAME=your-username
WGER_PASSWORD=your-password
```

---

## Docker Compose (Full Stack)

```yaml
version: '3.8'

services:
  # Voice Bridge API
  voice-bridge:
    build: ./voice-bridge
    ports:
      - "3000:3000"
    environment:
      - OLLAMA_URL=http://ollama:11434
      - PLANE_URL=http://plane-api:8000
      - FIREFLY_URL=http://firefly:8080
      - WGER_URL=http://wger:8000
    depends_on:
      - ollama
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.voice.rule=Host(`voice.yourdomain.com`)"

  # LLM
  ollama:
    image: ollama/ollama
    volumes:
      - ollama_data:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - capabilities: [gpu]

  # Task Management
  plane-api:
    image: makeplane/plane-backend
    # ... plane configuration

  plane-web:
    image: makeplane/plane-frontend
    # ... plane configuration

  # Finance Tracking
  firefly:
    image: fireflyiii/core
    volumes:
      - firefly_upload:/var/www/html/storage/upload
    environment:
      - DB_CONNECTION=pgsql
      - DB_HOST=firefly-db
      # ... other config

  firefly-db:
    image: postgres:15
    volumes:
      - firefly_db:/var/lib/postgresql/data

  # Fitness Tracking
  wger:
    image: wger/server
    environment:
      - DJANGO_DB_ENGINE=django.db.backends.postgresql
      # ... other config

  wger-db:
    image: postgres:15
    volumes:
      - wger_db:/var/lib/postgresql/data

  # Reverse Proxy
  traefik:
    image: traefik:v3.0
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./traefik:/etc/traefik

volumes:
  ollama_data:
  firefly_upload:
  firefly_db:
  wger_db:
```

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Voice command → response | < 3 seconds |
| Intent parsing accuracy | > 90% |
| Offline fallback | 100% reliability |
| API uptime | 99.9% |
| Supported voice commands | 20+ patterns |

---

## Future Expansions

| Service | Purpose | Voice Commands |
|---------|---------|----------------|
| Home Assistant | Smart home | "Turn on office lights" |
| Paperless-ngx | Documents | "Save receipt to taxes" |
| Mealie | Recipes | "Add lasagna to meal plan" |
| Linkwarden | Bookmarks | "Save this link for later" |
| Actual Budget | Alternative finance | (if Firefly doesn't fit) |

The adapter pattern makes adding new services straightforward: create adapter, add to router, update LLM prompt.
