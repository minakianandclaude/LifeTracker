# LifeTracker MVP — Development Plan

## Overview

This document outlines the phased development plan for the LifeTracker MVP (Minimum Viable Product). Building on the completed PoC, the MVP delivers a production-ready Tasks module with full features.

**Starting Point**: Working PoC with basic task CRUD, voice input, and simple LLM parsing.

**End State**: Full-featured Tasks module with JWT authentication, tags, lists management, responsive design, and macOS integration.

---

## Table of Contents

| Phase | Description | Status |
|-------|-------------|--------|
| [Phase 1](#phase-1-database-schema-extension) | Database Schema Extension | Pending |
| [Phase 2](#phase-2-authentication-system) | Authentication System (JWT) | Pending |
| [Phase 3](#phase-3-list-management) | List Management (Full CRUD) | Pending |
| [Phase 4](#phase-4-tags-system) | Tags System | Pending |
| [Phase 5](#phase-5-enhanced-task-features) | Enhanced Task Features | Pending |
| [Phase 6](#phase-6-full-llm-parsing) | Full LLM Parsing | Pending |
| [Phase 7](#phase-7-responsive-ui) | Responsive UI | Pending |
| [Phase 8](#phase-8-macos-shortcut-integration) | macOS Shortcut Integration | Pending |
| [Phase 9](#phase-9-integration-testing--polish) | Integration Testing & Polish | Pending |

**Other Sections:**
- [MVP Scope Summary](#mvp-scope-summary)
- [Prerequisites](#prerequisites)
- [Definition of Done](#definition-of-done)

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

## Phase 1: Database Schema Extension

### Goal
Extend the database schema to support all MVP features: tags, user authentication, and any missing task fields.

### Deliverable
Updated Prisma schema with migrations applied, ready for new features.

### Sub-Phase 1A: Schema Design

| # | Task | Parallel Group | Status |
|---|------|----------------|--------|
| 1A.1 | Add User model (id, username, passwordHash, createdAt) | A | Pending |
| 1A.2 | Add RefreshToken model (id, token, userId, expiresAt, createdAt) | A | Pending |
| 1A.3 | Add Tag model (id, name, createdAt) | A | Pending |
| 1A.4 | Add TaskTag join table (taskId, tagId) | A | Pending |
| 1A.5 | Update Task model (ensure all fields from spec are present) | A | Pending |

### Sub-Phase 1B: Migration & Seed

| # | Task | Status |
|---|------|--------|
| 1B.1 | Create Prisma migration for new models | Pending |
| 1B.2 | Update seed script (create default admin user) | Pending |
| 1B.3 | Run migration and verify with Prisma Studio | Pending |

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
| Seed admin user | `bun run db:seed` | Admin user created |

### Edge Cases

| Scenario | Handling |
|----------|----------|
| Migration conflicts with existing data | Prisma handles gracefully; existing tasks preserved |
| Duplicate tag names | Unique constraint prevents duplicates |
| Orphaned TaskTag records | Cascade delete cleans up when task/tag deleted |

---

## Phase 2: Authentication System

### Goal
Implement JWT-based authentication for the web app while maintaining API key auth for shortcuts.

### Deliverable
Working login/logout with JWT access tokens (15min) and refresh tokens (7 days).

### Sub-Phase 2A: Backend Auth

| # | Task | Parallel Group | Status |
|---|------|----------------|--------|
| 2A.1 | Install bcrypt and jose dependencies | A | Pending |
| 2A.2 | Create password hashing utilities | A | Pending |
| 2A.3 | Create JWT utilities (sign, verify, refresh) | A | Pending |
| 2A.4 | Create auth service (login, logout, refresh) | B | Pending |
| 2A.5 | Create auth routes (POST /auth/login, POST /auth/logout, POST /auth/refresh) | B | Pending |
| 2A.6 | Update auth middleware to support both JWT and API key | C | Pending |
| 2A.7 | Add rate limiting for login attempts (5 attempts → 15min lockout) | C | Pending |

### Sub-Phase 2B: Cookie Configuration

| # | Task | Status |
|---|------|--------|
| 2B.1 | Configure httpOnly, Secure, SameSite=Strict cookies | Pending |
| 2B.2 | Set up access token cookie (15min expiry) | Pending |
| 2B.3 | Set up refresh token cookie (7 day expiry) | Pending |
| 2B.4 | Implement automatic token refresh logic | Pending |

### Sub-Phase 2C: Frontend Auth

| # | Task | Parallel Group | Status |
|---|------|----------------|--------|
| 2C.1 | Create login page component | A | Pending |
| 2C.2 | Create auth context/store (Zustand) | A | Pending |
| 2C.3 | Update API client for cookie-based auth | B | Pending |
| 2C.4 | Add automatic token refresh interceptor | B | Pending |
| 2C.5 | Add protected route wrapper | C | Pending |
| 2C.6 | Add logout functionality | C | Pending |

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

---

## Phase 3: List Management

### Goal
Implement full CRUD operations for lists with proper validation and auto-creation.

### Deliverable
Complete list management UI and API including create, rename, delete, and reorder.

### Sub-Phase 3A: API Endpoints

| # | Task | Parallel Group | Status |
|---|------|----------------|--------|
| 3A.1 | Create list validation schemas (Zod) | A | Pending |
| 3A.2 | Implement POST /api/lists (create list) | B | Pending |
| 3A.3 | Implement PATCH /api/lists/:id (rename list) | B | Pending |
| 3A.4 | Implement DELETE /api/lists/:id (delete list) | B | Pending |
| 3A.5 | Implement PATCH /api/lists/reorder (reorder lists) | B | Pending |
| 3A.6 | Add list name normalization (lowercase, trim) | A | Pending |
| 3A.7 | Prevent Inbox deletion/rename | C | Pending |

### Sub-Phase 3B: List Utilities

| # | Task | Status |
|---|------|--------|
| 3B.1 | Create normalizeListName utility | Pending |
| 3B.2 | Create displayListName utility (Title Case) | Pending |
| 3B.3 | Create slugifyListName utility | Pending |
| 3B.4 | Create findOrCreateList helper for voice input | Pending |

### Sub-Phase 3C: Frontend Components

| # | Task | Parallel Group | Status |
|---|------|----------------|--------|
| 3C.1 | Create ListSidebar component | A | Pending |
| 3C.2 | Create CreateListModal component | A | Pending |
| 3C.3 | Create RenameListModal component | A | Pending |
| 3C.4 | Create DeleteListConfirmation component | A | Pending |
| 3C.5 | Add list selection state to app | B | Pending |
| 3C.6 | Filter tasks by selected list | B | Pending |

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

---

## Phase 4: Tags System

### Goal
Implement freeform tags for cross-list task organization and filtering.

### Deliverable
Complete tag system with CRUD, task association, and filter UI.

### Sub-Phase 4A: API Endpoints

| # | Task | Parallel Group | Status |
|---|------|----------------|--------|
| 4A.1 | Create tag validation schemas | A | Pending |
| 4A.2 | Implement GET /api/tags (list all tags with usage count) | B | Pending |
| 4A.3 | Implement POST /api/tags (create tag) | B | Pending |
| 4A.4 | Implement DELETE /api/tags/:id (delete tag) | B | Pending |
| 4A.5 | Implement POST /api/tasks/:id/tags (add tag to task) | C | Pending |
| 4A.6 | Implement DELETE /api/tasks/:id/tags/:tagId (remove tag) | C | Pending |
| 4A.7 | Update task endpoints to include tags in response | C | Pending |

### Sub-Phase 4B: Frontend Components

| # | Task | Parallel Group | Status |
|---|------|----------------|--------|
| 4B.1 | Create TagBadge component | A | Pending |
| 4B.2 | Create TagInput component (autocomplete) | A | Pending |
| 4B.3 | Create TagFilter component (sidebar/header) | A | Pending |
| 4B.4 | Update TaskList to show tags | B | Pending |
| 4B.5 | Update AddTaskForm to support tags | B | Pending |
| 4B.6 | Add tag filtering to task views | C | Pending |

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

---

## Phase 5: Enhanced Task Features

### Goal
Extend task functionality with proper priority handling, due dates, notes, and improved completion behavior.

### Deliverable
Full task editing capabilities matching the specification.

### Sub-Phase 5A: API Updates

| # | Task | Parallel Group | Status |
|---|------|----------------|--------|
| 5A.1 | Update task validation for all fields | A | Pending |
| 5A.2 | Add priority enum handling | A | Pending |
| 5A.3 | Add due date handling with proper date parsing | A | Pending |
| 5A.4 | Add notes field support | A | Pending |
| 5A.5 | Implement completion behavior (completedAt timestamp) | B | Pending |
| 5A.6 | Add task filtering (by due date, priority, completion) | B | Pending |
| 5A.7 | Add task sorting options | B | Pending |

### Sub-Phase 5B: Frontend Components

| # | Task | Parallel Group | Status |
|---|------|----------------|--------|
| 5B.1 | Create TaskDetailModal component | A | Pending |
| 5B.2 | Create PrioritySelector component | A | Pending |
| 5B.3 | Create DueDatePicker component | A | Pending |
| 5B.4 | Create NotesEditor component | A | Pending |
| 5B.5 | Update TaskList item to show priority/due date | B | Pending |
| 5B.6 | Add completed tasks section with auto-hide logic | B | Pending |
| 5B.7 | Add sort controls to task list | C | Pending |
| 5B.8 | Add filter controls (due today, overdue, high priority) | C | Pending |

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

---

## Phase 6: Full LLM Parsing

### Goal
Enhance LLM prompts to extract all task fields from natural language input.

### Deliverable
Voice input that correctly extracts title, list, priority, due date, and tags.

### Sub-Phase 6A: Prompt Engineering

| # | Task | Status |
|---|------|--------|
| 6A.1 | Design comprehensive extraction prompt | Pending |
| 6A.2 | Add few-shot examples for each field type | Pending |
| 6A.3 | Handle relative dates (tomorrow, next Friday, in 3 days) | Pending |
| 6A.4 | Handle priority shortcuts (p1, p2, p3, high priority) | Pending |
| 6A.5 | Handle tag extraction ("tag it X", "tags: X, Y") | Pending |
| 6A.6 | Handle list references ("to my X list", "in X") | Pending |

### Sub-Phase 6B: Parser Implementation

| # | Task | Parallel Group | Status |
|---|------|----------------|--------|
| 6B.1 | Create enhanced parseTaskInput function | A | Pending |
| 6B.2 | Implement relative date resolution | A | Pending |
| 6B.3 | Implement list matching/auto-creation | B | Pending |
| 6B.4 | Implement tag matching/auto-creation | B | Pending |
| 6B.5 | Update voice endpoint to use all parsed fields | C | Pending |
| 6B.6 | Add confidence scoring for each extracted field | C | Pending |

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

---

## Phase 7: Responsive UI

### Goal
Create a fully mobile-optimized web experience with touch-friendly interactions.

### Deliverable
Responsive design that works great on phones, tablets, and desktops.

### Sub-Phase 7A: Layout & Navigation

| # | Task | Parallel Group | Status |
|---|------|----------------|--------|
| 7A.1 | Implement responsive layout (mobile-first) | A | Pending |
| 7A.2 | Create mobile navigation (hamburger menu or bottom nav) | A | Pending |
| 7A.3 | Create collapsible sidebar for lists | A | Pending |
| 7A.4 | Add swipe gestures for task actions (complete, delete) | B | Pending |
| 7A.5 | Optimize touch targets (min 44px) | B | Pending |

### Sub-Phase 7B: Component Updates

| # | Task | Parallel Group | Status |
|---|------|----------------|--------|
| 7B.1 | Update TaskList for mobile layout | A | Pending |
| 7B.2 | Update AddTaskForm for mobile | A | Pending |
| 7B.3 | Update TaskDetailModal for mobile (full screen) | A | Pending |
| 7B.4 | Add pull-to-refresh functionality | B | Pending |
| 7B.5 | Optimize date picker for mobile | B | Pending |
| 7B.6 | Add loading skeletons for better perceived performance | C | Pending |

### Sub-Phase 7C: Styling & Polish

| # | Task | Status |
|---|------|--------|
| 7C.1 | Define responsive breakpoints (mobile < 768px, tablet, desktop) | Pending |
| 7C.2 | Implement dark mode support | Pending |
| 7C.3 | Add CSS transitions for smoother interactions | Pending |
| 7C.4 | Ensure keyboard accessibility throughout | Pending |
| 7C.5 | Test on actual mobile devices | Pending |

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

---

## Phase 8: macOS Shortcut Integration

### Goal
Create macOS Shortcuts integration mirroring the iOS experience.

### Deliverable
Working macOS Shortcut for voice input with keyboard trigger.

### Task List

| # | Task | Status |
|---|------|--------|
| 8.1 | Document macOS Shortcut setup guide | Pending |
| 8.2 | Verify API works from macOS (same as iOS) | Pending |
| 8.3 | Create macOS-specific shortcut instructions | Pending |
| 8.4 | Configure keyboard shortcut trigger (e.g., ⌘⇧Space) | Pending |
| 8.5 | Test dictation accuracy on macOS | Pending |
| 8.6 | Add error handling for macOS-specific issues | Pending |
| 8.7 | Document alternative options (Raycast, Alfred) for future | Pending |

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

---

## Phase 9: Integration Testing & Polish

### Goal
Comprehensive testing and final polish before MVP release.

### Deliverable
Stable, production-ready MVP.

### Sub-Phase 9A: End-to-End Testing

| # | Test Scenario | Status |
|---|--------------|--------|
| 9A.1 | Full voice flow (iOS shortcut → API → web) | Pending |
| 9A.2 | Full voice flow (macOS shortcut → API → web) | Pending |
| 9A.3 | Login → add task → complete → logout | Pending |
| 9A.4 | Create list → add tasks → filter → delete list | Pending |
| 9A.5 | Add tags → filter by tags → remove tags | Pending |
| 9A.6 | Priority and due date extraction from voice | Pending |
| 9A.7 | Multiple devices showing same data | Pending |
| 9A.8 | Server restart data persistence | Pending |
| 9A.9 | LLM restart recovery | Pending |

### Sub-Phase 9B: Performance Testing

| # | Metric | Target | Status |
|---|--------|--------|--------|
| 9B.1 | Voice → Notification latency | < 5 sec | Pending |
| 9B.2 | Web page load (mobile) | < 2 sec | Pending |
| 9B.3 | Task creation (API) | < 500ms | Pending |
| 9B.4 | LLM full parsing | < 3 sec | Pending |
| 9B.5 | JWT refresh | < 200ms | Pending |
| 9B.6 | List with 100 tasks | Smooth scroll | Pending |

### Sub-Phase 9C: Security Review

| # | Check | Status |
|---|-------|--------|
| 9C.1 | Password hashing (bcrypt cost 12+) | Pending |
| 9C.2 | JWT signature validation | Pending |
| 9C.3 | Refresh token rotation | Pending |
| 9C.4 | Rate limiting on auth endpoints | Pending |
| 9C.5 | Input sanitization (XSS prevention) | Pending |
| 9C.6 | SQL injection prevention (Prisma handles) | Pending |
| 9C.7 | CORS configuration | Pending |
| 9C.8 | Secure cookie flags | Pending |

### Sub-Phase 9D: Documentation & Cleanup

| # | Task | Status |
|---|------|--------|
| 9D.1 | Update CLAUDE.md with MVP features | Pending |
| 9D.2 | Update API documentation | Pending |
| 9D.3 | Update DEPLOYMENT.md for production | Pending |
| 9D.4 | Create user guide for new features | Pending |
| 9D.5 | Clean up TODO comments in code | Pending |
| 9D.6 | Remove debug logging | Pending |
| 9D.7 | Final code review | Pending |

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
| 2 | Authentication System | Phase 1 |
| 3 | List Management | Phase 1 |
| 4 | Tags System | Phase 1 |
| 5 | Enhanced Task Features | Phases 3, 4 |
| 6 | Full LLM Parsing | Phases 3, 4 |
| 7 | Responsive UI | Phases 3, 4, 5 |
| 8 | macOS Shortcut | Phase 6 |
| 9 | Integration Testing | All phases |

**Parallelization Notes:**
- Phases 2, 3, 4 can be developed in parallel after Phase 1
- Phase 5 depends on 3 and 4 for list/tag integration
- Phase 6 depends on 3 and 4 for list/tag matching
- Phase 7 can begin once basic components exist (Phase 5)
- Phase 8 can begin once voice endpoint is updated (Phase 6)

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
