# Voice Bridge Architecture

Personal voice AI layer for productivity tasks, designed to work alongside Siri.

## Vision

**Action Button → Your AI → Your Services**

```
┌─────────────────────────────────────────────────────────────────┐
│                        iPhone                                    │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │ Action Button│───▶│ iOS Shortcut │───▶│  Dictation   │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                                                 │                │
│         Siri remains for:                       │ Transcribed    │
│         • "Hey Siri, set a timer"               │ text           │
│         • Device control                        │                │
│         • Apple ecosystem                       ▼                │
└─────────────────────────────────────────────────────────────────┘
                                                  │
                                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Self-Hosted Infrastructure                    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Voice Bridge API                       │  │
│  │                    (Fastify on Bun)                       │  │
│  │                                                           │  │
│  │   POST /voice ─────▶ LLM Intent Parser ─────▶ Router     │  │
│  │                      (Ollama/gpt-oss)          │          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                   │              │
│                    ┌──────────────────────────────┼───────┐     │
│                    │              │               │       │     │
│                    ▼              ▼               ▼       ▼     │
│              ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│              │  Plane   │  │ Firefly  │  │   wger   │         │
│              │  (Tasks) │  │ (Finance)│  │ (Fitness)│         │
│              └──────────┘  └──────────┘  └──────────┘         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Core Principle: Siri Coexistence

| Trigger | Handler | Examples |
|---------|---------|----------|
| "Hey Siri" | Apple Siri | Timers, alarms, calls, texts, HomeKit, Apple apps |
| Action Button | Voice Bridge | Tasks, projects, expenses, workouts, notes |

This separation is intentional:
- Siri excels at device control and Apple ecosystem integration
- Voice Bridge excels at YOUR workflows with YOUR data on YOUR servers

---

## System Components

### 1. iOS Shortcut (Client)

```
┌─────────────────────────────────────────┐
│           iOS Shortcut                   │
│  "Personal Voice Assistant"              │
│                                          │
│  1. Dictate Text (Apple transcription)   │
│  2. POST to Voice Bridge API             │
│  3. Parse JSON response                  │
│  4. Show notification with result        │
│                                          │
│  Fallback: Save to Notes if offline      │
└─────────────────────────────────────────┘
```

**Action Button Mapping**: Settings → Action Button → Shortcut → "Personal Voice Assistant"

### 2. Voice Bridge API (Router)

Minimal API that receives voice input and routes to appropriate service.

```
┌─────────────────────────────────────────────────────────────────┐
│                      Voice Bridge API                            │
│                                                                  │
│  Endpoints:                                                      │
│  ├── POST /voice          Main voice input endpoint              │
│  ├── GET  /health         Health check                           │
│  └── GET  /services       List available services                │
│                                                                  │
│  Responsibilities:                                               │
│  ├── Receive transcribed text                                    │
│  ├── Send to LLM for intent classification                       │
│  ├── Route to appropriate service adapter                        │
│  └── Return unified response format                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3. LLM Intent Parser (Brain)

