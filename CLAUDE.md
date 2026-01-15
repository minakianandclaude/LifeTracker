# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LifeTracker is a personal productivity application with voice-first natural language input. Users speak commands via iOS/macOS Shortcuts, which are processed by a self-hosted LLM to extract tasks, expenses, workouts, etc.

**Current Status**: PoC development in progress. Phases 1-5 complete, Phase 6 (iOS Shortcut) is next.

## Development Progress

| Phase | Status | PR |
|-------|--------|-----|
| Phase 1: Project Scaffold | ✅ Complete | #1 merged |
| Phase 2: Database Setup | ✅ Complete | #2 merged |
| Phase 3: API Endpoints | ✅ Complete | #3 merged |
| Phase 4: Frontend UI | ✅ Complete | #5 merged |
| Phase 5: LLM Integration | ✅ Complete | #7 merged |
| Phase 6: iOS Shortcut | 🔜 Next | - |
| Phase 7: Integration Testing | ⏳ Pending | - |

### Current Branch Strategy
- Always create feature branches off `main`: `feature/phase-N-description`
- Pull latest `main` before starting new phase
- Create PR after each phase completion

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime/Package Manager | Bun |
| Monorepo | Bun Workspaces + Turborepo |
| Language | TypeScript (strict mode) |
| Backend | Fastify (on Bun) |
| Database | PostgreSQL |
| ORM | Prisma |
| Frontend | React 18 + Vite |
| State | Zustand |
| Styling | Tailwind CSS |
| LLM | gpt-oss-20b via Ollama |
| Auth | API Key (PoC) → JWT + Refresh Tokens (MVP) |

## Current Project Structure

```
lifetracker/
├── packages/
│   ├── core/                    # Shared utilities, Prisma client
│   │   ├── src/index.ts         # Exports prisma singleton
│   │   ├── prisma/
│   │   │   ├── schema.prisma    # List + Task models
│   │   │   └── seed.ts          # Seeds Inbox list
│   │   └── .env -> ../../.env   # Symlink to root .env
│   ├── api/                     # Fastify API server
│   │   ├── src/
│   │   │   ├── server.ts        # Main server with CORS, routes, error handler
│   │   │   ├── middleware/
│   │   │   │   └── auth.ts      # API key verification
│   │   │   ├── routes/
│   │   │   │   ├── tasks.ts     # Task CRUD + toggle complete
│   │   │   │   └── lists.ts     # List read endpoints
│   │   │   └── schemas/
│   │   │       └── task.ts      # Zod validation schemas
│   │   └── .env -> ../../.env   # Symlink to root .env
│   └── web/                     # React + Vite frontend
│       ├── src/
│       │   ├── main.tsx         # React entry point
│       │   ├── App.tsx          # Main app with state management
│       │   ├── api/
│       │   │   └── client.ts    # API client with Task/List types
│       │   └── components/
│       │       ├── TaskList.tsx     # Task list with checkboxes
│       │       ├── AddTaskForm.tsx  # Add task form
│       │       └── ErrorMessage.tsx # Dismissible error display
│       ├── index.html
│       └── vite.config.ts       # Vite config with API proxy
├── .env                         # DATABASE_URL, API_KEY, OLLAMA_URL
├── .env.example                 # Template for .env
├── docker-compose.yml           # PostgreSQL + API + Web (with Traefik)
├── package.json                 # Bun workspaces root
├── turbo.json                   # Turborepo config
└── tsconfig.json                # Root TypeScript config
```

## Commands

```bash
# Install dependencies
bun install

# Development
bun run dev              # Start all services via Turborepo
bun run build            # Build all packages

# Database
cd packages/core
bun run db:generate      # Generate Prisma client
bun run db:push          # Push schema to database
bun run db:migrate       # Run migrations
bun run db:seed          # Seed Inbox list
bun run db:studio        # Open Prisma Studio

# Individual packages
cd packages/api && bun run dev    # API on port 3000
cd packages/web && bun run dev    # Web on port 5173

# Docker services (development - local servers)
docker compose up -d postgres     # Start PostgreSQL only

# Docker services (full stack with Traefik)
docker compose up -d              # Start all services (postgres, api, web)
```

## Architecture

### Module System

Each module is self-contained and exports a standard interface:

```typescript
export const tasksModule: Module = {
  name: 'tasks',
  routes: (router) => { /* CRUD endpoints */ },
  intents: [ /* LLM intent patterns for routing */ ],
  parseIntent: async (input, llm) => { /* Module-specific LLM parsing */ },
};
```

