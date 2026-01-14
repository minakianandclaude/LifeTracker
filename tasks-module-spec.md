# Life Tracker — Tasks Module Specification

## Overview

A system to capture, organize, and complete tasks — optimized for fast input via voice/natural language.

---

## User Stories

### Capture
- "Add buy groceries to my today list"
- "Remind me to call the dentist tomorrow"
- "I need to renew my car registration by March 15th"
- "Add a task to research health insurance options, high priority"
- "Take out trash every Thursday"

### Organize
- View tasks by list
- Move tasks between lists
- Set/change due dates
- Set/change priority
- Add notes or details to a task

### Complete
- Mark a task done via UI
- Mark a task done via voice: "Complete the groceries task"
- View completed tasks (history)

### Recurring
- "Take out trash every Thursday"
- "Pay rent on the 1st of every month"
- When completed, auto-generate the next occurrence

### Query
- "What's on my list for today?"
- "What's overdue?"
- "Show me everything due this week"

---

## Open Questions

### 1. Lists

**Question**: What list structure do you want?

**Options**:
- **A) Fixed lists only**: System-defined lists like Today, Inbox, Someday/Maybe
- **B) User-created lists only**: You create and name all your lists
- **C) Hybrid**: A few fixed "smart" lists (Today, Inbox) + unlimited user-created lists

**Considerations**:
- Fixed "Today" list could auto-populate based on due dates, or be manually curated
- "Inbox" is useful as a capture bucket for unprocessed items
- User lists allow project-based organization (Home, Work, Car Maintenance, etc.)

**Decision**: **Option C — Hybrid**
- **Inbox**: System-defined catch-all for quick capture and unparseable items
- **User-created lists**: Unlimited custom lists for projects and areas of life

---

### 2. Priorities

**Question**: How do you want to indicate task importance?

**Options**:
- **A) None**: No priority system, rely on lists and due dates
- **B) Binary flag**: Important / Not important (simple star/flag)
- **C) Three levels**: High / Medium / Low
- **D) Four levels**: P1 / P2 / P3 / P4 (Todoist-style)

**Considerations**:
- More levels = more decisions when creating tasks = more friction
- Binary is fast: "high priority" or nothing
- Priority can affect sort order and what surfaces to "Today"

**Decision**: **Option C — Three levels (High / Medium / Low)**
- Priority is **optional** — tasks do not require a priority
- Voice shortcuts: "priority 1" or "p1" → High, "priority 2" or "p2" → Medium, "priority 3" or "p3" → Low
- Also accept natural language: "high priority", "low priority", etc.

---

### 3. Due Dates vs Reminders

**Question**: Is a due date sufficient, or do you need separate reminder times?

**Options**:
- **A) Due date only**: Task is due on X date, that's it
- **B) Due date + single reminder**: Due Friday, remind me Wednesday
- **C) Due date + multiple reminders**: Remind me 1 week before, 1 day before, morning of

**Considerations**:
- Reminders add complexity but help with advance planning
- Could start with due dates only and add reminders later
- Reminders require notification infrastructure

**Decision**: **Option A — Due date only (for MVP)**
- Reminders deferred to future iteration

---

### 4. Subtasks

**Question**: Do you need tasks within tasks?

**Options**:
- **A) No subtasks**: Flat list only
- **B) Simple checklist**: Task can have a list of checkable items (not full tasks)
- **C) Full subtasks**: Subtasks are real tasks with their own due dates, priorities, etc.

**Considerations**:
- Checklists are simpler and cover 80% of use cases ("Buy groceries" → milk, eggs, bread)
- Full subtasks add significant complexity
- Could start flat, add checklists if needed

**Decision**: **Option A — Flat list (for MVP)**
- Future consideration: Link tasks to other lists (e.g., "Buy groceries" task could link to a "Grocery List" shopping list from the Shopping module)

---

### 5. Tags / Contexts

**Question**: Beyond lists, do you want additional categorization?

**Options**:
- **A) No tags**: Lists are sufficient
- **B) Simple tags**: Freeform labels you can add to tasks
- **C) GTD contexts**: Predefined contexts like @home, @phone, @computer, @errands

**Considerations**:
- Tags allow cross-list filtering ("show me all @phone tasks regardless of list")
- Can add friction when creating tasks
- GTD contexts are powerful but require discipline

**Decision**: **Option B — Simple freeform tags**
- Tasks can have zero or more tags
- Tags are user-defined (not predefined)
- Enables cross-list filtering and organization

---

### 6. Recurring Task Complexity

**Question**: How complex should recurring patterns be?

**Options**:
- **A) Simple fixed intervals**: Daily, Weekly, Monthly, Yearly
- **B) Day-of-week**: Every Monday, Every Mon/Wed/Fri, Weekdays, Weekends
- **C) Complex patterns**: Every 3rd Tuesday, Last Friday of month, Every 2 weeks

