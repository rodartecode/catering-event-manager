## Why

The CI pipeline is failing on all branches because `pnpm/action-setup@v4` now strictly enforces a single pnpm version source. We have conflicting specifications: `version: 10` in the GitHub Actions workflow and `"packageManager": "pnpm@10.0.0"` in package.json. This blocks all PRs and deployments.

## What Changes

- Remove the explicit `version` parameter from all `pnpm/action-setup@v4` steps in `.github/workflows/ci.yml`
- Remove the unused `PNPM_VERSION` environment variable from the workflow
- Let the action auto-detect the version from `package.json`'s `packageManager` field (the recommended approach)

## Capabilities

### New Capabilities

(None - this is a configuration fix)

### Modified Capabilities

(None - no spec-level behavior changes)

## Impact

- **CI/CD**: `.github/workflows/ci.yml` - 6 job definitions using pnpm/action-setup
- **Risk**: Low - both sources specify pnpm 10, so behavior is unchanged
- **Verification**: CI pipeline should pass after this change
