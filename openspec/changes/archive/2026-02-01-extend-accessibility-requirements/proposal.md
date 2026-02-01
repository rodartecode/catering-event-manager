# Proposal: Extend Accessibility Requirements

## Change ID
`extend-accessibility-requirements`

## Why
An accessibility audit revealed WCAG 2.1 AA compliance gaps affecting users with disabilities: insufficient color contrast on yellow badges (~3:1 vs required 4.5:1), missing focus indicators on dialog close buttons, decorative SVG icons announced by screen readers, and custom selection controls lacking ARIA state attributes.

## Summary
Extend the existing `usability` spec with WCAG 2.1 AA accessibility requirements addressing gaps discovered in an accessibility audit. The current usability spec covers loading indicators, unsaved changes, error recovery, and touch targets. This proposal adds requirements for:

- Color contrast compliance
- Focus visibility
- Decorative icon accessibility
- Custom control semantics
- Accessible loading states

## Motivation
An accessibility audit revealed several WCAG 2.1 AA compliance gaps:

| Priority | Issue | Count |
|----------|-------|-------|
| Critical | Yellow badge contrast (~3:1, needs 4.5:1) | 2 components |
| High | Missing `aria-hidden` on decorative SVGs | 5+ components |
| High | Missing focus rings on close buttons | 3 dialogs |
| Medium | Missing `aria-checked` on custom toggles | 1 component |
| Medium | Loading spinner not announced | 1 component |

These issues affect users with:
- Low vision or color blindness (contrast)
- Keyboard-only navigation (focus visibility)
- Screen reader usage (SVG announcements, custom controls)

## Existing Implementation (Already Correct)
The codebase has good accessibility foundations:
- Skip link component (`SkipLink.tsx`)
- Focus trap hook (`use-focus-trap.ts`)
- Form accessibility utilities (`form-a11y.ts`)
- Dialog ARIA patterns (role, aria-modal, aria-labelledby)
- Toast aria-live regions
- Required field indicators with screen reader text

## Scope
This proposal modifies the existing `usability` spec by adding 5 new requirements:
- UX-005: Color Contrast Compliance
- UX-006: Visible Focus Indicators
- UX-007: Decorative Element Accessibility
- UX-008: Custom Control Semantics
- UX-009: Loading State Announcements

## Affected Components (Implementation Phase)
- `EventStatusBadge.tsx` - Contrast fix
- `FollowUpIndicator.tsx` - Contrast fix
- `EventCard.tsx` - Add aria-hidden to icons
- `TaskCard.tsx` - Add aria-hidden to icons
- `OverdueIndicator.tsx` - Add aria-hidden to icon
- `TaskAssignDialog.tsx` - Add focus ring to close button
- `ResourceAssignmentDialog.tsx` - Focus rings, aria-checked, loading announcement

## Out of Scope
- AAA compliance (only targeting AA)
- Automated accessibility testing infrastructure (separate concern)
- High contrast mode / dark mode (future enhancement)
