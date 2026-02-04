## Why

Event managers repeatedly create the same sets of tasks for similar events. A wedding always needs menu finalization, guest count confirmation, and venue walkthrough tasks. Currently, users must manually create 10-15 tasks per event, which is time-consuming and error-prone. Task templates allow users to apply pre-defined task sets when creating events, reducing setup time and ensuring consistency.

## What Changes

- Add `task_templates` table to store reusable template definitions
- Add `task_template_items` table to store individual tasks within templates
- Add optional `templateId` field to `events` table to track which template was applied
- Extend `event.create` mutation to accept a template ID and auto-generate tasks
- Add `template.list` and `template.getById` tRPC procedures
- Add template dropdown to EventForm component
- Seed database with 3 pre-defined templates (Standard Event, Large Event, Simple Delivery)

## Capabilities

### New Capabilities

- `task-templates`: Pre-defined task sets that can be applied when creating events. Templates contain task items with relative timing (days before/after event date) and dependency relationships. When applied, tasks are generated with calculated due dates and preserved dependencies.

### Modified Capabilities

- `event-management`: Events can now optionally reference a template that was used to create initial tasks. The `event.create` mutation accepts an optional `templateId` parameter.

## Impact

- **Database**: 2 new tables (`task_templates`, `task_template_items`), 1 new column on `events`
- **API**: 2 new procedures (`template.list`, `template.getById`), 1 modified (`event.create`)
- **UI**: EventForm component gains template selection dropdown
- **Seed Data**: 3 templates with ~34 total template items
- **Dependencies**: None (uses existing Drizzle/tRPC patterns)
