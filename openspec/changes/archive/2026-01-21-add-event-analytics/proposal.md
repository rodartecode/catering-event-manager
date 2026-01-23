# Proposal: add-event-analytics

## Summary

Implement Phase 6 (User Story 4) - Event Analytics and Reporting to enable managers to analyze event data, generate reports on completion rates, task performance, and resource utilization, and make data-driven business decisions.

## Problem Statement

Currently, catering managers have no visibility into operational metrics. They cannot answer questions like:
- What percentage of events are completed on time?
- Which task categories cause the most delays?
- Are resources being over-utilized or under-utilized?
- How long does it typically take to complete an event?

Without this data, staffing decisions, pricing, and process improvements are based on gut feeling rather than evidence.

## Proposed Solution

Add an analytics capability with three core reports:

1. **Event Completion Analytics** (FR-024): Track completion rates, average time to complete, breakdown by status
2. **Resource Utilization Analytics** (FR-025): Show allocation percentages, identify over/under-utilized resources
3. **Task Performance Analytics** (FR-027): Identify which task categories take longest, track overdue patterns

All reports support date range filtering (FR-026) and must generate in <10 seconds (SC-005).

## Scope

### In Scope
- Analytics tRPC router with three query procedures
- Frontend dashboard with interactive charts (Chart.js)
- Date range picker component for filtering
- Database indexes for query optimization
- CSV export functionality

### Out of Scope
- Real-time streaming analytics (batch queries sufficient)
- Machine learning predictions
- Custom report builder
- Scheduled report delivery via email

## Impact Analysis

### New Files
- `apps/web/src/server/routers/analytics.ts` - Analytics tRPC router
- `apps/web/src/app/(dashboard)/analytics/page.tsx` - Analytics dashboard
- `apps/web/src/components/analytics/*.tsx` - Chart components (6 files)
- `apps/web/src/lib/export-utils.ts` - CSV export utilities

### Modified Files
- `apps/web/src/server/routers/_app.ts` - Register analytics router
- `packages/database/src/schema/index.ts` - Export analytics-related queries (if needed)

### Dependencies
- `chart.js` and `react-chartjs-2` - Charting library (new)
- `date-fns` - Date manipulation (already installed)

### Breaking Changes
None. This is additive functionality.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Analytics queries slow on large datasets | Medium | High | Add composite indexes, implement query caching |
| Chart library bundle size increases | Low | Medium | Use dynamic imports for chart components |
| Complex SQL aggregations | Low | Medium | Use Drizzle's SQL helpers, test with realistic data volumes |

## Success Criteria

- SC-005: Report generation completes in <10 seconds for any date range
- FR-024: Event completion rates and timelines visible
- FR-025: Resource utilization percentages displayed
- FR-026: All reports filterable by date range
- FR-027: Task completion patterns identified

## Verification Plan

1. Run `pnpm type-check` - All analytics types compile
2. Run `pnpm lint` - Code passes linting
3. Manual test: Generate each report with 30-day date range
4. Performance test: Generate reports with 1000+ events, verify <10 second response
5. Export test: Download CSV and verify data integrity

## Related Changes

- **Depends on**: `add-resource-management` (archived) - Resource schedule data needed for utilization
- **Depends on**: Task Management (Phase 4) - Task completion data needed for performance metrics
- **Enables**: Phase 8 dashboard summary metrics
