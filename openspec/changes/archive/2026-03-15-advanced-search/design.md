## Context

The system has 4 primary searchable entities — events, clients, tasks, and resources — spread across 8 tRPC routers. Current list endpoints support filtering by enum fields (status, type, category) and foreign keys (clientId, eventId) but have zero text search capability. Users must visually scan paginated lists to locate records by name.

The database is PostgreSQL 17 on Supabase (free tier). The dataset is small (hundreds to low thousands of rows per table). The UI uses a sidebar layout with no header search affordance.

## Goals / Non-Goals

**Goals:**
- Let users find any event, client, task, or resource by typing a few characters
- Provide a single global search endpoint that returns categorized results
- Add per-entity `query` parameter to existing list endpoints for inline filtering
- Keep the implementation simple — no external search dependencies
- Maintain <200ms response time for typical queries

**Non-Goals:**
- Full-text search with ranking/stemming/synonyms (PostgreSQL `tsvector`)
- Fuzzy matching or typo tolerance
- Search analytics or query logging
- Saved searches or search history
- Indexing notes/description fields (only primary name/title fields)

## Decisions

### D1: PostgreSQL ILIKE over tsvector

**Decision:** Use `ILIKE '%query%'` for text matching.

**Rationale:** The dataset is small (< 10k rows per table). ILIKE is simple, requires no schema changes (no tsvector columns, no triggers), and is sufficient for substring matching. tsvector adds complexity (migration, index maintenance, Drizzle integration quirks) with no meaningful benefit at this scale.

**Alternative considered:** `pg_trgm` extension with GIN indexes. Deferred — can be added later as a performance optimization without changing the API contract if the dataset grows significantly.

### D2: New `search` tRPC router for global search

**Decision:** Create a dedicated `search.ts` router with a single `search.global` query procedure rather than adding cross-entity search to an existing router.

**Rationale:** Global search spans multiple entities (events, clients, tasks, resources), so it doesn't belong in any single domain router. A dedicated router keeps concerns separated and allows the global search logic to evolve independently.

**Alternative considered:** Adding a `global` procedure to the event router. Rejected — violates domain boundaries.

### D3: Parallel queries per entity, merge in application

**Decision:** The `search.global` procedure runs 4 parallel `ILIKE` queries (one per entity) and merges results in application code, capping each entity at 5 results.

**Rationale:** Keeps queries simple and independently optimizable. A single UNION query would be more complex to build with Drizzle's query builder and harder to type safely. The 4-query approach also allows easy per-entity result limits. At the current scale, 4 small queries complete well within the 200ms budget.

**Alternative considered:** Single SQL UNION ALL query. More efficient in theory but harder to maintain with Drizzle ORM and doesn't allow typed per-entity result shaping.

### D4: Searched columns per entity

| Entity | Columns searched | Rationale |
|--------|-----------------|-----------|
| Events | `event_name`, `location` | Primary identifiers users think of |
| Clients | `company_name`, `contact_name`, `email` | All three are used to identify clients |
| Tasks | `title` | Primary identifier; description too noisy |
| Resources | `name` | Primary identifier |

### D5: Search bar placement — dashboard header area

**Decision:** Add a `SearchBar` component above the main content area in the dashboard layout, visible on all dashboard pages. Not in the sidebar.

**Rationale:** The sidebar is navigation-focused. A header-area search bar is the standard pattern and provides consistent placement across all pages. The search bar uses client-side debouncing (300ms) to avoid excessive API calls.

### D6: Search results page at `/search`

**Decision:** Create a dedicated `/search` page that displays categorized results. The search bar navigates to `/search?q=term` on submit and shows inline preview results as a dropdown while typing.

**Rationale:** Two interaction modes: (1) quick inline preview dropdown for fast navigation, (2) full results page for comprehensive review. The dropdown shows top 3 per category; the full page shows up to 5 per category with entity-specific detail.

### D7: Per-entity `query` param on existing list endpoints

**Decision:** Add an optional `query: z.string().optional()` to the input schemas of `event.list`, `clients.list`, `task.listByEvent`, and `resource.list`. When provided, it adds ILIKE conditions to the existing where clause.

**Rationale:** Allows inline filtering within entity-specific pages (e.g., filtering the event list by name) without needing to navigate to the global search page. Additive — no breaking changes to existing callers.

## Risks / Trade-offs

**ILIKE performance on large datasets** → Acceptable at current scale. If any table exceeds ~50k rows, add `pg_trgm` GIN indexes on searched columns. The API contract doesn't change.

**No result ranking** → Results are returned in default order (usually by creation date). Users may need to scan a few results. Acceptable given the small result sets (max 5 per entity in global search).

**Search bar adds layout complexity** → The search bar component is self-contained with its own state. Uses `useRouter` for navigation, `useState` + `useEffect` with debounce for the dropdown. No global state management needed.

**4 parallel queries per global search** → At most 4 simple indexed queries per request. Well within PostgreSQL connection pool limits and Supabase free tier constraints. If query volume grows, add server-side caching.

## Open Questions

None — the approach is straightforward given the small dataset and PostgreSQL-only constraint.
