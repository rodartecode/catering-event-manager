# Tasks: add-event-analytics

## Overview

15 tasks implementing Event Analytics and Reporting (User Story 4, Priority P4).

**Estimated Duration**: 6-8 hours

## Prerequisites

- [x] Phase 4 (Task Management) complete - Task data available for performance analytics
- [x] Phase 5 (Resource Management) complete - Resource schedule data available for utilization analytics
- [x] Events and tasks tables populated with test data

---

## Section 1: Backend (tRPC Router)

### T131: Create analytics router file
**Priority**: P0 (blocking)
**File**: `apps/web/src/server/routers/analytics.ts`

Create base analytics router with router setup and placeholder exports.

**Acceptance**: File exists with router export, imports compile.

---

### T132: Implement eventCompletion query
**Priority**: P0 (blocking)
**File**: `apps/web/src/server/routers/analytics.ts`
**Spec**: FR-024, contracts/trpc-routers.md:656-678

Implement query returning:
- Total events in date range
- Completed events count
- Completion rate percentage
- Average days to complete (from created_at to status='completed')
- Breakdown by status

**Input**: `{ dateFrom: Date, dateTo: Date }`

**Acceptance**: Query returns correct aggregations for test data.

---

### T133: Implement resourceUtilization query
**Priority**: P0 (blocking)
**File**: `apps/web/src/server/routers/analytics.ts`
**Spec**: FR-025, contracts/trpc-routers.md:684-705

Implement query returning per resource:
- Resource ID, name, type
- Assigned tasks count
- Total hours allocated (from resource_schedule)
- Utilization percentage (allocated hours / available hours in range)

**Input**: `{ dateFrom: Date, dateTo: Date, resourceType?: 'staff' | 'equipment' | 'materials' | 'all' }`

**Acceptance**: Query returns utilization data for all resources matching filter.

---

### T134: Implement taskPerformance query
**Priority**: P0 (blocking)
**File**: `apps/web/src/server/routers/analytics.ts`
**Spec**: FR-027, contracts/trpc-routers.md:709-729

Implement query returning per category:
- Category (pre_event, during_event, post_event)
- Total tasks count
- Completed tasks count
- Average completion time (hours from created_at to completed_at)
- Overdue count (tasks where due_date < completed_at or due_date < now() AND status != 'completed')

**Input**: `{ dateFrom: Date, dateTo: Date, category?: 'pre_event' | 'during_event' | 'post_event' | 'all' }`

**Acceptance**: Query returns performance metrics grouped by category.

---

### T135: Add database indexes for analytics optimization
**Priority**: P1
**File**: `packages/database/src/schema/events.ts` and related

Add composite indexes for:
- `events(status, created_at)` - for completion rate queries
- `tasks(category, status, created_at)` - for task performance queries
- `resource_schedule(resource_id, start_time, end_time)` - for utilization queries

**Acceptance**: Explain query plans show index usage.

---

### T136: Implement analytics query caching
**Priority**: P2
**File**: `apps/web/src/server/services/analytics-cache.ts`

Implement simple in-memory cache with 5-minute TTL for analytics queries.
Cache key: `${queryName}:${hash(input)}`.
Use `Map` with automatic cleanup.

**Acceptance**: Repeated queries within 5 minutes return cached results. SC-005 (<10s) verified.

---

### T137: Register analytics router
**Priority**: P0 (blocking)
**File**: `apps/web/src/server/routers/_app.ts`

Import and register analytics router in root app router.

**Acceptance**: `trpc.analytics.*` procedures callable from frontend.

---

## Section 2: Frontend UI

### T138: Create analytics dashboard page
**Priority**: P0 (blocking)
**File**: `apps/web/src/app/(dashboard)/analytics/page.tsx`

Create page layout with:
- Title and description
- Date range picker (default: last 30 days)
- Grid layout for chart components
- Loading and error states

**Acceptance**: Page loads at `/analytics` with date picker working.

---

