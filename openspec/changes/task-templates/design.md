## Context

Currently, event managers must manually create 10-15 tasks for each new event. Common event types (weddings, corporate events, simple deliveries) follow predictable task patterns with similar timelines. The existing task system supports dependencies, categories, and due dates—but lacks any mechanism to bootstrap tasks from predefined patterns.

The codebase uses Drizzle ORM for database schemas, tRPC for API procedures, and React components with React Query for the UI. Templates will follow these established patterns.

## Goals / Non-Goals

**Goals:**
- Allow users to select a template when creating an event
- Auto-generate tasks with calculated due dates (relative to event date)
- Preserve task dependencies during template instantiation
- Seed 3 pre-defined templates for common catering scenarios
- Track which template was used for an event (for analytics/debugging)

**Non-Goals:**
- Template management UI (create/edit/delete templates) - future enhancement
- "Save as template" from existing event - future enhancement
- Template versioning or change tracking
- Multi-template combination (applying multiple templates to one event)
- Template sharing across organizations (single-tenant for now)

## Decisions

### 1. Schema Design

**Decision:** Two new tables with minimal fields; one new nullable column on events.

```
task_templates
├── id: serial PK
├── name: varchar(100) NOT NULL
├── description: text
├── createdAt: timestamp
└── updatedAt: timestamp

task_template_items
├── id: serial PK
├── templateId: FK → task_templates.id (CASCADE DELETE)
├── title: varchar(255) NOT NULL
├── description: text
├── category: task_category enum
├── daysOffset: integer NOT NULL (negative = before event, 0 = day-of, positive = after)
├── dependsOnIndex: integer (references sortOrder within same template, NULL = no dependency)
├── sortOrder: integer NOT NULL (unique within template)
├── createdAt: timestamp
└── updatedAt: timestamp

events (add column)
└── templateId: integer FK → task_templates.id (nullable, SET NULL on delete)
```

**Rationale:**
- `daysOffset` is simpler than storing anchor points (event_start, event_end)—catering events are typically single-day
- `dependsOnIndex` references `sortOrder` rather than item ID to allow clean seeding without ID coordination
- `templateId` on events is nullable and SET NULL on delete—if template is removed, events remain intact
- CASCADE DELETE on template items ensures cleanup when templates are removed

**Alternatives considered:**
- Using item ID for dependencies: Requires multi-pass insert or deferred constraints. Index reference is simpler for seed data.
- Storing full JSON template: Loses relational benefits, harder to query/index
- Separate `template_item_dependencies` junction table: Over-engineered for single-dependency model

### 2. Template Instantiation Logic

**Decision:** Generate tasks in a transaction within the `event.create` mutation.

```typescript
// Pseudocode for task generation
if (input.templateId) {
  const template = await getTemplateWithItems(input.templateId);
  const taskIdMap = new Map<number, number>(); // sortOrder → created task ID

  for (const item of template.items.sort(by sortOrder)) {
    const dueDate = addDays(event.eventDate, item.daysOffset);
    const dependsOnTaskId = item.dependsOnIndex
      ? taskIdMap.get(item.dependsOnIndex)
      : null;

    const [task] = await db.insert(tasks).values({
      eventId: event.id,
      title: item.title,
      description: item.description,
      category: item.category,
      dueDate,
      dependsOnTaskId,
      status: 'pending',
    }).returning({ id: tasks.id });

    taskIdMap.set(item.sortOrder, task.id);
  }
}
```

**Rationale:**
- Single transaction ensures atomicity (all tasks created or none)
- Sort by `sortOrder` guarantees dependencies exist before referencing them
- Map-based ID tracking handles dependency resolution cleanly

**Alternatives considered:**
- Separate `template.apply` mutation: Adds complexity; template application is naturally part of event creation
- Batch insert with post-processing: More complex, gains little since task count is small (~15 max)

### 3. API Design

**Decision:** Minimal template router with read-only procedures.

```typescript
// template.ts router
template.list    // Returns all templates (name, description, item count)
template.getById // Returns template with all items (for preview)

// event.ts router (modified)
event.create     // Add optional templateId input
```

**Rationale:**
- Read-only for now since templates are seeded, not user-managed
- `list` provides dropdown data; `getById` enables preview before applying
- Extending `event.create` is cleaner than a separate `template.apply` mutation

### 4. UI Integration

**Decision:** Optional dropdown in EventForm, fetched via React Query.

```
┌─────────────────────────────────────────┐
│ Create Event                            │
├─────────────────────────────────────────┤
│ Event Name: [_______________]           │
│ Client:     [▼ Select client]           │
│ Date:       [📅 Pick date]              │
│ Template:   [▼ None                  ]  │ ◀── Optional
│             │ None                    │  │
│             │ Standard Event (12)     │  │
│             │ Large Event (14)        │  │
│             │ Simple Delivery (8)     │  │
│             └─────────────────────────┘  │
│ [Create Event]                          │
└─────────────────────────────────────────┘
```

**Rationale:**
- Optional field (defaulting to "None") maintains backward compatibility
- Item count in dropdown helps users choose appropriate template
- No separate "Apply Template" step—streamlines workflow

### 5. Seed Data Strategy

**Decision:** 3 templates with realistic catering workflows.

| Template | Tasks | Use Case |
|----------|-------|----------|
| Standard Event | 12 | Typical catered event with full service |
| Large Event / Wedding | 14 | Elaborate events with vendor coordination |
| Simple Delivery | 8 | Drop-off catering with minimal setup |

**Task timing follows industry patterns:**
- Menu/guest confirmation: -14 to -10 days
- Supply ordering: -7 to -10 days
- Prep work: -2 to -1 days
- Day-of tasks: 0 days (chains together)
- Follow-up: +1 to +3 days

## Risks / Trade-offs

**[Limited flexibility]** → Pre-defined templates only; users cannot customize until template CRUD is built. Mitigation: Seed templates cover common scenarios; users can still manually add/remove tasks after generation.

**[Single dependency model]** → Template items support only one dependency (matching existing task model). Mitigation: Linear chains handle most catering workflows; multi-dependency can be added later if needed.

**[No template updates propagate]** → Changing a template doesn't affect already-created events. Mitigation: This is intentional—historical events should preserve their original task structure.

**[Seed data maintenance]** → Templates are in migration/seed files, not UI-managed. Mitigation: Acceptable for MVP; template CRUD can be added when business needs it.

## Migration Plan

1. **Schema migration**: Add `task_templates`, `task_template_items` tables and `events.templateId` column
2. **Seed migration**: Insert 3 pre-defined templates with items
3. **Deploy**: No data migration needed—new tables are additive, new column is nullable
4. **Rollback**: Drop new tables and column if needed (no data loss since feature is new)