### Voice Input Flow

```
iOS Shortcut (Dictate Text) → POST /api/voice → LLM parses intent → Module handles action → Response notification
```

### Authentication

- **Shortcuts**: API Key via `X-API-Key` header
- **Web App**: JWT access token (15min) + refresh token (7 days) in httpOnly cookies

### Offline Resilience

- iOS Shortcut: Falls back to iOS Reminders with `[PENDING]` prefix
- Web App: IndexedDB queue with sync on reconnect

## Key Design Decisions

- **List Names**: Stored lowercase/trimmed, displayed as Title Case
- **Inbox**: System list, cannot be deleted. Default destination for unparseable input
- **Parse Warnings**: Tasks have `parse_warning` boolean for "Teach the System" correction UI
- **Priorities**: Optional 3-level (HIGH/MEDIUM/LOW), voice shortcuts: "p1", "p2", "p3"
- **Due Dates Only**: No reminders in MVP
- **Flat Tasks**: No subtasks in MVP

## Development Best Practices

### Code Style & Conventions

- **TypeScript Strict Mode**: Always enabled. No `any` types unless absolutely necessary and documented
- **Naming Conventions**:
  - Files: `kebab-case.ts` for utilities, `PascalCase.tsx` for React components
  - Variables/functions: `camelCase`
  - Types/interfaces: `PascalCase`
  - Constants: `SCREAMING_SNAKE_CASE`
  - Database columns: `snake_case` (Prisma maps to camelCase)
- **Imports**: Group in order: external packages → internal packages (`@lifetracker/*`) → relative imports
- **Export Style**: Prefer named exports over default exports for better refactoring support
- **Function Length**: Maximum 30 lines per function. Extract helper functions for complex logic
- **File Length**: Maximum 300 lines per file. Split into multiple modules when exceeded
- **Early Returns**: Prefer guard clauses to handle edge cases and validation first, reducing nesting

### Error Handling

- Use custom error classes that extend a base `AppError` class with error codes
- API errors return consistent JSON structure: `{ error: { code, message, details? } }`
- Never expose internal error details or stack traces in production responses
- Log errors with context (user ID, request ID, operation) for debugging
- Use Zod for runtime validation of external inputs (API requests, LLM responses)

### Testing

- **Unit Tests**: Required for business logic, utilities, and parsing functions
- **Integration Tests**: Required for API endpoints and database operations
- **Test File Location**: Co-locate with source files as `*.test.ts` or `*.spec.ts`
- **Test Naming**: Use descriptive names: `should return error when task title is empty`
- **Mocking**: Prefer dependency injection over module mocking; mock external services only
- **Coverage Target**: 80%+ for core business logic

### Git Workflow

- **Branch Naming**: `feature/`, `fix/`, `refactor/`, `docs/` prefixes (e.g., `feature/task-crud`)
- **Commit Messages**: Use conventional commits format:
  - `feat:` new feature
  - `fix:` bug fix
  - `refactor:` code restructuring
  - `test:` adding/updating tests
  - `docs:` documentation changes
  - `chore:` maintenance tasks
- **No AI Attribution**: Do not include "Co-Authored-By: Claude" or any AI attribution in commit messages or pull request descriptions
- **Pull Requests**: Include description, testing notes, and link to related issues. Do not include AI attribution or "Generated with Claude" footers
- **Squash Merges**: Preferred for feature branches to maintain clean history

### Security Practices

- Never commit secrets, API keys, or credentials to the repository
- Use environment variables for all configuration (validated at startup)
- Sanitize and validate all user inputs before processing
- Use parameterized queries (Prisma handles this by default)
- Implement rate limiting on public endpoints
- Store passwords with bcrypt (cost factor 12+)
- Use HTTPS in production; set secure cookie flags

## Claude Code Hooks

This project uses Claude Code hooks (`.claude/settings.json`) to automate quality checks during development.

### Active Hooks

| Hook | Trigger | Action |
|------|---------|--------|
| Auto-format | After `.ts`/`.tsx` edits | Runs Biome to format code |
| Type-check | After TypeScript edits | Runs `tsc --noEmit` to catch type errors |
| Prisma sync | After `schema.prisma` edits | Regenerates Prisma client |
| Test runner | After code file edits | Runs co-located `.test.ts` files |
| Secret scanner | After file edits | Scans for hardcoded secrets (gitleaks or regex fallback) |
| Security alert | After security-sensitive file edits | Prompts to run security-code-reviewer agent |
| Pre-commit lint | Before `git commit` | Blocks commit if linting fails |
| Pre-commit secrets | Before `git commit` | Blocks commit if secrets detected in staged files |