### T139: Create EventCompletionChart component
**Priority**: P0 (blocking)
**File**: `apps/web/src/components/analytics/EventCompletionChart.tsx`

Create bar chart showing:
- Event counts by status (stacked or grouped bar)
- Completion rate as prominent metric
- Average days to complete

Use `react-chartjs-2` with `Bar` component.

**Acceptance**: Chart renders with data from eventCompletion query.

---

### T140: Create ResourceUtilizationChart component
**Priority**: P0 (blocking)
**File**: `apps/web/src/components/analytics/ResourceUtilizationChart.tsx`

Create horizontal bar chart showing:
- Resource name on Y-axis
- Utilization percentage on X-axis (0-100%)
- Color coding: <50% green, 50-80% yellow, >80% red

**Acceptance**: Chart renders with data from resourceUtilization query.

---

### T141: Create TaskPerformanceChart component
**Priority**: P0 (blocking)
**File**: `apps/web/src/components/analytics/TaskPerformanceChart.tsx`

Create chart showing:
- Task categories on X-axis
- Completed vs overdue counts
- Average completion time as secondary metric

**Acceptance**: Chart renders with data from taskPerformance query.

---

### T142: Create DateRangePicker component
**Priority**: P0 (blocking)
**File**: `apps/web/src/components/analytics/DateRangePicker.tsx`

Create date range selector with:
- From/To date inputs
- Preset buttons (Last 7 days, Last 30 days, Last 90 days, This year)
- Apply button to trigger data refresh

**Acceptance**: Date range changes trigger analytics queries with new dates.

---

### T143: Create AnalyticsCard component
**Priority**: P1
**File**: `apps/web/src/components/analytics/AnalyticsCard.tsx`

Create summary card component showing:
- Metric title
- Large metric value
- Trend indicator (optional)
- Description text

Use for: Total Events, Completion Rate, Average Days, Resource Utilization %.

**Acceptance**: Cards display on analytics page with correct data.

---

### T144: Add CSV export functionality
**Priority**: P2
**File**: `apps/web/src/lib/export-utils.ts`

Implement utility functions:
- `exportToCSV(data: Record<string, unknown>[], filename: string)`
- Convert analytics data to CSV format
- Trigger browser download

Add export buttons to each chart component.

**Acceptance**: CSV downloads contain correct data for each report type.

---

### T145: Add loading states and skeletons
**Priority**: P2
**File**: `apps/web/src/components/analytics/AnalyticsSkeleton.tsx`

Create skeleton loading components for:
- Chart placeholder (animated pulse)
- Card placeholder
- Full page loading state

**Acceptance**: Loading states display while queries are in flight.

---

## Dependency Graph

```
T131 (router file)
  ├── T132 (eventCompletion) ─┐
  ├── T133 (resourceUtilization) ├── T137 (register router) ─┐
  └── T134 (taskPerformance) ─────┘                          │
                                                              │
T135 (indexes) ─── standalone                                 │
T136 (caching) ─── depends on T132-T134                       │
                                                              │
T142 (DateRangePicker) ────────────────────────────────────┐  │
                                                           │  │
T138 (dashboard page) ─────────────────────────────────────┼──┤
  ├── T139 (EventCompletionChart) ─┐                       │  │
  ├── T140 (ResourceUtilizationChart) ├── require T137 + T142
  └── T141 (TaskPerformanceChart) ──────┘                     │
                                                              │
T143 (AnalyticsCard) ─── depends on T138                      │
T144 (CSV export) ─── depends on T139-T141                    │
T145 (skeletons) ─── depends on T138                          │
```

## Verification Checklist

- [ ] `pnpm type-check` passes
- [ ] `pnpm lint` passes
- [ ] Analytics page loads at `/analytics`
- [ ] Event completion report generates correctly
- [ ] Resource utilization report generates correctly
- [ ] Task performance report generates correctly
- [ ] Date range filtering works for all reports
- [ ] All reports generate in <10 seconds (SC-005)
- [ ] CSV export works for each report
