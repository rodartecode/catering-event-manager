## ADDED Requirements

### Requirement: Accessible Loading Indicators (UX-001)

The system SHALL provide loading indicators that are accessible to all users.

#### Scenario: Skeleton loading accessibility

Given skeleton placeholders are displayed while content loads
When a screen reader encounters the area
Then the container has `aria-busy="true"` attribute
And skeleton elements have `aria-hidden="true"` to hide from assistive technology

#### Scenario: Button loading state

Given a button enters a loading/pending state
When the state changes
Then the button text updates to indicate loading (e.g., "Saving...")
And the button has `disabled` attribute to prevent double submission
And the loading state is perceivable by screen readers

#### Scenario: Toast notification accessibility

Given a toast notification appears
When the notification type is success
Then it uses `role="status"` with `aria-live="polite"`
When the notification type is error
Then it uses `role="alert"` with `aria-live="assertive"`

---

### Requirement: Unsaved Changes Protection (UX-002)

The system SHALL warn users before navigating away from forms with unsaved changes.

#### Scenario: Dirty form detection

Given a user has modified form fields from their initial values
When the form state is checked
Then the system detects the form has unsaved changes ("dirty" state)
And the dirty state is tracked via a reusable hook

#### Scenario: Page unload warning

Given a form has unsaved changes
When the user attempts to close the browser tab or refresh
Then the browser's native "Leave site?" dialog appears
And the user can choose to stay or leave

#### Scenario: Successful save clears dirty state

Given a form has unsaved changes
When the form is successfully submitted
Then the dirty state is cleared
And subsequent navigation does not trigger a warning

---

### Requirement: Consistent Error Recovery (UX-003)

The system SHALL provide consistent and helpful error recovery options.

#### Scenario: Form data preservation on error

Given a form submission fails due to validation or server error
When the error is displayed
Then the form data is preserved (not cleared)
And the user can correct and resubmit without re-entering all data

#### Scenario: Session expiry recovery

Given the user's session expires
When they attempt an action requiring authentication
Then they are redirected to login with error indication
And a callback URL preserves their intended destination

#### Scenario: Network error retry configuration

Given a network request fails
When the request is a query (not authentication)
Then the system retries the request automatically (up to 1 time)
And authentication errors do not retry to prevent loops

---

### Requirement: Responsive Touch Targets (UX-004)

The system SHALL provide appropriately sized touch targets for mobile users.

#### Scenario: Minimum touch target size

Given any interactive element (button, link, icon button)
When rendered on any device
Then the touch target is at least 44x44 CSS pixels
Or has sufficient spacing from adjacent targets per WCAG 2.5.5

#### Scenario: Icon button sizing

Given an icon-only button (close, menu toggle, dismiss)
When rendered
Then the button has padding to meet 44x44px touch target requirements
And includes `aria-label` for accessibility

#### Scenario: Form button sizing

Given form action buttons (submit, cancel)
When rendered
Then buttons have adequate padding for comfortable tapping
And maintain consistent sizing across the application
