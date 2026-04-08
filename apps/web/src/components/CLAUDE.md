# CLAUDE.md - React Components

Domain-organized React 19 components with Tailwind CSS 4.

## Directory Structure

```
components/
├── a11y/            # Skip-link, accessibility primitives
├── analytics/       # Charts, metric cards, date range picker, skeletons
├── auth/            # Login/register forms, session guard
├── clients/         # Client card/form, communication log, follow-up banner
├── dashboard/       # Sidebar, MobileNav, UserMenu
├── documents/       # DocumentList, UploadDocumentDialog, FileUploadZone, badges
├── events/          # EventCard, EventForm, EventFormFields, status dialogs
├── expenses/        # ExpenseForm, ExpenseList, ExpenseSummaryCard
├── invoices/        # InvoiceDetail, InvoiceForm, InvoiceList, badges
├── kitchen-production/ # StationCard, StationForm, ProductionTimeline, ProductionTaskCard, badges
├── menus/           # EventMenuBuilder, AddMenuItemDialog, dietary/category badges
├── notifications/   # NotificationBell, NotificationDropdown
├── payments/        # PaymentList, RecordPaymentDialog
├── resources/       # ResourceCard, ResourceForm, ResourceAssignmentDialog, filter/list sub-components
├── scheduling/      # SchedulingCalendar, SchedulingToolbar, ScheduleGrid, ScheduleBlock, dialogs
├── search/          # SearchBar, SearchDropdown
├── shared/          # ExportButton, ImportDialog, BulkActionBar, BatchStatusDialog
├── staff/           # SkillBadge, SkillsEditor, AvailabilityGrid, StaffCard, StaffSuggestionList
├── tasks/           # TaskCard, TaskForm, TaskFormFields, TaskList, GanttChart, dependency tree
└── venues/          # VenueForm, VenueCard, VenueSelect, VenueEquipmentChecklist, VenueListSkeleton
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