**Considerations**:
- Simple covers most needs (trash day, rent, weekly review)
- Complex patterns are rarely needed but annoying when you need them
- LLM can parse complex patterns, but storage/computation gets trickier

**Decision**: **Option C — Support complex patterns**
- **Deferred to later iteration** — design for it, implement simple first
- MVP: No recurring tasks
- Future: Full RRULE-style complexity

---

### 7. Sorting / Ordering

**Question**: How should tasks be ordered within a list?

**Options**:
- **A) Manual only**: Drag and drop, you control the order
- **B) Auto-sort only**: Always sorted by due date, then priority
- **C) Hybrid**: Default auto-sort, but allow manual override

**Considerations**:
- Manual ordering requires storing position, handling reordering
- Auto-sort is simpler and keeps urgent items visible
- Some people have strong preferences here

**Decision**: **Custom hybrid approach**
- **Default display**: Order by creation date (oldest first / FIFO)
- **Sort options available**: By due date, by priority
- **Manual ordering**: Drag-and-drop to custom arrange
- User can switch between these views per list

---

### 8. Task Completion Behavior

**Question**: What happens when you complete a task?

**Options**:
- **A) Mark complete, stays in list**: Completed tasks visible with strikethrough
- **B) Mark complete, moves to archive**: Disappears from list, viewable in history
- **C) Mark complete, configurable per list**: Some lists archive, some don't

**Considerations**:
- Seeing completed tasks can be motivating (progress visible)
- Clutters the list if you complete many tasks
- Archive keeps lists clean but requires separate view

**Decision**: **Smart visibility with toggle**
- Completed tasks displayed **grayed out with strikethrough**
- **Auto-hide** tasks completed on previous days by default
- **Show** tasks completed today (grayed + strikethrough)
- **Overdue incomplete tasks** always visible (regardless of date)
- **Toggle control** to show/hide previously completed tasks
- This keeps the list clean while showing today's progress

---

### 9. Notes / Details

**Question**: Do tasks need additional content beyond the title?

**Options**:
- **A) Title only**: Keep it simple, task is just a title
- **B) Title + plain text notes**: Add details, context, links
- **C) Title + rich text notes**: Formatting, checklists within notes, etc.

**Considerations**:
- Sometimes you need to capture details ("Call dentist — ask about insurance, mention sensitivity issue")
- Rich text adds complexity for both input and storage
- Plain text is often sufficient

**Decision**: **Option B — Title + plain text notes**
- Rich text notes deferred to future iteration

---

### 10. Natural Language Parsing Scope

**Question**: What should the LLM extract from voice input?

**Examples**:
| Input | Extracted |
|-------|-----------|
| "Add buy groceries" | title: "buy groceries", list: Inbox (default) |
| "Add buy groceries to my errands list" | title: "buy groceries", list: "errands" (auto-create if needed) |
| "Remind me to call mom tomorrow" | title: "call mom", due: tomorrow, list: Inbox |
| "High priority: finish report by Friday" | title: "finish report", due: Friday, priority: HIGH |
| "Add call dentist to health list, tag it insurance" | title: "call dentist", list: "health", tags: ["insurance"] |
| "P1 submit taxes by April 15" | title: "submit taxes", due: April 15, priority: HIGH |
| "Add fix leaky faucet to home, low priority, tag it maintenance plumbing" | title: "fix leaky faucet", list: "home", priority: LOW, tags: ["maintenance", "plumbing"] |

**Considerations**:
- More extraction = smarter feel, but more chances for errors
- Should incorrect parsing go to Inbox for manual correction?
- How do we handle ambiguity? ("Add milk" — to which list?)

**Decision**: **Structured extraction with graceful fallback**

**Required extractions (MVP)**:
- Task title
- Target list (or default to Inbox)
- Priority (if specified)
- Due date (if specified)
- Tags (if specified)

**List behavior**:
- If user specifies a list that doesn't exist → **auto-create the list**
- May revisit with fuzzy matching or confirmation in future

**Fallback behavior**:
1. If parsing fails entirely → Store raw request in Inbox, notify user
2. If partial parsing → Store what was parsed, flag unparseable portions, notify user
3. Notification should indicate what could not be parsed when possible

**Deferred**: Multi-item parsing ("Add milk and eggs to grocery list" → creates two separate tasks)

---

## Decisions Log

