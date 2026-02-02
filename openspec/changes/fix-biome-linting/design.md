## Context

Biome was upgraded from 1.9.4 to 2.3.13 but `biome.json` config wasn't migrated. ESLint also reports 20 `@typescript-eslint` warnings across 11 files that should be fixed for clean CI.

## Goals / Non-Goals

**Goals:**
- Pass `pnpm format:check` (Biome)
- Pass `pnpm lint` with zero warnings (ESLint)
- Unblock CI pipeline completely

**Non-Goals:**
- Changing linting rules or strictness
- Refactoring code beyond lint fixes

## Decisions

**Biome migration**: Use `pnpm biome migrate --write` for automatic config update

**Unused imports**: Remove completely (e.g., `signIn`, `createEvent`, `desc`, `isNull`, `or`)

**Unused destructured params**: Prefix with underscore per ESLint convention (e.g., `_user`, `_eventId`, `_session`)

**Any types in helper functions**: Add proper `typeof db` type from Drizzle context

**Any types with known issues**: Add `// eslint-disable-next-line @typescript-eslint/no-explicit-any` where type mismatch is external (e.g., DrizzleAdapter)

## Risks / Trade-offs

**[None]** All changes are mechanical lint fixes with no behavior changes