```
┌─────────────────────────────────────────────────────────────────┐
│                    LLM Intent Parser                             │
│                    (Ollama + gpt-oss-20b)                        │
│                                                                  │
│  Input: "Add buy milk to my shopping list priority high"         │
│                                                                  │
│  Output:                                                         │
│  {                                                               │
│    "service": "plane",                                           │
│    "action": "create_task",                                      │
│    "confidence": 0.95,                                           │
│    "data": {                                                     │
│      "title": "Buy milk",                                        │
│      "project": "shopping",                                      │
│      "priority": "high"                                          │
│    }                                                             │
│  }                                                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4. Service Adapters (Integrations)

Each external service gets an adapter that translates parsed intents to API calls.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Service Adapters                              │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  PlaneAdapter   │  │ FireflyAdapter  │  │   wgerAdapter   │ │
│  │                 │  │                 │  │                 │ │
│  │  • create_task  │  │  • withdrawal   │  │  • log_set      │ │
│  │  • list_tasks   │  │  • deposit      │  │  • log_weight   │ │
│  │  • complete     │  │  • transfer     │  │  • start_workout│ │
│  │                 │  │  • query        │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                  │
│  Interface:                                                      │
│  {                                                               │
│    name: string                                                  │
│    actions: string[]                                             │
│    execute(action, data): Promise<Response>                      │
│  }                                                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Voice Flow Sequence

```
┌──────┐     ┌──────────┐     ┌───────────┐     ┌─────┐     ┌───────┐
│iPhone│     │iOS Short-│     │Voice Bridge│     │ LLM │     │ Plane │
│Button│     │   cut    │     │    API    │     │     │     │       │
└──┬───┘     └────┬─────┘     └─────┬─────┘     └──┬──┘     └───┬───┘
   │              │                 │              │             │
   │ Press        │                 │              │             │
   │─────────────▶│                 │              │             │
   │              │                 │              │             │
   │              │ Dictate         │              │             │
   │              │ "Add eggs to    │              │             │
   │              │  shopping p1"   │              │             │
   │              │                 │              │             │
   │              │ POST /voice     │              │             │
   │              │ {text: "..."}   │              │             │
   │              │────────────────▶│              │             │
   │              │                 │              │             │
   │              │                 │ Parse intent │             │
   │              │                 │─────────────▶│             │
   │              │                 │              │             │
   │              │                 │   {service:  │             │
   │              │                 │    "plane",  │             │
   │              │                 │    action:   │             │
   │              │                 │    "create"} │             │
   │              │                 │◀─────────────│             │
   │              │                 │              │             │
   │              │                 │ POST /work-items           │
   │              │                 │─────────────────────────────▶
   │              │                 │              │             │
   │              │                 │         201 Created        │
   │              │                 │◀─────────────────────────────
   │              │                 │              │             │
   │              │ {success: true, │              │             │
   │              │  message: "Added│              │             │
   │              │  'eggs' to      │              │             │
   │              │  Shopping"}     │              │             │
   │              │◀────────────────│              │             │
   │              │                 │              │             │
   │ Notification │                 │              │             │
   │ "Added eggs  │                 │              │             │
   │  to Shopping"│                 │              │             │
   │◀─────────────│                 │              │             │
   │              │                 │              │             │
```

---

## API Contract

### POST /voice

Main endpoint for voice input processing.

**Request:**
```typescript
{
  text: string;           // Transcribed voice input
  context?: {             // Optional context hints
    lastService?: string; // For follow-up commands
    location?: string;    // GPS context
  };
}
```

**Response:**
```typescript
{
  success: boolean;
  message: string;        // Human-readable result for notification
  service: string;        // Which service handled it
  action: string;         // What action was taken
  data?: any;             // Service-specific response data
  parseWarning?: boolean; // True if LLM was uncertain
}
```

**Examples:**

```bash
# Add task to Plane
curl -X POST https://voice.example.com/voice \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text": "add buy milk to shopping list priority high"}'

# Response
{
  "success": true,
  "message": "Added 'Buy milk' to Shopping (high priority)",
  "service": "plane",
  "action": "create_task",
  "data": {
    "id": "abc123",
    "name": "Buy milk",
    "project": "Shopping",
    "priority": "high"
  }
}
```

```bash
# Complete a task
curl -X POST https://voice.example.com/voice \
  -H "X-API-Key: $API_KEY" \
  -d '{"text": "mark buy milk as done"}'

# Response
{
  "success": true,
  "message": "Completed 'Buy milk'",
  "service": "plane",
  "action": "complete_task"
}
```

### GET /services

List available services and their capabilities.

```json
{
  "services": [
    {
      "name": "plane",
      "description": "Task and project management",
      "actions": ["create_task", "complete_task", "list_tasks"],
      "examples": [
        "add <task> to <list>",
        "mark <task> as done",
        "what's on my shopping list"
      ]
    },
    {
      "name": "firefly",
      "description": "Finance and expense tracking",
      "actions": ["create_transaction", "query_spending"],
      "examples": [
        "spent 45 on groceries",
        "got paid 3000",
        "how much did I spend on food"
      ]
    },
    {
      "name": "wger",
      "description": "Fitness and workout tracking",
      "actions": ["log_set", "log_weight", "start_workout"],
      "examples": [
        "log bench press 135 for 10",
        "weight is 180 pounds",
        "did 3 sets of squats"
      ]
    }
  ]
}
```

---

## LLM Intent Classification

### System Prompt

```
You are a voice command parser for a personal assistant system.

Available services and their capabilities:
{{services}}

Parse the user's voice command and return structured JSON.

Rules:
1. Extract the core intent and map to a service
2. Normalize task names (capitalize, clean up filler words)
3. Map spoken list names to project identifiers
4. Extract priority from "p1/p2/p3" or "high/medium/low"
5. Extract dates from natural language ("tomorrow", "next friday")
6. If uncertain, set confidence < 0.7 and include raw_input
7. For ambiguous commands, prefer "plane" service as default

Output JSON format:
{
  "service": "plane|firefly|wger|unknown",
  "action": "create_task|complete_task|...",
  "confidence": 0.0-1.0,
  "data": { ... service-specific fields ... }
}
```

### Project Name Mapping

Configure mappings from spoken names to Plane project IDs:

```typescript
const projectMappings = {
  // Spoken variations → Plane project slug
  "shopping": "shopping-list",
  "groceries": "shopping-list",
  "shop": "shopping-list",

  "work": "work-tasks",
  "office": "work-tasks",

  "home": "home-tasks",
  "house": "home-tasks",
  "chores": "home-tasks",

  "inbox": "inbox",  // Default
};
```

---

## Plane Integration

### Configuration

```typescript
interface PlaneConfig {
  baseUrl: string;          // https://plane.example.com
  apiKey: string;           // plane_api_xxxxx
  workspaceSlug: string;    // my-workspace
  defaultProject: string;   // inbox
  projectMappings: Record<string, string>;
}
```

### Adapter Implementation

```typescript
const planeAdapter: ServiceAdapter = {
  name: 'plane',

  actions: ['create_task', 'complete_task', 'list_tasks'],

  async execute(action, data) {
    switch (action) {
      case 'create_task':
        return createWorkItem(data);
      case 'complete_task':
        return completeWorkItem(data);
      case 'list_tasks':
        return listWorkItems(data);
    }
  }
};

async function createWorkItem(data: {
  title: string;
  project: string;
  priority?: 'urgent' | 'high' | 'medium' | 'low' | 'none';
  dueDate?: string;
}) {
  const projectId = await resolveProjectId(data.project);

  const response = await fetch(
    `${PLANE_URL}/api/v1/workspaces/${WORKSPACE}/projects/${projectId}/work-items/`,
    {
      method: 'POST',
      headers: {
        'X-API-Key': PLANE_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: data.title,
        priority: data.priority || 'none',
        target_date: data.dueDate,
      }),
    }
  );

  return response.json();
}
```

---

## Project Structure

```
voice-bridge/
├── src/
│   ├── server.ts              # Fastify server setup
│   ├── routes/
│   │   └── voice.ts           # POST /voice endpoint
│   ├── services/
│   │   ├── llm.ts             # Ollama integration
│   │   ├── router.ts          # Intent → Service routing
│   │   └── adapters/
│   │       ├── index.ts       # Adapter registry
│   │       ├── plane.ts       # Plane API adapter
│   │       └── home.ts        # Home Assistant adapter (future)
│   ├── config/
│   │   ├── index.ts           # Environment config
│   │   └── mappings.ts        # Project name mappings
│   └── types/
│       └── index.ts           # Shared types
├── .env
├── Dockerfile
└── package.json
```

---

## iOS Shortcut Design

### Shortcut: "Personal Voice Assistant"

```
┌─────────────────────────────────────────────────────────────────┐
│  Personal Voice Assistant                                        │
│                                                                  │
│  1. Dictate Text                                                 │
│     └── Store in variable: "SpokenText"                         │
│                                                                  │
│  2. If SpokenText is empty                                       │
│     └── Stop and Output: "No command heard"                     │
│                                                                  │
│  3. Get Contents of URL                                          │
│     URL: https://voice.example.com/voice                        │
│     Method: POST                                                 │
│     Headers:                                                     │
│       X-API-Key: [your-api-key]                                 │
│       Content-Type: application/json                            │
│     Body: {"text": "[SpokenText]"}                              │
│                                                                  │
│  4. If request failed                                            │
│     └── Create Note with SpokenText (offline fallback)          │
│     └── Show Notification: "Saved offline, will sync later"     │
│     └── Stop                                                     │
│                                                                  │
│  5. Get Dictionary Value "message" from response                 │
│                                                                  │
│  6. Show Notification                                            │
│     Title: "Voice Assistant"                                     │
│     Body: [message from response]                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Action Button Setup