| # | Topic | Decision | Rationale |
|---|-------|----------|-----------|
| 1 | Lists | Hybrid: Inbox (system) + user-created | Inbox as catch-all, flexibility for custom organization |
| 2 | Priorities | 3 levels (High/Med/Low), optional | Balance between expressiveness and simplicity; p1/p2/p3 shortcuts |
| 3 | Due Dates vs Reminders | Due dates only (MVP) | Simpler to start; reminders add notification complexity |
| 4 | Subtasks | Flat list (MVP) | Reduce complexity; can link to shopping lists later |
| 5 | Tags | Freeform tags included | Enables cross-list filtering without rigid structure |
| 6 | Recurring | Complex patterns (deferred) | Design for it but implement later |
| 7 | Sorting | Created date default; sort by due/priority; manual drag-drop | Flexible views without forcing one approach |
| 8 | Completion | Grayed + strikethrough; auto-hide previous days; toggle | Clean lists while showing today's progress |
| 9 | Notes | Title + plain text | Capture context without rich text complexity |
| 10 | NLP Parsing | Extract title/list/priority/due/tags; graceful fallback | Reliable core extraction; failures go to Inbox with notification |
| 11 | Inbox Protection | Cannot be deleted or renamed | System requires reliable fallback destination |
| 12 | Tag Extraction | LLM should extract tags from voice input | Maximize LLM utility; reduce manual work |
| 13 | List Auto-Creation | Create list if referenced list doesn't exist | Reduce friction; may add fuzzy matching later |
| 14 | Manual Ordering | Plan for it (position field), implement after core | Avoid early complexity; field is ready when needed |
| 15 | List Name Storage | Lowercase + trimmed internally, Title Case display | Prevents collisions; consistent user experience |
| 16 | Parse Warning | Add parse_warning boolean to tasks | Enables "Teach the System" correction UI |

---

## Deferred / Future Considerations

| Item | Notes | Priority |
|------|-------|----------|
| Recurring tasks | Complex RRULE-style patterns; auto-generate next occurrence | High |
| Manual drag-drop ordering | Position field planned; implement after core features | Medium |
| Reminders | Separate from due dates; notify before due date | Medium |
| Multi-item parsing | "Add milk and eggs" → two separate tasks | Medium |
| Task ↔ Shopping list linking | "Buy groceries" task links to Grocery shopping list | Medium |
| List fuzzy matching | "errands" matches "Errands List" | Low |
| Rich text notes | Markdown or WYSIWYG in task notes | Low |
| Subtasks / Checklists | Nested items within a task | Low |
| Smart "Today" list | Auto-populate based on due dates | Medium |

---

## Entities Identified

Based on decisions above, the following entities emerge:

### Task
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | UUID | Yes | Primary key |
| title | String | Yes | The task description |
| notes | Text | No | Plain text additional details |
| list_id | FK → List | Yes | Which list this task belongs to |
| priority | Enum | No | HIGH, MEDIUM, LOW, or null |
| due_date | Date | No | When the task is due |
| completed | Boolean | Yes | Default false |
| completed_at | Timestamp | No | When it was completed (for auto-hide logic) |
| position | Integer | No | For manual drag-drop ordering (deferred implementation) |
| raw_input | Text | No | Original voice input (for debugging/fallback) |
| parse_warning | Boolean | Yes | Default false; true if LLM parsing was uncertain |
| parse_errors | Text | No | What couldn't be parsed (if any) |
| created_at | Timestamp | Yes | For default sort order |
| updated_at | Timestamp | Yes | Standard audit field |

### List
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | UUID | Yes | Primary key |
| name | String | Yes | Stored as lowercase, trimmed (unique constraint) |
| is_system | Boolean | Yes | True for Inbox, false for user-created |
| is_deletable | Boolean | Yes | False for Inbox, true for user-created |
| position | Integer | No | For ordering lists in sidebar |
| created_at | Timestamp | Yes | |
| updated_at | Timestamp | Yes | |

**System List: Inbox**
- Cannot be deleted or renamed
- Default destination for unparseable input
- Default destination when no list specified

**List Name Handling**
| Context | Format | Example |
|---------|--------|---------|
| Storage (DB) | lowercase, trimmed | `"grocery shopping"` |
| Display (UI) | Title Case | `"Grocery Shopping"` |
| Comparison | lowercase, trimmed | `"grocery shopping" === "grocery shopping"` |
| URL slug | kebab-case | `/lists/grocery-shopping` |

Utility functions:
```typescript
// Normalize for storage and comparison
normalizeListName(name: string): string
  → name.toLowerCase().trim().replace(/\s+/g, ' ')

// Format for display
displayListName(name: string): string
  → Title Case transformation

// Format for URLs
slugifyListName(name: string): string
  → normalize then replace spaces with hyphens
```

### Tag
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | UUID | Yes | Primary key |
| name | String | Yes | Tag label (unique) |
| created_at | Timestamp | Yes | |

### TaskTag (Join Table)
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| task_id | FK → Task | Yes | |
| tag_id | FK → Tag | Yes | |
| (composite PK) | | | task_id + tag_id |

### Future: RecurringPattern (Deferred)
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | UUID | Yes | Primary key |
| task_id | FK → Task | Yes | Template task |
| rrule | String | Yes | iCal RRULE format |
| next_due | Date | Yes | Next occurrence |

---

## Data Model

_To be designed after entities are finalized_

---

## API Endpoints

_To be designed after data model is finalized_

---

## UI Wireframes / Concepts

_To be added as we design the interface_
