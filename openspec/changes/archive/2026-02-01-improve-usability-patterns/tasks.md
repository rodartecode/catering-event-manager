# Tasks: Improve Usability Patterns

## Phase 1: Skeleton Accessibility (UX-001)

### 1.1 Add aria-busy to skeleton containers
- [x] Update EventListSkeleton.tsx - add `aria-busy="true"` to wrapper div
- [x] Update TaskListSkeleton.tsx - add `aria-busy="true"` to wrapper div
- [x] Update ClientListSkeleton.tsx - add `aria-busy="true"` to wrapper div
- [x] Update AnalyticsSkeleton.tsx - add `aria-busy="true"` to wrapper div

### 1.2 Hide skeleton elements from screen readers
- [x] Add `aria-hidden="true"` to skeleton placeholder divs in each component

**Validation**: Screen reader (VoiceOver/NVDA) announces "Loading..." or busy state, not individual placeholder elements

---

## Phase 2: Unsaved Changes Protection (UX-002)

### 2.1 Create useFormDirty hook
- [x] Create `apps/web/src/hooks/use-form-dirty.ts`
- [x] Implement isDirty state comparison between initial and current values
- [x] Add beforeunload event listener when dirty
- [x] Clean up listener on unmount or when form saved
- [x] Export hook for form components

### 2.2 Add unit tests for useFormDirty
- [x] Create `apps/web/src/hooks/use-form-dirty.test.ts`
- [x] Test isDirty detection with object comparison
- [x] Test beforeunload setup/cleanup
- [x] Test reset after successful save

**Validation**: `pnpm test apps/web/src/hooks/use-form-dirty.test.ts` passes (12/12 tests)

---

## Phase 3: Touch Target Fixes (UX-004)

### 3.1 Fix icon button sizing
- [x] MobileNav.tsx: Change menu button from `p-2` to `p-3` (44px target)
- [x] TaskForm.tsx close button: Add `p-2` padding + hover state for 44px minimum
- [x] ConflictWarning.tsx dismiss button: Add `p-2` padding + hover state
- [x] EventStatusUpdateDialog.tsx close button: Add `p-2` padding + hover state

### 3.2 Fix small button sizing
- [x] TaskStatusButton.tsx: Change `px-3 py-1` to `px-4 py-2` minimum
- [x] Update TaskStatusButton.test.tsx to match new styling

**Validation**: Manual measurement of rendered buttons in browser DevTools

---

## Phase 4: Verification

### 4.1 Run type-check and build
- [x] `pnpm type-check` passes
- [x] `pnpm build` succeeds

### 4.2 Run existing tests
- [x] Tests for changed components pass (18/18)
- [x] Note: Pre-existing LoginForm test flakiness unrelated to changes

### 4.3 Validate spec
- [x] `openspec validate improve-usability-patterns --strict --no-interactive` passes
