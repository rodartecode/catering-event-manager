## Why

Users currently have no way to search across events, clients, tasks, or resources by name or keyword. List endpoints support filtering by status/type but lack text-based search, forcing users to scroll through paginated lists to find specific records. As the dataset grows, this becomes a major productivity bottleneck. Adding search is a high-impact, moderate-effort improvement that benefits every user role.

## What Changes

- Add a unified search endpoint (`search.global`) that queries across events, clients, tasks, and resources with a single text input
- Add per-entity text search parameters to existing `event.list`, `clients.list`, `task.listByEvent`, and `resource.list` endpoints
- Add a global search bar component to the app header/navigation
- Add search highlighting in result displays
- Use PostgreSQL `ILIKE` for simple pattern matching (no external search engine dependency)

## Capabilities

### New Capabilities
- `global-search`: Unified cross-entity search with a single query string, returning categorized results (events, clients, tasks, resources) with relevance-based ordering

### Modified Capabilities
_(No existing spec-level requirement changes. The per-entity search parameters are additive to existing list behavior and don't change current requirements.)_

## Impact

- **API**: New `search.global` query procedure in a new `search` tRPC router; updated input schemas for existing list procedures
- **Database**: New `ILIKE`-based where clauses on text columns (name, title, description, companyName, contactName); may add `pg_trgm` extension + GIN indexes if performance requires it
- **UI**: New `SearchBar` component in app layout; new `SearchResultsPage` component
- **Dependencies**: None (PostgreSQL ILIKE is built-in)
- **Go service**: Not affected (search is CRUD-only, no scheduling logic)
