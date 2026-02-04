## 1. Fix CI Workflow

- [x] 1.1 Remove `PNPM_VERSION` environment variable from workflow (line 12)
- [x] 1.2 Remove `version` parameter from all `pnpm/action-setup@v4` steps (6 occurrences)

## 2. Verification

- [x] 2.1 Push changes and verify CI pipeline passes

**Note**: The pnpm version fix was successful - all jobs now pass the pnpm/action-setup step.
A separate pre-existing issue (Biome config schema mismatch) is causing format check to fail.
This requires a separate fix: `pnpm biome migrate` to update biome.json schema.
