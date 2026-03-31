# CLAUDE.md - React Components

Domain-organized React 19 components with Tailwind CSS 4.

## Directory Structure

```
components/
├── a11y/            # Skip-link, accessibility primitives
├── analytics/       # Charts, metric cards, CSV export buttons
├── auth/            # Login/register forms
├── clients/         # Client list, detail, communication log
├── dashboard/       # Sidebar, MobileNav, UserMenu, layout
├── documents/       # DocumentList, UploadDocumentDialog, DocumentTypeBadge
├── events/          # EventCard, EventForm, EventStatusBadge, EventStatusUpdateDialog
├── expenses/        # ExpenseList, AddExpenseDialog
├── invoices/        # InvoiceDetail, CreateInvoice, RecordPaymentDialog
├── menus/           # EventMenuBuilder, AddMenuItemDialog, badges
├── notifications/   # NotificationBell, NotificationDropdown
├── payments/        # PaymentList
├── resources/       # ResourceCard, ResourceForm, ScheduleBuilder
├── search/          # GlobalSearch, SearchResults
└── tasks/           # TaskCard, TaskForm, TaskDependencyGraph, GanttChart
```

## Patterns

### Domain Exports
Each domain has an `index.ts` barrel file. Import from the domain, not individual files:
```typescript
import { EventCard, EventStatusBadge } from '@/components/events';
```

### Dialog Pattern
Dialogs use `useFocusTrap` + `useDialogId` hooks with proper ARIA:
```typescript
const dialogRef = useRef<HTMLDivElement>(null);
const titleId = useDialogId('dialog-name');
useFocusTrap(dialogRef, { isOpen: true, onClose });
// role="dialog" aria-modal="true" aria-labelledby={titleId}
```
Reference: `EventStatusUpdateDialog` is the canonical example.

### tRPC Data Fetching
Components use tRPC React Query hooks. Invalidation on mutation success:
```typescript
const utils = trpc.useUtils();
const mutation = trpc.entity.create.useMutation({
  onSuccess: () => utils.entity.list.invalidate(),
});
```

### Form Events
Use `React.FormEvent<HTMLFormElement>` (not `React.FormEvent` alone) in React 19.

### Styling
Tailwind utility classes. No custom CSS files. Badge components use consistent color patterns per domain.

## Testing

- Component tests are co-located: `Component.tsx` + `Component.test.tsx`
- Use custom `render()` from `test/helpers/render` (provides tRPC + QueryClient)
- Mock tRPC with `vi.mock` or helpers from `test/helpers/trpc-mock`
- Mock data from `test/helpers/component-factories` (no DB, pure objects)
- Accessibility: extend `expect` with axe matchers via `test/helpers/axe`

## Related

- Parent: `../../CLAUDE.md`
- tRPC server: `../server/CLAUDE.md`
- Hooks: `../hooks/` (useFocusTrap, useDialogId)
