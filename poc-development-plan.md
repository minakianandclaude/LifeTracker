# LifeTracker PoC — Development Plan

## Overview

This document outlines the phased development plan for the LifeTracker Proof of Concept. The goal is to validate the core voice → data → display flow with minimal complexity.

**End State**: User speaks "Add buy milk" via iPhone → task appears in web UI → user can mark complete.

---

## Table of Contents

| Phase | Description | Status |
|-------|-------------|--------|
| [Phase 1](#phase-1-project-scaffold) | Project Scaffold | ✅ Complete |
| [Phase 2](#phase-2-database-setup) | Database Setup | ✅ Complete |
| [Phase 3](#phase-3-api-endpoints) | API Endpoints | ✅ Complete |
| [Phase 4](#phase-4-frontend-basic-ui) | Frontend (Basic UI) | ✅ Complete |
| [Phase 5](#phase-5-llm-integration) | LLM Integration | ⏳ Pending |
| [Phase 6](#phase-6-ios-shortcut-integration) | iOS Shortcut Integration | ⏳ Pending |
| [Phase 7](#phase-7-integration-testing--polish) | Integration Testing & Polish | ⏳ Pending |

**Other Sections:**
- [PoC Scope Summary](#poc-scope-summary)
- [Prerequisites](#prerequisites)
- [Summary Checklist](#summary-checklist)
- [Files Created Summary](#files-created-summary)

---

## PoC Scope Summary

| Feature | Included | Excluded |
|---------|----------|----------|
| Task CRUD | ✓ | |
| Single list (Inbox only) | ✓ | Multiple lists |
| Voice input via iOS Shortcut | ✓ | macOS Shortcut |
| LLM title extraction | ✓ | Priority, due date, tags |
| API key auth | ✓ | JWT, refresh tokens |
| Basic React UI | ✓ | Responsive design, styling polish |
| PostgreSQL + Prisma | ✓ | |
| Offline handling | | ✓ (MVP) |
| Parse error correction | | ✓ (MVP) |

---

## Prerequisites

Before starting development, ensure the following are available:

- [ ] Bun 1.0+ installed (`curl -fsSL https://bun.sh/install | bash`)
- [ ] Docker + Docker Compose installed
- [ ] PostgreSQL client (psql) for debugging
- [ ] iPhone with Shortcuts app
- [ ] Home server accessible via `life.maverickapplications.com` (or local IP for dev)
- [ ] Text editor / IDE with TypeScript support

> **Note:** Bun replaces Node.js, npm/pnpm, and tsx. It runs TypeScript natively.

---

## Phase 1: Project Scaffold

### Goal
Set up the monorepo structure with all necessary configuration files.

### Deliverable
Empty but properly configured monorepo that builds without errors.

### Steps

#### 1.1 Initialize Monorepo Root
```bash
mkdir lifetracker && cd lifetracker
bun init -y
```

Create `package.json`:
```json
{
  "name": "lifetracker",
  "version": "0.1.0",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "clean": "turbo clean"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.3.0"
  }
}
```

#### 1.2 Create Turborepo Configuration

Create `turbo.json`:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "clean": {
      "cache": false
    }
  }
}
```

#### 1.3 Create Package Directories
```bash
mkdir -p packages/core/src
mkdir -p packages/api/src
mkdir -p packages/web/src
```

#### 1.4 Initialize Core Package

Create `packages/core/package.json`:
```json
{
  "name": "@lifetracker/core",
  "version": "0.1.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "clean": "rm -rf dist"
  },
  "devDependencies": {
    "typescript": "^5.3.0"
  }
}
```

Create `packages/core/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

Create `packages/core/src/index.ts`:
```typescript
export const VERSION = '0.1.0';
```

#### 1.5 Initialize API Package

Create `packages/api/package.json`:
```json
{
  "name": "@lifetracker/api",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "build": "bun build src/server.ts --outdir dist --target node",
    "dev": "bun --watch src/server.ts",
    "start": "bun dist/server.js",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@lifetracker/core": "workspace:*",
    "fastify": "^4.25.0",
    "@fastify/cors": "^8.5.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0"
  }
}
```

Create `packages/api/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

Create `packages/api/src/server.ts`:
```typescript
import Fastify from 'fastify';

const server = Fastify({ logger: true });

server.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

const start = async () => {
  try {
    await server.listen({ port: 3000, host: '0.0.0.0' });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
```

#### 1.6 Initialize Web Package

Create `packages/web/package.json`:
```json
{
  "name": "@lifetracker/web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
```

Create `packages/web/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

Create `packages/web/tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

Create `packages/web/vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

Create `packages/web/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>LifeTracker</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `packages/web/src/main.tsx`:
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

Create `packages/web/src/App.tsx`:
```typescript
function App() {
  return (
    <div>
      <h1>LifeTracker</h1>
      <p>Coming soon...</p>
    </div>
  );
}

export default App;
```

#### 1.7 Create Root TypeScript Config

Create `tsconfig.json` (root):
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "references": [
    { "path": "./packages/core" },
    { "path": "./packages/api" }
  ]
}
```

#### 1.8 Create .gitignore

```
node_modules/
dist/
.turbo/
*.log
.env
.env.local
.DS_Store
```

### Test Plan

| Test | Command | Expected Result |
|------|---------|-----------------|
| Install dependencies | `bun install` | No errors, node_modules created |
| Build all packages | `bun run build` | All packages compile successfully |
| Start API server | `cd packages/api && bun run dev` | Server starts on port 3000 |
| Health check | `curl http://localhost:3000/health` | Returns `{"status":"ok",...}` |
| Start web dev | `cd packages/web && bun run dev` | Vite starts on port 5173 |
| View web app | Open `http://localhost:5173` | Shows "LifeTracker" heading |

### Edge Cases
- None for this phase (infrastructure only)

---

## Phase 2: Database Setup

### Goal
Set up PostgreSQL and Prisma with the minimal PoC schema.

### Deliverable
Working database with tasks table, seeded with Inbox list.

### Steps

#### 2.1 Create Docker Compose

Create `docker-compose.yml` (root):
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: lifetracker-db
    environment:
      POSTGRES_USER: lifetracker
      POSTGRES_PASSWORD: lifetracker_dev
      POSTGRES_DB: lifetracker
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U lifetracker"]
      interval: 5s
      timeout: 5s
      retries: 5

  ollama:
    image: ollama/ollama
    container_name: lifetracker-ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    # Uncomment if you have GPU:
    # deploy:
    #   resources:
    #     reservations:
    #       devices:
    #         - capabilities: [gpu]

volumes:
  postgres_data:
  ollama_data:
```

#### 2.2 Add Prisma to Core Package

Update `packages/core/package.json` dependencies:
```json
{
  "dependencies": {
    "@prisma/client": "^5.8.0"
  },
  "devDependencies": {
    "prisma": "^5.8.0",
    "typescript": "^5.3.0"
  }
}
```

#### 2.3 Create Prisma Schema

Create `packages/core/prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model List {
  id          String   @id @default(uuid())
  name        String   @unique  // Stored lowercase, trimmed
  isSystem    Boolean  @default(false) @map("is_system")
  isDeletable Boolean  @default(true) @map("is_deletable")
  position    Int      @default(0)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  tasks       Task[]

  @@map("lists")
}

model Task {
  id           String    @id @default(uuid())
  title        String
  notes        String?
  listId       String    @map("list_id")
  priority     Priority?
  dueDate      DateTime? @map("due_date") @db.Date
  completed    Boolean   @default(false)
  completedAt  DateTime? @map("completed_at")
  position     Int       @default(0)
  rawInput     String?   @map("raw_input")
  parseWarning Boolean   @default(false) @map("parse_warning")
  parseErrors  String?   @map("parse_errors")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  list         List      @relation(fields: [listId], references: [id])

  @@map("tasks")
}

enum Priority {
  HIGH
  MEDIUM
  LOW
}
```

#### 2.4 Create Seed Script

Create `packages/core/prisma/seed.ts`:
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create system Inbox list
  const inbox = await prisma.list.upsert({
    where: { name: 'inbox' },
    update: {},
    create: {
      name: 'inbox',
      isSystem: true,
      isDeletable: false,
      position: 0,
    },
  });

  console.log('Created Inbox list:', inbox.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Update `packages/core/package.json` to add seed script:
```json
{
  "prisma": {
    "seed": "bun prisma/seed.ts"
  }
}
```

#### 2.5 Create Environment File

Create `.env` (root):
```bash
DATABASE_URL="postgresql://lifetracker:lifetracker_dev@localhost:5432/lifetracker"
API_KEY="dev-api-key-change-in-production"
OLLAMA_URL="http://localhost:11434"
```

Create `packages/core/.env` (symlink or copy):
```bash
DATABASE_URL="postgresql://lifetracker:lifetracker_dev@localhost:5432/lifetracker"
```

#### 2.6 Export Prisma Client from Core

Update `packages/core/src/index.ts`:
```typescript
export { PrismaClient } from '@prisma/client';
export type { Task, List, Priority } from '@prisma/client';

// Singleton Prisma client
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

#### 2.7 Add Scripts to Core Package

Update `packages/core/package.json` scripts:
```json
{
  "scripts": {
    "build": "prisma generate && tsc",
    "dev": "tsc --watch",
    "clean": "rm -rf dist",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:seed": "prisma db seed",
    "db:studio": "prisma studio"
  }
}
```

### Test Plan

| Test | Command | Expected Result |
|------|---------|-----------------|
| Start database | `docker compose up -d postgres` | PostgreSQL container running |
| Check DB connection | `docker exec -it lifetracker-db psql -U lifetracker -c '\l'` | Shows lifetracker database |
| Generate Prisma client | `cd packages/core && bun run db:generate` | Client generated successfully |
| Push schema to DB | `cd packages/core && bun run db:push` | Tables created |
| Seed database | `cd packages/core && bun run db:seed` | Inbox list created |
| Verify seed | `docker exec -it lifetracker-db psql -U lifetracker -c 'SELECT * FROM lists'` | Shows Inbox row |
| Open Prisma Studio | `cd packages/core && bun run db:studio` | Browser opens with DB UI |

### Edge Cases

| Scenario | Handling |
|----------|----------|
| Database not running | Commands will fail with connection error; ensure docker compose up first |
| Schema already pushed | `db:push` is idempotent, will not error |
| Inbox already exists | `upsert` in seed handles this gracefully |

---

## Phase 3: API Endpoints

### Goal
Create CRUD endpoints for tasks without LLM integration (manual input).

### Deliverable
Working REST API that can create, read, update, and delete tasks.

### Steps

#### 3.1 Update API Dependencies

Update `packages/api/package.json`:
```json
{
  "dependencies": {
    "@lifetracker/core": "workspace:*",
    "fastify": "^4.25.0",
    "@fastify/cors": "^8.5.0",
    "zod": "^3.22.0"
  }
}
```

#### 3.2 Create API Key Middleware

Create `packages/api/src/middleware/auth.ts`:
```typescript
import { FastifyRequest, FastifyReply } from 'fastify';

const API_KEY = process.env.API_KEY || 'dev-api-key-change-in-production';

export async function verifyApiKey(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const apiKey = request.headers['x-api-key'];

  if (!apiKey || apiKey !== API_KEY) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Invalid or missing API key',
    });
  }
}
```

#### 3.3 Create Task Schema Validation

Create `packages/api/src/schemas/task.ts`:
```typescript
import { z } from 'zod';

export const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  notes: z.string().max(5000).optional(),
  listId: z.string().uuid().optional(), // Defaults to Inbox
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
  dueDate: z.string().datetime().optional(),
  rawInput: z.string().optional(),
  parseWarning: z.boolean().optional(),
  parseErrors: z.string().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  notes: z.string().max(5000).nullable().optional(),
  listId: z.string().uuid().optional(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  completed: z.boolean().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
```

#### 3.4 Create Task Routes

Create `packages/api/src/routes/tasks.ts`:
```typescript
import { FastifyInstance } from 'fastify';
import { prisma } from '@lifetracker/core';
import { createTaskSchema, updateTaskSchema } from '../schemas/task';
import { verifyApiKey } from '../middleware/auth';

export async function taskRoutes(fastify: FastifyInstance) {
  // Apply auth to all routes in this plugin
  fastify.addHook('preHandler', verifyApiKey);

  // GET /api/tasks - List all tasks
  fastify.get('/tasks', async (request, reply) => {
    const tasks = await prisma.task.findMany({
      include: { list: true },
      orderBy: { createdAt: 'desc' },
    });
    return { tasks };
  });

  // GET /api/tasks/:id - Get single task
  fastify.get<{ Params: { id: string } }>('/tasks/:id', async (request, reply) => {
    const { id } = request.params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: { list: true },
    });

    if (!task) {
      return reply.status(404).send({
        error: 'Not Found',
        message: `Task with id ${id} not found`,
      });
    }

    return { task };
  });

  // POST /api/tasks - Create task
  fastify.post('/tasks', async (request, reply) => {
    const parseResult = createTaskSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: parseResult.error.issues,
      });
    }

    const data = parseResult.data;

    // Get Inbox ID if no list specified
    let listId = data.listId;
    if (!listId) {
      const inbox = await prisma.list.findUnique({
        where: { name: 'inbox' },
      });
      if (!inbox) {
        return reply.status(500).send({
          error: 'Server Error',
          message: 'Inbox list not found. Please run database seed.',
        });
      }
      listId = inbox.id;
    }

    const task = await prisma.task.create({
      data: {
        title: data.title,
        notes: data.notes,
        listId,
        priority: data.priority,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        rawInput: data.rawInput,
        parseWarning: data.parseWarning ?? false,
        parseErrors: data.parseErrors,
      },
      include: { list: true },
    });

    return reply.status(201).send({ task });
  });

  // PATCH /api/tasks/:id - Update task
  fastify.patch<{ Params: { id: string } }>('/tasks/:id', async (request, reply) => {
    const { id } = request.params;
    const parseResult = updateTaskSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: parseResult.error.issues,
      });
    }

    const data = parseResult.data;

    // Check task exists
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({
        error: 'Not Found',
        message: `Task with id ${id} not found`,
      });
    }

    // Build update object
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.listId !== undefined) updateData.listId = data.listId;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }
    if (data.completed !== undefined) {
      updateData.completed = data.completed;
      updateData.completedAt = data.completed ? new Date() : null;
    }

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
      include: { list: true },
    });

    return { task };
  });

  // DELETE /api/tasks/:id - Delete task
  fastify.delete<{ Params: { id: string } }>('/tasks/:id', async (request, reply) => {
    const { id } = request.params;

    // Check task exists
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({
        error: 'Not Found',
        message: `Task with id ${id} not found`,
      });
    }

    await prisma.task.delete({ where: { id } });

    return reply.status(204).send();
  });

  // POST /api/tasks/:id/complete - Toggle completion
  fastify.post<{ Params: { id: string } }>('/tasks/:id/complete', async (request, reply) => {
    const { id } = request.params;

    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({
        error: 'Not Found',
        message: `Task with id ${id} not found`,
      });
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        completed: !existing.completed,
        completedAt: !existing.completed ? new Date() : null,
      },
      include: { list: true },
    });

    return { task };
  });
}
```

#### 3.5 Create List Routes

Create `packages/api/src/routes/lists.ts`:
```typescript
import { FastifyInstance } from 'fastify';
import { prisma } from '@lifetracker/core';
import { verifyApiKey } from '../middleware/auth';

export async function listRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', verifyApiKey);

  // GET /api/lists - List all lists
  fastify.get('/lists', async () => {
    const lists = await prisma.list.findMany({
      orderBy: { position: 'asc' },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
    });
    return { lists };
  });

  // GET /api/lists/:id - Get single list with tasks
  fastify.get<{ Params: { id: string } }>('/lists/:id', async (request, reply) => {
    const { id } = request.params;

    const list = await prisma.list.findUnique({
      where: { id },
      include: {
        tasks: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!list) {
      return reply.status(404).send({
        error: 'Not Found',
        message: `List with id ${id} not found`,
      });
    }

    return { list };
  });
}
```

#### 3.6 Update Server Entry Point

Update `packages/api/src/server.ts`:
```typescript
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { taskRoutes } from './routes/tasks';
import { listRoutes } from './routes/lists';

const server = Fastify({
  logger: true,
});

// Register plugins
server.register(cors, {
  origin: true, // Allow all origins in development
});

// Health check (no auth required)
server.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Register routes
server.register(taskRoutes, { prefix: '/api' });
server.register(listRoutes, { prefix: '/api' });

// Error handler
server.setErrorHandler((error, request, reply) => {
  server.log.error(error);
  reply.status(500).send({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
  });
});

const start = async () => {
  try {
    await server.listen({ port: 3000, host: '0.0.0.0' });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
```

#### 3.7 Create API Environment File

Create `packages/api/.env`:
```bash
DATABASE_URL="postgresql://lifetracker:lifetracker_dev@localhost:5432/lifetracker"
API_KEY="dev-api-key-change-in-production"
NODE_ENV="development"
```

### Test Plan

| Test | Command | Expected Result |
|------|---------|-----------------|
| Start API | `cd packages/api && bun run dev` | Server listening on port 3000 |
| Health check | `curl http://localhost:3000/health` | `{"status":"ok",...}` |
| Missing API key | `curl http://localhost:3000/api/tasks` | 401 Unauthorized |
| List tasks (empty) | `curl -H "X-API-Key: dev-api-key-change-in-production" http://localhost:3000/api/tasks` | `{"tasks":[]}` |
| Create task | `curl -X POST -H "X-API-Key: dev-api-key-change-in-production" -H "Content-Type: application/json" -d '{"title":"Buy milk"}' http://localhost:3000/api/tasks` | 201 with task object |
| List tasks | Same as above | Shows created task |
| Get task | `curl -H "X-API-Key: ..." http://localhost:3000/api/tasks/{id}` | Task object |
| Update task | `curl -X PATCH -H "X-API-Key: ..." -H "Content-Type: application/json" -d '{"completed":true}' http://localhost:3000/api/tasks/{id}` | Updated task with completedAt |
| Toggle complete | `curl -X POST -H "X-API-Key: ..." http://localhost:3000/api/tasks/{id}/complete` | Task with toggled completion |
| Delete task | `curl -X DELETE -H "X-API-Key: ..." http://localhost:3000/api/tasks/{id}` | 204 No Content |
| Get deleted task | `curl -H "X-API-Key: ..." http://localhost:3000/api/tasks/{id}` | 404 Not Found |
| List lists | `curl -H "X-API-Key: ..." http://localhost:3000/api/lists` | Shows Inbox with task count |

### Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Empty title | 400 Validation Error |
| Title too long (>500 chars) | 400 Validation Error |
| Invalid UUID for task ID | 404 Not Found (Prisma handles gracefully) |
| Invalid priority value | 400 Validation Error |
| Invalid date format | 400 Validation Error |
| Create task when Inbox missing | 500 Server Error with helpful message |
| Update non-existent task | 404 Not Found |
| Delete non-existent task | 404 Not Found |
| Wrong API key | 401 Unauthorized |
| No API key header | 401 Unauthorized |
| Malformed JSON body | 400 Bad Request |

---

## Phase 4: Frontend (Basic UI)

### Goal
Create a minimal React UI to view and manage tasks.

### Deliverable
Web interface showing task list, ability to add tasks, mark complete, and delete.

### Steps

#### 4.1 Install Additional Dependencies

Update `packages/web/package.json`:
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
```

#### 4.2 Create API Client

Create `packages/web/src/api/client.ts`:
```typescript
const API_BASE = '/api';
const API_KEY = 'dev-api-key-change-in-production'; // Will be configured properly later

interface ApiOptions {
  method?: string;
  body?: unknown;
}

async function apiRequest<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body } = options;

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export interface Task {
  id: string;
  title: string;
  notes: string | null;
  listId: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW' | null;
  dueDate: string | null;
  completed: boolean;
  completedAt: string | null;
  rawInput: string | null;
  parseWarning: boolean;
  parseErrors: string | null;
  createdAt: string;
  updatedAt: string;
  list: {
    id: string;
    name: string;
  };
}

export interface List {
  id: string;
  name: string;
  isSystem: boolean;
  isDeletable: boolean;
  _count?: {
    tasks: number;
  };
}

export const api = {
  // Tasks
  getTasks: () => apiRequest<{ tasks: Task[] }>('/tasks'),
  getTask: (id: string) => apiRequest<{ task: Task }>(`/tasks/${id}`),
  createTask: (data: { title: string; notes?: string }) =>
    apiRequest<{ task: Task }>('/tasks', { method: 'POST', body: data }),
  updateTask: (id: string, data: Partial<Task>) =>
    apiRequest<{ task: Task }>(`/tasks/${id}`, { method: 'PATCH', body: data }),
  deleteTask: (id: string) =>
    apiRequest<void>(`/tasks/${id}`, { method: 'DELETE' }),
  toggleComplete: (id: string) =>
    apiRequest<{ task: Task }>(`/tasks/${id}/complete`, { method: 'POST' }),

  // Lists
  getLists: () => apiRequest<{ lists: List[] }>('/lists'),
  getList: (id: string) => apiRequest<{ list: List & { tasks: Task[] } }>(`/lists/${id}`),
};
```

#### 4.3 Create Task List Component

Create `packages/web/src/components/TaskList.tsx`:
```typescript
import { Task } from '../api/client';

interface TaskListProps {
  tasks: Task[];
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TaskList({ tasks, onToggleComplete, onDelete }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
        No tasks yet. Add one above!
      </div>
    );
  }

  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {tasks.map((task) => (
        <li
          key={task.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0.75rem 1rem',
            borderBottom: '1px solid #eee',
            backgroundColor: task.completed ? '#f9f9f9' : 'white',
          }}
        >
          <input
            type="checkbox"
            checked={task.completed}
            onChange={() => onToggleComplete(task.id)}
            style={{ marginRight: '1rem', transform: 'scale(1.2)' }}
          />
          <span
            style={{
              flex: 1,
              textDecoration: task.completed ? 'line-through' : 'none',
              color: task.completed ? '#999' : '#333',
            }}
          >
            {task.title}
          </span>
          {task.parseWarning && (
            <span
              title="Parse warning - click to review"
              style={{ marginRight: '0.5rem', cursor: 'help' }}
            >
              ⚠️
            </span>
          )}
          <button
            onClick={() => onDelete(task.id)}
            style={{
              background: 'none',
              border: 'none',
              color: '#999',
              cursor: 'pointer',
              padding: '0.25rem 0.5rem',
              fontSize: '1rem',
            }}
            title="Delete task"
          >
            🗑️
          </button>
        </li>
      ))}
    </ul>
  );
}
```

#### 4.4 Create Add Task Form

Create `packages/web/src/components/AddTaskForm.tsx`:
```typescript
import { useState, FormEvent } from 'react';

interface AddTaskFormProps {
  onAdd: (title: string) => Promise<void>;
  disabled?: boolean;
}

export function AddTaskForm({ onAdd, disabled }: AddTaskFormProps) {
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onAdd(trimmed);
      setTitle('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        padding: '1rem',
        borderBottom: '1px solid #eee',
        gap: '0.5rem',
      }}
    >
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a task..."
        disabled={disabled || isSubmitting}
        style={{
          flex: 1,
          padding: '0.75rem',
          fontSize: '1rem',
          border: '1px solid #ddd',
          borderRadius: '4px',
        }}
      />
      <button
        type="submit"
        disabled={!title.trim() || disabled || isSubmitting}
        style={{
          padding: '0.75rem 1.5rem',
          fontSize: '1rem',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          opacity: !title.trim() || disabled || isSubmitting ? 0.5 : 1,
        }}
      >
        {isSubmitting ? 'Adding...' : 'Add'}
      </button>
    </form>
  );
}
```

#### 4.5 Create Error Display Component

Create `packages/web/src/components/ErrorMessage.tsx`:
```typescript
interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
}

export function ErrorMessage({ message, onDismiss }: ErrorMessageProps) {
  return (
    <div
      style={{
        padding: '1rem',
        backgroundColor: '#fee',
        borderLeft: '4px solid #c00',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <span style={{ color: '#c00' }}>{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1.2rem',
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
```

#### 4.6 Update Main App Component

Update `packages/web/src/App.tsx`:
```typescript
import { useEffect, useState, useCallback } from 'react';
import { api, Task } from './api/client';
import { TaskList } from './components/TaskList';
import { AddTaskForm } from './components/AddTaskForm';
import { ErrorMessage } from './components/ErrorMessage';

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setError(null);
      const { tasks } = await api.getTasks();
      setTasks(tasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleAddTask = async (title: string) => {
    try {
      setError(null);
      const { task } = await api.createTask({ title });
      setTasks((prev) => [task, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
      throw err; // Re-throw so form knows it failed
    }
  };

  const handleToggleComplete = async (id: string) => {
    try {
      setError(null);
      const { task } = await api.toggleComplete(id);
      setTasks((prev) => prev.map((t) => (t.id === id ? task : t)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setError(null);
      await api.deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
    }
  };

  // Separate incomplete and completed tasks
  const incompleteTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  return (
    <div
      style={{
        maxWidth: '600px',
        margin: '0 auto',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <header
        style={{
          padding: '1.5rem 1rem',
          borderBottom: '1px solid #eee',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>LifeTracker</h1>
        <p style={{ margin: '0.5rem 0 0', color: '#666', fontSize: '0.9rem' }}>
          {incompleteTasks.length} task{incompleteTasks.length !== 1 ? 's' : ''} remaining
        </p>
      </header>

      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

      <AddTaskForm onAdd={handleAddTask} disabled={loading} />

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
          Loading...
        </div>
      ) : (
        <>
          <TaskList
            tasks={incompleteTasks}
            onToggleComplete={handleToggleComplete}
            onDelete={handleDelete}
          />

          {completedTasks.length > 0 && (
            <>
              <div
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#f5f5f5',
                  color: '#666',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                }}
              >
                Completed ({completedTasks.length})
              </div>
              <TaskList
                tasks={completedTasks}
                onToggleComplete={handleToggleComplete}
                onDelete={handleDelete}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

export default App;
```

### Test Plan

| Test | Action | Expected Result |
|------|--------|-----------------|
| Initial load | Open `http://localhost:5173` | Shows "No tasks yet" or existing tasks |
| Add task | Type "Buy milk" and click Add | Task appears in list |
| Complete task | Click checkbox | Task moves to Completed section, strikethrough |
| Uncomplete task | Click checkbox on completed task | Task moves back to main list |
| Delete task | Click trash icon | Task removed from list |
| Empty title | Try to add with empty input | Button disabled, nothing happens |
| API error | Stop API server, try to add task | Error message displayed |
| Dismiss error | Click X on error | Error disappears |
| Loading state | Refresh page | "Loading..." shown briefly |

### Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| API server down | Error message "Failed to load tasks" |
| Network timeout | Error displayed after timeout |
| Rapid clicking complete | Each click toggles state correctly |
| Rapid clicking delete | Task deleted once, no errors |
| Very long task title | Displays correctly, wraps if needed |
| Special characters in title | Displays correctly (XSS safe by React) |
| Refresh while adding | Task persists if API succeeded |

---

## Phase 5: LLM Integration

### Goal
Integrate gpt-oss-20b to parse voice input and extract task title.

### Deliverable
Voice endpoint that accepts raw text, parses it, and creates a task.

### Steps

#### 5.1 Start Ollama and Pull Model

```bash
# Start Ollama service (if using Docker)
docker compose up -d ollama

# Pull gpt-oss-20b model (may take several minutes)
docker exec -it lifetracker-ollama ollama pull gpt-oss:20b

# Verify model works
docker exec -it lifetracker-ollama ollama run gpt-oss:20b "Extract the task from: Add buy milk to my list"
```

#### 5.2 Create LLM Client

Create `packages/api/src/services/llm.ts`:
```typescript
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL = 'gpt-oss:20b';

interface ParsedTask {
  title: string;
  confidence: 'high' | 'medium' | 'low';
  parseWarning: boolean;
  parseErrors: string | null;
}

interface OllamaResponse {
  response: string;
  done: boolean;
}

export async function parseTaskInput(rawInput: string): Promise<ParsedTask> {
  const prompt = buildPrompt(rawInput);

  try {
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        prompt,
        stream: false,
        options: {
          temperature: 0.1, // Low temperature for consistent extraction
          num_predict: 200, // Limit response length
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.status}`);
    }

    const data: OllamaResponse = await response.json();
    return parseResponse(data.response, rawInput);
  } catch (error) {
    // LLM failed, return raw input as title
    console.error('LLM parsing failed:', error);
    return {
      title: cleanFallbackTitle(rawInput),
      confidence: 'low',
      parseWarning: true,
      parseErrors: `LLM parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

function buildPrompt(input: string): string {
  return `You are a task extraction assistant. Extract the task title from the user's voice input.

Rules:
1. Extract only the core task action (what needs to be done)
2. Remove filler words like "add", "create", "remind me to", "I need to"
3. Remove list references like "to my list", "to inbox", "to groceries"
4. Keep the task title concise but complete
5. Respond with ONLY a JSON object, no other text

Examples:
Input: "Add buy milk to my grocery list"
Output: {"title": "Buy milk"}

Input: "Remind me to call the dentist tomorrow"
Output: {"title": "Call the dentist"}

Input: "I need to finish the report by Friday"
Output: {"title": "Finish the report"}

Input: "Add task research health insurance options"
Output: {"title": "Research health insurance options"}

Input: "Buy eggs"
Output: {"title": "Buy eggs"}

Now extract the task from this input:
Input: "${input.replace(/"/g, '\\"')}"
Output:`;
}

function parseResponse(response: string, rawInput: string): ParsedTask {
  // Try to extract JSON from response
  const jsonMatch = response.match(/\{[\s\S]*?\}/);

  if (!jsonMatch) {
    return {
      title: cleanFallbackTitle(rawInput),
      confidence: 'low',
      parseWarning: true,
      parseErrors: 'Could not parse LLM response as JSON',
    };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.title || typeof parsed.title !== 'string') {
      return {
        title: cleanFallbackTitle(rawInput),
        confidence: 'low',
        parseWarning: true,
        parseErrors: 'LLM response missing title field',
      };
    }

    const title = parsed.title.trim();

    if (title.length === 0) {
      return {
        title: cleanFallbackTitle(rawInput),
        confidence: 'low',
        parseWarning: true,
        parseErrors: 'LLM returned empty title',
      };
    }

    return {
      title,
      confidence: 'high',
      parseWarning: false,
      parseErrors: null,
    };
  } catch (e) {
    return {
      title: cleanFallbackTitle(rawInput),
      confidence: 'low',
      parseWarning: true,
      parseErrors: `JSON parse error: ${e instanceof Error ? e.message : 'Unknown'}`,
    };
  }
}

function cleanFallbackTitle(input: string): string {
  // Basic cleanup for fallback
  return input
    .replace(/^(add|create|remind me to|i need to)\s+/i, '')
    .replace(/\s+(to my list|to inbox|to my inbox)$/i, '')
    .trim() || input;
}

// Health check for LLM service
export async function checkLLMHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`);
    if (!response.ok) return false;

    const data = await response.json();
    const hasModel = data.models?.some((m: any) => m.name.startsWith('gpt-oss'));
    return hasModel;
  } catch {
    return false;
  }
}
```

#### 5.3 Create Voice Input Endpoint

Create `packages/api/src/routes/voice.ts`:
```typescript
import { FastifyInstance } from 'fastify';
import { prisma } from '@lifetracker/core';
import { parseTaskInput, checkLLMHealth } from '../services/llm';
import { verifyApiKey } from '../middleware/auth';
import { z } from 'zod';

const voiceInputSchema = z.object({
  input: z.string().min(1).max(1000),
});

export async function voiceRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', verifyApiKey);

  // POST /api/voice - Process voice input
  fastify.post('/voice', async (request, reply) => {
    const parseResult = voiceInputSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: 'Input is required and must be between 1-1000 characters',
      });
    }

    const { input } = parseResult.data;

    // Parse input with LLM
    const parsed = await parseTaskInput(input);

    // Get Inbox list
    const inbox = await prisma.list.findUnique({
      where: { name: 'inbox' },
    });

    if (!inbox) {
      return reply.status(500).send({
        error: 'Server Error',
        message: 'Inbox list not found',
      });
    }

    // Create task
    const task = await prisma.task.create({
      data: {
        title: parsed.title,
        listId: inbox.id,
        rawInput: input,
        parseWarning: parsed.parseWarning,
        parseErrors: parsed.parseErrors,
      },
      include: { list: true },
    });

    // Return response suitable for iOS Shortcut notification
    return {
      success: true,
      message: `Added: ${task.title}`,
      task,
      parsing: {
        confidence: parsed.confidence,
        warning: parsed.parseWarning,
        errors: parsed.parseErrors,
      },
    };
  });

  // GET /api/voice/health - Check LLM availability
  fastify.get('/voice/health', async () => {
    const llmHealthy = await checkLLMHealth();
    return {
      status: llmHealthy ? 'ok' : 'degraded',
      llm: llmHealthy ? 'available' : 'unavailable',
      message: llmHealthy
        ? 'LLM is ready'
        : 'LLM unavailable, will use fallback parsing',
    };
  });
}
```

#### 5.4 Register Voice Routes

Update `packages/api/src/server.ts`:
```typescript
import { voiceRoutes } from './routes/voice';

// Add after other route registrations:
server.register(voiceRoutes, { prefix: '/api' });
```

#### 5.5 Update Health Check

Update health endpoint in `packages/api/src/server.ts`:
```typescript
import { checkLLMHealth } from './services/llm';

server.get('/health', async () => {
  const llmHealthy = await checkLLMHealth();
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      api: 'healthy',
      llm: llmHealthy ? 'healthy' : 'degraded',
    },
  };
});
```

### Test Plan

| Test | Command/Action | Expected Result |
|------|----------------|-----------------|
| Check LLM health | `curl -H "X-API-Key: ..." http://localhost:3000/api/voice/health` | `{"status":"ok","llm":"available"}` |
| Parse simple input | `curl -X POST -H "X-API-Key: ..." -H "Content-Type: application/json" -d '{"input":"Add buy milk"}' http://localhost:3000/api/voice` | Task created with title "Buy milk" |
| Parse with filler | `curl ... -d '{"input":"Remind me to call the dentist tomorrow"}'` | Title: "Call the dentist" |
| Parse minimal | `curl ... -d '{"input":"eggs"}'` | Title: "Eggs" (or similar) |
| Verify in UI | Check web app | New task appears |
| LLM unavailable | Stop Ollama, send request | Task created with fallback parsing, parseWarning=true |

### Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Empty input | 400 Validation Error |
| Very long input (>1000 chars) | 400 Validation Error |
| Gibberish input | Task created with original input as title, warning set |
| LLM timeout (slow response) | Falls back to simple parsing after timeout |
| LLM returns invalid JSON | Falls back, sets parseErrors |
| LLM returns empty title | Falls back to cleaned input |
| Special characters | Handled correctly, no injection |
| Unicode/emoji | Preserved in title |
| Multiple sentences | LLM extracts primary task |

---

## Phase 6: iOS Shortcut Integration

### Goal
Create iOS Shortcut that captures voice, sends to API, and shows confirmation.

### Deliverable
Working iOS Shortcut triggered by Action Button or manually.

### Steps

#### 6.1 Ensure API is Accessible

Before creating the shortcut, verify the API is accessible from your phone:

1. Ensure your home server is accessible via `life.maverickapplications.com`
2. Or use local IP during development (e.g., `http://192.168.1.100:3000`)
3. Test with: `curl https://life.maverickapplications.com/health` from another device

#### 6.2 Create iOS Shortcut

Open the Shortcuts app on iPhone and create a new shortcut:

**Step 1: Dictate Text**
- Add action: "Dictate Text"
- This will prompt for voice input and return transcribed text

**Step 2: Set Variable**
- Add action: "Set Variable"
- Variable Name: `SpokenText`
- Input: (Dictate Text result)

**Step 3: Get Contents of URL (API Call)**
- Add action: "Get Contents of URL"
- URL: `https://life.maverickapplications.com/api/voice`
- Method: POST
- Headers:
  - `X-API-Key`: `your-api-key-here`
  - `Content-Type`: `application/json`
- Request Body: JSON
  - Add field: `input` = `SpokenText` (variable)

**Step 4: Get Dictionary Value**
- Add action: "Get Dictionary Value"
- Key: `message`
- Dictionary: (Result of URL request)

**Step 5: Show Notification**
- Add action: "Show Notification"
- Title: "LifeTracker"
- Body: (Dictionary Value result)

**Step 6: Error Handling (Optional)**
- Wrap steps 3-5 in "If" block
- Check if URL result has error
- If error: Show notification "Server unavailable"
- Then: Add to Reminders with "[PENDING]" prefix (fallback)

#### 6.3 Shortcut with Error Handling (Full Version)

```
1. Dictate Text
   └─> Save to variable: SpokenText

2. If SpokenText has any value

   3. Get Contents of URL
      URL: https://life.maverickapplications.com/api/voice
      Method: POST
      Headers:
        X-API-Key: [your-key]
        Content-Type: application/json
      Body (JSON):
        input: [SpokenText]
      └─> Save to variable: Response

   4. If Response has any value

      5. Get Dictionary Value
         Key: message
         From: Response
         └─> Save to variable: Message

      6. Show Notification
         Title: LifeTracker ✓
         Body: [Message]

   Otherwise (API failed):

      7. Show Notification
         Title: LifeTracker
         Body: Server unavailable. Saving for later.

      8. Add New Reminder
         Title: [PENDING] [SpokenText]
         List: Reminders

Otherwise (No speech):

   9. Show Notification
      Title: LifeTracker
      Body: No input detected
```

#### 6.4 Assign to Action Button (Optional)

1. Go to Settings > Action Button
2. Select "Shortcut"
3. Choose your LifeTracker shortcut

#### 6.5 Test the Shortcut

Run the shortcut and say: "Add buy milk"

Expected flow:
1. Phone listens for speech
2. Transcribes to text
3. Sends to API
4. Shows notification: "Added: Buy milk"
5. Task appears in web app

### Test Plan

| Test | Action | Expected Result |
|------|--------|-----------------|
| Basic voice input | Say "Add buy milk" | Notification: "Added: Buy milk" |
| Complex input | Say "Remind me to call mom tomorrow" | Task created with cleaned title |
| No speech | Trigger shortcut, stay silent | "No input detected" notification |
| Server offline | Stop API, trigger shortcut | "Server unavailable" notification |
| Offline fallback | (If implemented) Check Reminders | "[PENDING]" item in Reminders |
| Network timeout | Slow/no network | Error notification |
| Verify in web | After success, check web app | Task appears in list |

### Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Poor transcription | Task created with what was heard (LLM helps clean) |
| Background noise | May create task with noise transcription |
| Shortcut interrupted | No task created |
| API returns error | Error notification shown |
| Very long dictation | May hit input limit, truncated or error |
| No internet | iOS shows network error |
| Action button double-press | Two shortcuts run (user should avoid) |

---

## Phase 7: Integration Testing & Polish

### Goal
Verify complete end-to-end flow works reliably, fix any issues.

### Deliverable
Stable PoC ready for daily use.

### Steps

#### 7.1 End-to-End Test Checklist

| # | Test Scenario | Steps | Pass Criteria |
|---|--------------|-------|---------------|
| 1 | Full voice flow | Trigger shortcut → speak → check web | Task appears within 5 seconds |
| 2 | Manual web add | Open web → type task → click Add | Task appears immediately |
| 3 | Complete task (web) | Click checkbox | Task shows strikethrough, moves to Completed |
| 4 | Complete task (voice) | Say "Complete buy milk" | (Not implemented in PoC - note for MVP) |
| 5 | Delete task | Click trash icon | Task removed |
| 6 | Multiple rapid adds | Add 5 tasks quickly | All 5 appear correctly |
| 7 | Server restart | Restart API → refresh web | All data persists |
| 8 | LLM restart | Restart Ollama → add via voice | Still works (may use fallback) |
| 9 | Concurrent access | Open on phone and desktop | Both show same tasks |

#### 7.2 Performance Benchmarks

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Voice → Notification | < 5 seconds | Stopwatch from end of speech |
| Web page load | < 2 seconds | Browser DevTools |
| Task creation (API) | < 500ms | API logs |
| LLM parsing | < 3 seconds | API logs |

#### 7.3 Create Startup Script

Create `scripts/start-dev.sh`:
```bash
#!/bin/bash

echo "Starting LifeTracker development environment..."

# Start Docker services
echo "Starting PostgreSQL and Ollama..."
docker compose up -d

# Wait for PostgreSQL
echo "Waiting for PostgreSQL..."
until docker exec lifetracker-db pg_isready -U lifetracker > /dev/null 2>&1; do
  sleep 1
done
echo "PostgreSQL ready!"

# Check if database is seeded
echo "Checking database..."
cd packages/core
bun run db:push
bun run db:seed
cd ../..

# Check Ollama model
echo "Checking LLM model..."
if ! docker exec lifetracker-ollama ollama list | grep -q "gpt-oss"; then
  echo "Pulling gpt-oss model (this may take a while)..."
  docker exec lifetracker-ollama ollama pull gpt-oss:20b
fi
echo "LLM ready!"

# Start API (background)
echo "Starting API server..."
cd packages/api
bun run dev &
API_PID=$!
cd ../..

# Wait for API
echo "Waiting for API..."
until curl -s http://localhost:3000/health > /dev/null 2>&1; do
  sleep 1
done
echo "API ready!"

# Start Web (foreground)
echo "Starting web app..."
cd packages/web
bun run dev

# Cleanup on exit
trap "kill $API_PID 2>/dev/null; docker compose down" EXIT
```

Make executable: `chmod +x scripts/start-dev.sh`

#### 7.4 Create Production Deployment Notes

Create `DEPLOYMENT.md`:
```markdown
# LifeTracker Deployment

## Prerequisites
- Domain pointing to server: life.maverickapplications.com
- SSL certificate (Let's Encrypt recommended)
- Reverse proxy (nginx/caddy)

## Environment Variables
```bash
DATABASE_URL="postgresql://user:pass@localhost:5432/lifetracker"
API_KEY="generate-secure-random-string"
OLLAMA_URL="http://localhost:11434"
NODE_ENV="production"
```

## Build for Production
```bash
bun run build
```

## Run with PM2 (or Bun directly)
```bash
# Option 1: PM2 (requires Node.js)
pm2 start packages/api/dist/server.js --name lifetracker-api

# Option 2: Bun (recommended)
bun packages/api/src/server.ts
```

## Nginx Config Example
```nginx
server {
    listen 443 ssl;
    server_name life.maverickapplications.com;

    ssl_certificate /etc/letsencrypt/live/.../fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/.../privkey.pem;

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        root /path/to/packages/web/dist;
        try_files $uri /index.html;
    }
}
```
```

### Test Plan

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Startup script | Run `./scripts/start-dev.sh` | All services start, URLs printed |
| Health check | `curl http://localhost:3000/health` | All services healthy |
| Full E2E | Use iOS Shortcut → Check web | Task visible in both |
| Data persistence | Add task → Restart all → Check | Task still exists |
| Error recovery | Stop Ollama → Add via voice → Start Ollama | First task uses fallback, subsequent work |

---

## Summary Checklist

### Phase Completion Tracking

| Phase | Status | Notes |
|-------|--------|-------|
| 1. Project Scaffold | ☐ | |
| 2. Database Setup | ☐ | |
| 3. API Endpoints | ☐ | |
| 4. Frontend UI | ☐ | |
| 5. LLM Integration | ☐ | |
| 6. iOS Shortcut | ☐ | |
| 7. Integration Testing | ☐ | |

### Definition of Done (PoC Complete)

- [ ] Can speak "Add buy milk" on iPhone
- [ ] Task "Buy milk" appears in web UI within 5 seconds
- [ ] Can mark task complete in web UI
- [ ] Can delete task in web UI
- [ ] Can add task directly in web UI
- [ ] Tasks persist across server restarts
- [ ] System recovers gracefully from LLM being unavailable
- [ ] Error messages are user-friendly
- [ ] All tests in this document pass

---

## Files Created Summary

| File | Purpose |
|------|---------|
| `package.json` | Monorepo root (includes Bun workspaces config) |
| `turbo.json` | Build pipeline |
| `docker-compose.yml` | PostgreSQL + Ollama |
| `.env` | Environment variables |
| `.gitignore` | Git ignore rules |
| `packages/core/package.json` | Core package config |
| `packages/core/tsconfig.json` | TypeScript config |
| `packages/core/prisma/schema.prisma` | Database schema |
| `packages/core/prisma/seed.ts` | Seed Inbox list |
| `packages/core/src/index.ts` | Prisma client export |
| `packages/api/package.json` | API package config |
| `packages/api/tsconfig.json` | TypeScript config |
| `packages/api/src/server.ts` | Fastify server |
| `packages/api/src/middleware/auth.ts` | API key auth |
| `packages/api/src/schemas/task.ts` | Zod validation |
| `packages/api/src/routes/tasks.ts` | Task CRUD routes |
| `packages/api/src/routes/lists.ts` | List routes |
| `packages/api/src/routes/voice.ts` | Voice input route |
| `packages/api/src/services/llm.ts` | LLM integration |
| `packages/web/package.json` | Web package config |
| `packages/web/tsconfig.json` | TypeScript config |
| `packages/web/vite.config.ts` | Vite config |
| `packages/web/index.html` | HTML entry |
| `packages/web/src/main.tsx` | React entry |
| `packages/web/src/App.tsx` | Main component |
| `packages/web/src/api/client.ts` | API client |
| `packages/web/src/components/TaskList.tsx` | Task list component |
| `packages/web/src/components/AddTaskForm.tsx` | Add task form |
| `packages/web/src/components/ErrorMessage.tsx` | Error display |
| `scripts/start-dev.sh` | Dev startup script |
| `DEPLOYMENT.md` | Production notes |