1. Open **Settings** → **Action Button**
2. Swipe to **Shortcut**
3. Select **"Personal Voice Assistant"**

Now: **Press Action Button → Speak → Task Created**

---

## Core Services

The Voice Bridge integrates with three self-hosted applications:

| Service | Application | Purpose | API Auth |
|---------|-------------|---------|----------|
| **plane** | Plane.so | Tasks & projects | `X-API-Key` header |
| **firefly** | Firefly III | Finance tracking | `Bearer` token |
| **wger** | wger | Fitness tracking | JWT token |

See `docs/voice-bridge-plan.md` for detailed API specifications for each service.

---

## Extensibility: Future Services

The adapter pattern makes adding new services straightforward:

### Example: Home Assistant Adapter (Future)

```typescript
const homeAssistantAdapter: ServiceAdapter = {
  name: 'home',
  actions: ['turn_on', 'turn_off', 'set_temperature', 'run_scene'],

  async execute(action, data) {
    // Map voice commands to Home Assistant API calls
    // "turn on living room lights" → POST /api/services/light/turn_on
  }
};
```

### Adding a New Service

1. Create adapter in `src/services/adapters/`
2. Register in adapter index
3. Add service description to LLM system prompt
4. Add project/entity mappings if needed

---

## Deployment

### Docker Compose

