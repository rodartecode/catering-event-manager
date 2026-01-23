# Specification: Client Communication Management

## Overview

Enables tracking of client communications, recording interaction history, and scheduling follow-up tasks to ensure no client inquiry falls through the cracks.

## Functional Requirements

### FR-022: Record Client Communications

**Description**: Record client communications with date, type, and notes for any event.

**Acceptance Criteria**:
1. User can select an event associated with the client
2. User can select communication type (email, phone, meeting, other)
3. User can enter a subject line (optional)
4. User can enter detailed notes
5. System records who made the communication and when
6. Communication appears in client's history immediately

**Data Model**:
```typescript
interface Communication {
  id: number;
  eventId: number;
  clientId: number;
  type: 'email' | 'phone' | 'meeting' | 'other';
  subject: string | null;
  notes: string | null;
  contactedAt: Date;
  contactedBy: number; // userId
  followUpDate: Date | null;
  followUpCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

---

### FR-023: Schedule Follow-Up Tasks

**Description**: Support scheduling follow-up tasks for client communications.

**Acceptance Criteria**:
1. User can set a follow-up date when recording a communication
2. User can add a follow-up date to an existing communication
3. Dashboard displays count of due/overdue follow-ups
4. User can mark a follow-up as completed
5. Completed follow-ups removed from due list

**Follow-Up States**:
- **Pending**: followUpDate is set, followUpCompleted is false, date >= today
- **Due Today**: followUpDate equals today, followUpCompleted is false
- **Overdue**: followUpDate < today, followUpCompleted is false
- **Completed**: followUpCompleted is true

---

### FR-021: View Client Events and History

**Description**: View all events and communications associated with a specific client.

**Acceptance Criteria**:
1. Client detail page shows all events for that client
2. Client detail page shows complete communication history
3. Communications are ordered by date (newest first)
4. Each communication shows type, subject, notes, and follow-up status

---

## Non-Functional Requirements

### Performance
- Communication list loads in < 1 second for up to 100 items
- Follow-up query executes in < 100ms

### Usability
- Communication form is intuitive and requires minimal clicks
- Follow-up indicators use consistent color coding (yellow=due, red=overdue, green=completed)

---

## UI Components

### Client List Page (`/clients`)
- Search by company name or contact name
- Grid of client cards showing basic info
- Link to client detail page

### Client Detail Page (`/clients/[id]`)
- **Info Tab**: Contact details, edit form (admin only)
- **Events Tab**: Table of events for this client with status badges
- **Communications Tab**: Communication form + history list

### Communication Form
- Event dropdown (required) - shows events for this client
- Type dropdown (required) - email, phone, meeting, other
- Subject input (optional)
- Notes textarea (optional)
- Contacted at date/time (default: now)
- Follow-up date (optional)
- Submit button

### Communication List Item
- Type icon with color
- Subject as heading (or "No subject")
- Notes preview (expandable)
- Contact date and time
- Contacted by user name
- Follow-up indicator badge
- Actions: Edit follow-up, Mark complete (if follow-up exists)

### Follow-Up Banner (Dashboard)
- Alert banner with bell icon
- Message: "You have X follow-ups due"
- Link to view all pending follow-ups
- Dismiss button (session-only)

---

## API Endpoints (tRPC)

### clients.recordCommunication
```typescript
input: {
  eventId: number;
  clientId: number;
  type: 'email' | 'phone' | 'meeting' | 'other';
  subject?: string;
  notes?: string;
  contactedAt?: Date; // default: now
  followUpDate?: Date;
}
output: Communication
```

### clients.listCommunications
```typescript
input: {
  clientId: number;
  limit?: number; // default: 50
  offset?: number; // default: 0
}
output: {
  communications: CommunicationWithRelations[];
  total: number;
}
```

### clients.scheduleFollowUp
```typescript
input: {
  communicationId: number;
  followUpDate: Date;
}
output: Communication
```

### clients.completeFollowUp
```typescript
input: {
  communicationId: number;
}
output: Communication
```

### clients.getDueFollowUps
```typescript
input: {} // empty
output: {
  followUps: DueFollowUp[];
  count: number;
}

interface DueFollowUp {
  communication: Communication;
  client: { id: number; companyName: string; contactName: string };
  event: { id: number; eventName: string };
  daysOverdue: number; // 0 for due today, positive for overdue
}
```

---

## Database Schema

### communications table
```sql
CREATE TABLE communications (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id),
  client_id INTEGER NOT NULL REFERENCES clients(id),
  type communication_type NOT NULL,
  subject VARCHAR(255),
  notes TEXT,
  contacted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  contacted_by INTEGER REFERENCES users(id),
  follow_up_date TIMESTAMP,
  follow_up_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_communications_event_id ON communications(event_id);
CREATE INDEX idx_communications_client_id ON communications(client_id);
CREATE INDEX idx_communications_follow_up ON communications(follow_up_date)
  WHERE follow_up_completed = FALSE;
```

---

## Success Criteria

- **SC-008**: Client communication history is complete and accessible for 100% of events
  - Every event page links to client detail with full communication history
  - No communication is lost or inaccessible

---

## Out of Scope (Future Enhancements)

- Email integration (auto-logging from email client)
- Communication templates
- Automated reminder notifications
- Bulk communication features
- SMS/messaging integration
