# Change: Improve Usability Patterns

## Why

The catering event management system has foundational UX patterns but lacks comprehensive usability features for a production-ready experience:

1. **Loading Indicators** - Toast notifications work with aria-live, but skeleton components lack accessibility attributes
2. **Unsaved Changes Protection** - Forms preserve data on errors but don't warn users before navigation
3. **Error Recovery** - Form data preserved on failure but no explicit retry UI
4. **Touch Targets** - Many buttons and icons below 44×44px WCAG guideline

This change establishes the `usability` spec as a new capability and implements missing patterns.

## What Exists (Partial Implementation)

### Loading Indicators (~70% complete)
- ✅ Toast notifications with `role="status"` and `aria-live`
- ✅ Button loading states ("Creating...", "Saving...") with `disabled`
- ✅ Skeleton components with `animate-pulse` styling
- ❌ Missing `aria-busy="true"` on skeleton containers
- ❌ No generic spinner component with `role="status"`

### Unsaved Changes Protection (0% complete)
- ✅ Form state tracking with useState
- ❌ No dirty form detection (isDirty comparison)
- ❌ No beforeunload event handler
- ❌ No navigation interception
- ❌ No cancel confirmation dialogs

### Error Recovery (~60% complete)
- ✅ Form data preserved on validation/server errors
- ✅ Toast notifications for errors with assertive aria-live
- ✅ Session expiry redirect to login with callback URL
- ✅ React Query retry configuration (1 retry for non-auth errors)
- ❌ No explicit "Try Again" button on error toasts
- ❌ No error boundary component

### Touch Targets (~50% complete)
- ✅ Primary buttons generally meet 44px height
- ✅ Icon buttons have aria-label attributes
- ✅ Responsive grid layouts
- ❌ Icon-only buttons below 44×44px minimum
- ❌ MobileNav menu button too small (p-2)
- ❌ Close dialog buttons lack adequate padding

## What Changes

### 1. Create `usability` Spec (NEW)

Establishes formal requirements for:
- **UX-001**: Accessible loading indicators
- **UX-002**: Unsaved changes protection
- **UX-003**: Consistent error recovery
- **UX-004**: Responsive touch targets

### 2. Implementation Tasks

Focus on highest-impact gaps:
1. Add `aria-busy` and `aria-hidden` to skeleton components
2. Create useFormDirty hook for dirty form detection
3. Add beforeunload handler for unsaved changes
4. Audit and fix touch target sizing on buttons

## Impact

- **New spec**: `usability` (4 requirements)
- **Affected components**:
  - `apps/web/src/components/events/EventListSkeleton.tsx`
  - `apps/web/src/components/tasks/TaskListSkeleton.tsx`
  - `apps/web/src/components/clients/ClientListSkeleton.tsx`
  - `apps/web/src/components/analytics/AnalyticsSkeleton.tsx`
  - `apps/web/src/components/dashboard/MobileNav.tsx`
  - `apps/web/src/components/tasks/TaskForm.tsx`
  - `apps/web/src/components/events/EventForm.tsx`
  - `apps/web/src/components/resources/ResourceForm.tsx`
- **New files**:
  - `apps/web/src/hooks/useFormDirty.ts`

## Dependencies

None - builds on existing component patterns.

## Success Criteria

1. All skeleton components have `aria-busy="true"` on containers
2. Forms with unsaved changes trigger warning on navigation
3. Icon buttons meet 44×44px touch target minimum
4. `openspec validate` passes with usability spec
