# Spec: EventForm Type Safety

## MODIFIED Requirements

### Requirement: Type-Safe Callbacks

The `EventForm` component should use proper TypeScript types instead of `any` for all function parameters.

#### Scenario: onSuccess callback receives typed event

- **WHEN** the form successfully creates an event via tRPC
- **THEN** the `onSuccess` callback parameter has the exact type returned by `event.create` mutation
- **AND** TypeScript compilation fails if the callback accesses non-existent properties

#### Scenario: updateField receives typed values

- **WHEN** a form field value is updated via `updateField`
- **THEN** the value parameter accepts only types valid for `EventFormData` fields
- **AND** TypeScript compilation succeeds for valid field/value combinations
