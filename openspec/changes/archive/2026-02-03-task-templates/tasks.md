## 1. Database Schema

- [x] 1.1 Create task_templates table schema in packages/database/src/schema/task-templates.ts
- [x] 1.2 Create task_template_items table schema in packages/database/src/schema/task-template-items.ts
- [x] 1.3 Add templateId column to events table in packages/database/src/schema/events.ts
- [x] 1.4 Export new schemas from packages/database/src/schema/index.ts
- [x] 1.5 Generate database migration with pnpm db:generate
- [x] 1.6 Apply migration to development database with pnpm db:push

## 2. Seed Data

- [x] 2.1 Create seed file for Standard Event template (12 tasks)
- [x] 2.2 Create seed file for Large Event / Wedding template (14 tasks)
- [x] 2.3 Create seed file for Simple Delivery template (8 tasks)
- [x] 2.4 Add template seeding to database seed script

## 3. tRPC Template Router

- [x] 3.1 Create template.ts router file in apps/web/src/server/routers/
- [x] 3.2 Implement template.list procedure (returns templates with item counts)
- [x] 3.3 Implement template.getById procedure (returns template with all items)
- [x] 3.4 Register template router in apps/web/src/server/routers/_app.ts

## 4. Event Router Modifications

- [x] 4.1 Update event.create input schema to accept optional templateId
- [x] 4.2 Add template validation (check template exists if templateId provided)
- [x] 4.3 Implement task generation logic with date calculation and dependency mapping
- [x] 4.4 Store templateId on created event record

## 5. UI Components

- [x] 5.1 Create useTemplates hook for fetching template list
- [x] 5.2 Add template dropdown to EventForm component
- [x] 5.3 Update EventForm to pass templateId to create mutation
- [x] 5.4 Display template task count in dropdown options

## 6. Testing

- [x] 6.1 Write unit tests for template.list procedure
- [x] 6.2 Write unit tests for template.getById procedure
- [x] 6.3 Write unit tests for event.create with template (task generation)
- [x] 6.4 Write unit tests for event.create with invalid templateId
- [x] 6.5 Write unit tests for dependency mapping during task generation
- [x] 6.6 Write component tests for EventForm template dropdown

## 7. Verification

- [x] 7.1 Verify templates appear in dropdown on event creation form (API endpoint verified, component tests pass)
- [x] 7.2 Verify creating event with template generates correct number of tasks (covered by event.test.ts)
- [x] 7.3 Verify task due dates are calculated correctly from event date (covered by event.test.ts)
- [x] 7.4 Verify task dependencies are preserved after generation (covered by event.test.ts)
- [x] 7.5 Run full test suite and fix any regressions (668 tests passing)
