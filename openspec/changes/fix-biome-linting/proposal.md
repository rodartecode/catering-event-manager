## Why

CI pipeline fails at the "Format check" step due to Biome config schema mismatch (1.9.4 vs 2.3.13) and 20 ESLint warnings for unused variables and `any` types. These issues block all PRs from merging.

## What Changes

- Migrate `biome.json` to schema version 2.3.13 using `pnpm biome migrate --write`
- Fix 13 unused variable warnings (remove imports or prefix with underscore)
- Fix 7 explicit `any` type warnings (add proper types or eslint-disable comments)

## Capabilities

### New Capabilities

(None - code quality fix)

### Modified Capabilities

(None - no spec-level behavior changes)

## Impact

- **Files**: biome.json + 11 TypeScript files with lint warnings
- **Risk**: Low - mechanical changes, no behavior modifications
- **Verification**: `pnpm lint` and `pnpm format:check` should pass with zero warnings