### Security Agent Integration

When the hooks detect security-sensitive code (auth, passwords, tokens, SQL queries, etc.), they prompt you to run the **security-code-reviewer agent**. To invoke it:

```
Ask Claude: "Run security review on the recent changes"
```

Or for specific files:
```
Ask Claude: "Run security-code-reviewer agent on packages/api/src/auth/"
```

The security agent checks for:
- OWASP Top 10 vulnerabilities
- Injection flaws (SQL, XSS, command injection)
- Authentication/authorization issues
- Sensitive data exposure
- Cryptographic failures
- Security misconfigurations

### Prerequisites for Full Hook Functionality

```bash
# Install Biome for formatting
bun add -D @biomejs/biome

# Install gitleaks for secret scanning (recommended)
brew install gitleaks

# Configure Biome
bunx biome init
```

## Development Agents

This project uses 15 specialized agents in `.claude/agents/` to enable parallel development and maintain quality. The main Claude instance acts as an **orchestrator** that dispatches agents for implementation work.

### Orchestration Pattern

```
Main Instance (Orchestrator)
    │
    ├── Reads development-plan.md
    ├── Tracks progress via TodoWrite
    ├── Dispatches parallel agents for independent tasks
    ├── Reviews results and coordinates integration
    └── Keeps context focused on big picture
```

### Code Development Agents (dispatch for implementation)

| Agent | Purpose | Use When |
|-------|---------|----------|
| `code-developer` | General full-stack implementation | Cross-cutting tasks, project setup, utilities |
| `backend-developer` | Fastify routes, middleware, services, Zod schemas | API endpoint implementation |
| `frontend-developer` | React components, hooks, Zustand stores, Tailwind | UI implementation |
| `database-developer` | Prisma schemas, migrations, seed scripts, queries | Database work |
| `module-scaffolder` | Creates new modules following established pattern | Adding finance/fitness/shopping modules |

### Quality & Testing Agents (dispatch after code is written)

| Agent | Purpose | Use When |
|-------|---------|----------|
| `tdd-test-architect` | Define tests before implementation, validate after | Starting new features, validating implementations |
| `security-code-reviewer` | OWASP security review | After writing auth, input handling, or sensitive code |
| `code-simplifier` | Identify unnecessary complexity | After completing features, during refactoring |
| `api-integration-tester` | End-to-end API flow testing | After API changes, before releases |

### Project-Specific Agents

| Agent | Purpose | Use When |
|-------|---------|----------|
| `llm-prompt-engineer` | Voice input parsing prompts for gpt-oss-20b | Improving extraction accuracy, adding new intents |
| `prisma-migration-advisor` | Safe database schema changes | Schema modifications, new modules |
| `performance-validator` | Test against targets (<5s voice, <2s page load) | After changes, before releases |
| `offline-resilience-tester` | IndexedDB queue, sync behavior testing | Offline feature work |

### Architecture Agents (for design decisions)

| Agent | Purpose | Use When |
|-------|---------|----------|
| `architecture-advisor` | System design guidance | Major architectural decisions |
| `software-architect` | High-level design patterns | Structural changes, new patterns |

### Parallel Development Example

Per `development-plan.md`, many tasks can be parallelized:

```
Phase 1 (Project Scaffold):
    Dispatch 3 code-developer agents in parallel:
    ├── Agent 1: packages/core setup
    ├── Agent 2: packages/api setup
    └── Agent 3: packages/web setup

Phase 3B (API Routes):
    Dispatch 2 backend-developer agents in parallel:
    ├── Agent 1: Task routes (3B.1)
    └── Agent 2: List routes (3B.2)

Phase 4B (UI Components):
    Dispatch 3 frontend-developer agents in parallel:
    ├── Agent 1: TaskList component
    ├── Agent 2: AddTaskForm component
    └── Agent 3: ErrorMessage component
```

### API Design

- Follow RESTful conventions: `GET /tasks`, `POST /tasks`, `PATCH /tasks/:id`
- Use proper HTTP status codes: 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 404 Not Found, 500 Internal Server Error
- Version APIs when breaking changes are needed: `/api/v1/`
- Include pagination for list endpoints: `?page=1&limit=20`
- Return consistent response shapes across all endpoints

### React & Frontend

