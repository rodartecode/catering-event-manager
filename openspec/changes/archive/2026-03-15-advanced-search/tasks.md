## 1. Search Router (Backend Core)

- [x] 1.1 Create `apps/web/src/server/routers/search.ts` with `search.global` protectedProcedure — input: `{ query: z.string().min(2).max(100) }`, output: `{ events, clients, tasks, resources }` arrays
- [x] 1.2 Implement 4 parallel ILIKE queries in `search.global`: events (event_name, location), clients (company_name, contact_name, email), tasks (title), resources (name) — each capped at 5 results, archived events excluded
- [x] 1.3 Register `search` router in `apps/web/src/server/routers/_app.ts`

## 2. Per-Entity Search Filters (Backend)

- [x] 2.1 Add optional `query: z.string().min(2).max(100).optional()` to `event.list` input schema and add ILIKE conditions on `event_name` and `location` when provided
- [x] 2.2 Update `clients.list` to accept input object with optional `query` param — add ILIKE conditions on `company_name`, `contact_name`, and `email` when provided
- [x] 2.3 Add optional `query` param to `task.listByEvent` input schema and add ILIKE condition on `title` when provided
- [x] 2.4 Add optional `query` param to `resource.list` input schema and add ILIKE condition on `name` when provided

## 3. Backend Tests

- [x] 3.1 Write `search.test.ts` — test global search across all 4 entities: matching by name, case-insensitivity, archived event exclusion, empty results, query validation (min 2 chars), multi-entity results
- [x] 3.2 Add search filter tests to `event.test.ts` — query-only, query + status combo, no-query backward compatibility
- [x] 3.3 Add search filter tests to `clients.test.ts` — query filtering by company/contact/email, no-query backward compatibility
- [x] 3.4 Add search filter tests to `task.test.ts` — query filtering by title, query + status combo
- [x] 3.5 Add search filter tests to `resource.test.ts` — query filtering by name, query + type combo

## 4. Search Bar Component (Frontend)

- [x] 4.1 Create `apps/web/src/components/search/SearchBar.tsx` — input field with 300ms debounce, calls `search.global`, renders dropdown with up to 3 results per entity type
- [x] 4.2 Create `apps/web/src/components/search/SearchDropdown.tsx` — grouped results dropdown with entity type headers, clickable result items linking to detail pages, keyboard navigation support
- [x] 4.3 Integrate `SearchBar` into `apps/web/src/app/(dashboard)/layout.tsx` — add above main content area, visible on all dashboard pages

## 5. Search Results Page (Frontend)

- [x] 5.1 Create `apps/web/src/app/(dashboard)/search/page.tsx` — reads `q` query param, calls `search.global`, displays categorized results with section headers
- [x] 5.2 Implement empty states: "No results found" when query matches nothing, prompt to search when `q` param is missing
- [x] 5.3 Each result item links to its detail page: events → `/events/{id}`, clients → `/clients/{id}`, tasks → `/events/{eventId}` (task context), resources → `/resources/{id}`

## 6. Frontend Tests

- [x] 6.1 Write `SearchBar.test.tsx` — debounce behavior, dropdown display, result selection navigation, Enter key submission to `/search?q=...`, blur dismisses dropdown
- [x] 6.2 Write `SearchDropdown.test.tsx` — grouped results rendering, empty state, link targets per entity type
- [x] 6.3 Write search results page test — categorized results rendering, empty state, missing query parameter state

## 7. Test DB Helper Update

- [x] 7.1 Verify `apps/web/test/helpers/db.ts` supports all columns needed for search queries (no new columns added, but confirm ILIKE works against existing test schema)