```yaml
version: '3.8'

services:
  voice-bridge:
    build: .
    ports:
      - "3000:3000"
    environment:
      - OLLAMA_URL=http://ollama:11434
      - PLANE_URL=http://plane-api:8000
      - PLANE_API_KEY=${PLANE_API_KEY}
      - PLANE_WORKSPACE=${PLANE_WORKSPACE}
      - API_KEY=${VOICE_BRIDGE_API_KEY}
    depends_on:
      - ollama
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.voice.rule=Host(`voice.example.com`)"
      - "traefik.http.routers.voice.tls.certresolver=letsencrypt"

  ollama:
    image: ollama/ollama
    volumes:
      - ollama_data:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - capabilities: [gpu]

  plane:
    # Your Plane deployment
    # See: https://docs.plane.so/self-hosting

volumes:
  ollama_data:
```

---

## Security Considerations

1. **API Key Authentication**: All endpoints require `X-API-Key` header
2. **HTTPS Only**: TLS via Traefik/Let's Encrypt
3. **Rate Limiting**: 60 requests/minute per API key
4. **Input Validation**: Sanitize all LLM inputs/outputs
5. **No PII in Logs**: Redact sensitive data from logs
6. **Separate Keys**: Different API keys for iOS Shortcut vs other clients

---

## Summary

| Component | Technology | Purpose |
|-----------|------------|---------|
| Trigger | iPhone Action Button | Physical activation |
| Client | iOS Shortcut | Voice capture, API calls |
| Router | Fastify/Bun API | Request handling, service routing |
| Brain | Ollama + gpt-oss-20b | Intent classification |
| Tasks | Plane.so | Task/project management |
| Finance | Firefly III | Expense/income tracking |
| Fitness | wger | Workout/weight logging |
| Future | Home Assistant, etc. | Extensible integrations |

This architecture gives you:
- **Your voice, your AI, your servers** - Complete control
- **Siri coexistence** - Best of both worlds
- **Three core services** - Tasks, finance, fitness out of the box
- **Extensibility** - Add services as needed
- **No custom UI** - Each service has its own polished interface
- **Offline resilience** - Fallback to Notes app