- **Component Structure**: One component per file; extract hooks into separate files when reusable
- **State Management**: Local state first, Zustand for shared/global state
- **Styling**: Use Tailwind utility classes; extract repeated patterns to component classes
- **Performance**: Memoize expensive computations; lazy-load routes and heavy components
- **Accessibility**: Include proper ARIA labels, keyboard navigation, and semantic HTML

### Database & Prisma

- Write migrations for schema changes; never edit production databases directly
- Use transactions for operations that modify multiple tables
- Add database indexes for frequently queried columns
- Use soft deletes (`deleted_at` timestamp) for user data when appropriate
- Keep Prisma schema as single source of truth for database types

### Code Review Guidelines

- Review for correctness, security, performance, and maintainability
- Check for proper error handling and edge cases
- Verify tests cover the changes
- Ensure no secrets or sensitive data in the code
- Look for opportunities to simplify or reduce duplication

### Documentation

- Document public APIs with JSDoc comments
- Keep README and CLAUDE.md updated with architectural changes
- Document non-obvious business logic with inline comments
- Write ADRs (Architecture Decision Records) for significant technical decisions

## Reference Documents

| Document | Purpose |
|----------|---------|
| `life-tracker-spec.md` | Full project specification and architecture |
| `tasks-module-spec.md` | Tasks module requirements and entity definitions |
| `development-plan.md` | High-level development phases and task tracking |
| `poc-development-plan.md` | Detailed PoC implementation steps with code examples |

## Quick Start (Development)

```bash
# 1. Copy environment file
cp .env.example .env

# 2. Start PostgreSQL
docker compose up -d postgres

# 3. Install dependencies
bun install

# 4. Setup database
cd packages/core
bun run db:push
bun run db:seed
cd ../..

# 5. Start development servers
# Terminal 1: API server (port 3000)
cd packages/api && bun run dev

# Terminal 2: Web server (port 5173)
cd packages/web && bun run dev
```

## API Endpoints (Implemented)

All endpoints require `X-API-Key: dev-api-key-change-in-production` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check (no auth) |
| GET | `/api/tasks` | List all tasks |
| POST | `/api/tasks` | Create task |
| GET | `/api/tasks/:id` | Get task by ID |
| PATCH | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| POST | `/api/tasks/:id/complete` | Toggle completion |
| GET | `/api/lists` | List all lists |
| GET | `/api/lists/:id` | Get list with tasks |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `API_KEY` | API authentication key | `dev-api-key-change-in-production` |
| `OLLAMA_URL` | Ollama LLM endpoint | `http://localhost:11434` |

## Deployment (Traefik)

The application can be deployed using Docker with Traefik for HTTPS routing.

### Prerequisites

- Traefik running with Docker provider and Let's Encrypt configured
- External `traefik` Docker network created
- DNS A record pointing to your server

### Deploy

```bash
# Start all services
docker compose up -d

# Services will be available at:
# https://lifetracker.maverickapplications.com
```

### Docker Services

| Service | Container | Port | Description |
|---------|-----------|------|-------------|
| postgres | lifetracker-db | 5433:5432 | PostgreSQL database |
| api | lifetracker-api | 3000 (internal) | Fastify API server |
| web | lifetracker-web | 5173 (internal) | Vite dev server |

### Traefik Labels

The API and web services include Traefik labels for automatic routing:
- API routes: `/api/*` and `/health` → lifetracker-api:3000
- Web routes: `/*` → lifetracker-web:5173
- TLS: Auto-provisioned via Let's Encrypt

### Environment Variables in Docker

The API container uses these environment variables:
- `DATABASE_URL`: Points to `postgres:5432` (internal Docker network)
- `API_KEY`: From host `.env` or default
- `OLLAMA_URL`: Points to `host.docker.internal:11434` for local Ollama

## Important Notes

- **Bun Path**: Bun is installed at `~/.bun/bin/bun`. Use `PATH="$HOME/.bun/bin:$PATH"` if needed.
- **Docker Required**: PostgreSQL runs in Docker. Start with `docker compose up -d postgres`.
- **PostgreSQL Port**: Uses port 5433 (not 5432) to avoid conflicts with other PostgreSQL instances.
- **Inbox List**: System list with `is_system=true`, `is_deletable=false`. Created by seed script.
- **Environment Symlinks**: Both `packages/core/.env` and `packages/api/.env` are symlinks to root `.env`.
- **Ollama**: Not included in docker-compose; expects local Ollama installation with `gpt-oss:20b` model.
