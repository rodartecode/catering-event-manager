# Tasks: Extend Accessibility Requirements

## Phase 1: Color Contrast Fixes (UX-005)

- [x] 1.1 Fix yellow badge contrast in `EventStatusBadge.tsx`
  - Change "preparation" status from `bg-yellow-100 text-yellow-800` to `bg-amber-100 text-amber-900` (or equivalent 4.5:1 ratio)
  - Verify contrast with WebAIM contrast checker

- [x] 1.2 Fix yellow badge contrast in `FollowUpIndicator.tsx`
  - Update yellow variant to meet 4.5:1 contrast ratio
  - Ensure consistency with EventStatusBadge colors

- [x] 1.3 Verify gray badge contrast in `TaskStatusBadge.tsx`
  - Confirm `bg-gray-100 text-gray-800` meets 4.5:1 (currently ~3.5:1)
  - Adjust to `text-gray-900` if needed

## Phase 2: Focus Visibility Improvements (UX-006)

- [x] 2.1 Add focus ring to close button in `TaskAssignDialog.tsx`
  - Add `focus:ring-2 focus:ring-blue-500 focus:ring-offset-2` classes
  - Verify keyboard navigation works correctly

- [x] 2.2 Add focus ring to close button in `ResourceAssignmentDialog.tsx`
  - Add consistent focus ring styling to close button
  - Ensure focus is visible against dialog background

- [x] 2.3 Add focus ring to filter buttons in `ResourceAssignmentDialog.tsx`
  - Add focus styling to "All", "Staff", "Equipment", "Materials" filter buttons
  - Ensure focus moves predictably between filters

- [x] 2.4 Verify focus rings on all dialog close buttons
  - Check `TaskForm.tsx`, `EventStatusUpdateDialog.tsx`, `EventForm.tsx`
  - Add missing focus styling if needed

## Phase 3: Decorative Icon Accessibility (UX-007)

- [x] 3.1 Add aria-hidden to icons in `EventCard.tsx`
  - Add `aria-hidden="true"` to client name icon (user icon)
  - Add `aria-hidden="true"` to date icon (calendar icon)
  - Verify icons don't interfere with screen reader flow

- [x] 3.2 Add aria-hidden to icons in `TaskCard.tsx`
  - Add `aria-hidden="true"` to calendar icon
  - Add `aria-hidden="true"` to user icon
  - Add `aria-hidden="true"` to dependency icon
  - Add `aria-hidden="true"` to resources icon

- [x] 3.3 Add aria-hidden to icon in `OverdueIndicator.tsx`
  - Add `aria-hidden="true"` to warning icon SVG
  - Text "Overdue" already provides accessible label

- [x] 3.4 Verify aria-label on icon-only buttons
  - Check all dialogs have `aria-label="Close dialog"` on close buttons
  - Verify pattern is consistent across codebase

## Phase 4: Custom Control Semantics (UX-008)

- [x] 4.1 Add aria-checked to resource selection in `ResourceAssignmentDialog.tsx`
  - Add `aria-checked={isSelected}` to resource selection buttons
  - Or change to `role="checkbox"` with `aria-checked`
  - Ensure state updates are reflected in ARIA attributes

- [x] 4.2 Review other toggle/selection patterns
  - Check for any other custom checkbox or toggle implementations
  - Apply consistent ARIA pattern

## Phase 5: Loading State Announcements (UX-009)

- [x] 5.1 Add aria-busy to loading spinner in `ResourceAssignmentDialog.tsx`
  - Wrap spinner in container with `aria-busy="true"` and `aria-label="Loading resources"`
  - Remove aria-busy when content loads

- [x] 5.2 Review other loading states
  - Check for other components with loading spinners
  - Apply consistent aria-busy pattern

## Phase 6: Testing & Verification

- [x] 6.1 Run type-check and build
  - `pnpm type-check`
  - `pnpm build`

- [x] 6.2 Manual keyboard navigation test
  - Tab through all dialogs
  - Verify focus is always visible
  - Verify Escape closes dialogs

- [x] 6.3 Screen reader spot check (optional)
  - Test with VoiceOver or NVDA
  - Verify decorative icons are not announced
  - Verify loading states are announced

---

## Dependencies
- None (all changes are to existing components)

## Parallelization
- Phases 1, 2, 3 can be done in parallel
- Phase 4 and 5 can be done in parallel after Phase 2-3
- Phase 6 must be done last
