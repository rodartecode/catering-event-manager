package testutil

import (
	"database/sql"
	"fmt"
	"testing"
	"time"
)

// Fixture IDs for tracking created entities
var (
	userCounter     int
	clientCounter   int
	resourceCounter int
	eventCounter    int
	taskCounter     int
	scheduleCounter int
)

// ResetCounters resets all fixture counters for test isolation
func ResetCounters() {
	userCounter = 0
	clientCounter = 0
	resourceCounter = 0
	eventCounter = 0
	taskCounter = 0
	scheduleCounter = 0
}

// ResourceType enum values
const (
	ResourceTypeStaff     = "staff"
	ResourceTypeEquipment = "equipment"
	ResourceTypeMaterials = "materials"
)

// UserOpts contains optional fields for creating a user
type UserOpts struct {
	Email string
	Name  string
	Role  string
}

// CreateUser creates a test user and returns its ID
func CreateUser(t *testing.T, db *sql.DB, opts *UserOpts) int32 {
	t.Helper()
	userCounter++

	email := fmt.Sprintf("user%d@test.com", userCounter)
	name := fmt.Sprintf("Test User %d", userCounter)
	role := "manager"

	if opts != nil {
		if opts.Email != "" {
			email = opts.Email
		}
		if opts.Name != "" {
			name = opts.Name
		}
		if opts.Role != "" {
			role = opts.Role
		}
	}

	var id int32
	err := db.QueryRow(`
		INSERT INTO users (email, password_hash, name, role, is_active)
		VALUES ($1, 'hash', $2, $3, true)
		RETURNING id
	`, email, name, role).Scan(&id)

	if err != nil {
		t.Fatalf("failed to create user: %v", err)
	}

	return id
}

// ClientOpts contains optional fields for creating a client
type ClientOpts struct {
	CompanyName string
	ContactName string
	Email       string
}

// CreateClient creates a test client and returns its ID
func CreateClient(t *testing.T, db *sql.DB, opts *ClientOpts) int32 {
	t.Helper()
	clientCounter++

	companyName := fmt.Sprintf("Test Company %d", clientCounter)
	contactName := fmt.Sprintf("Contact %d", clientCounter)
	email := fmt.Sprintf("client%d@test.com", clientCounter)

	if opts != nil {
		if opts.CompanyName != "" {
			companyName = opts.CompanyName
		}
		if opts.ContactName != "" {
			contactName = opts.ContactName
		}
		if opts.Email != "" {
			email = opts.Email
		}
	}

	var id int32
	err := db.QueryRow(`
		INSERT INTO clients (company_name, contact_name, email)
		VALUES ($1, $2, $3)
		RETURNING id
	`, companyName, contactName, email).Scan(&id)

	if err != nil {
		t.Fatalf("failed to create client: %v", err)
	}

	return id
}

// ResourceOpts contains optional fields for creating a resource
type ResourceOpts struct {
	Name        string
	Type        string
	HourlyRate  *string
	IsAvailable bool
	Notes       *string
}

// CreateResource creates a test resource and returns its ID
func CreateResource(t *testing.T, db *sql.DB, opts *ResourceOpts) int32 {
	t.Helper()
	resourceCounter++

	name := fmt.Sprintf("Resource %d", resourceCounter)
	resourceType := ResourceTypeStaff
	isAvailable := true

	if opts != nil {
		if opts.Name != "" {
			name = opts.Name
		}
		if opts.Type != "" {
			resourceType = opts.Type
		}
		isAvailable = opts.IsAvailable
	}

	var id int32
	var err error

	if opts != nil && opts.HourlyRate != nil {
		err = db.QueryRow(`
			INSERT INTO resources (name, type, hourly_rate, is_available, notes)
			VALUES ($1, $2, $3, $4, $5)
			RETURNING id
		`, name, resourceType, *opts.HourlyRate, isAvailable, opts.Notes).Scan(&id)
	} else {
		err = db.QueryRow(`
			INSERT INTO resources (name, type, is_available)
			VALUES ($1, $2, $3)
			RETURNING id
		`, name, resourceType, isAvailable).Scan(&id)
	}

	if err != nil {
		t.Fatalf("failed to create resource: %v", err)
	}

	return id
}

// EventOpts contains optional fields for creating an event
type EventOpts struct {
	EventName string
	EventDate time.Time
	Status    string
}

// CreateEvent creates a test event and returns its ID.
// Requires a clientID and createdBy (user ID).
func CreateEvent(t *testing.T, db *sql.DB, clientID, createdBy int32, opts *EventOpts) int32 {
	t.Helper()
	eventCounter++

	eventName := fmt.Sprintf("Event %d", eventCounter)
	eventDate := time.Now().Add(24 * time.Hour) // Tomorrow
	status := "planning"

	if opts != nil {
		if opts.EventName != "" {
			eventName = opts.EventName
		}
		if !opts.EventDate.IsZero() {
			eventDate = opts.EventDate
		}
		if opts.Status != "" {
			status = opts.Status
		}
	}

	var id int32
	err := db.QueryRow(`
		INSERT INTO events (client_id, event_name, event_date, status, created_by)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id
	`, clientID, eventName, eventDate, status, createdBy).Scan(&id)

	if err != nil {
		t.Fatalf("failed to create event: %v", err)
	}

	return id
}

// TaskOpts contains optional fields for creating a task
type TaskOpts struct {
	Title    string
	Category string
	Status   string
}

// CreateTask creates a test task and returns its ID.
// Requires an eventID.
func CreateTask(t *testing.T, db *sql.DB, eventID int32, opts *TaskOpts) int32 {
	t.Helper()
	taskCounter++

	title := fmt.Sprintf("Task %d", taskCounter)
	category := "pre_event"
	status := "pending"

	if opts != nil {
		if opts.Title != "" {
			title = opts.Title
		}
		if opts.Category != "" {
			category = opts.Category
		}
		if opts.Status != "" {
			status = opts.Status
		}
	}

	var id int32
	err := db.QueryRow(`
		INSERT INTO tasks (event_id, title, category, status)
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`, eventID, title, category, status).Scan(&id)

	if err != nil {
		t.Fatalf("failed to create task: %v", err)
	}

	return id
}

// ScheduleEntryOpts contains optional fields for creating a schedule entry
type ScheduleEntryOpts struct {
	TaskID *int32
	Notes  *string
}

// CreateScheduleEntry creates a resource schedule entry and returns its ID.
func CreateScheduleEntry(t *testing.T, db *sql.DB, resourceID, eventID int32, startTime, endTime time.Time, opts *ScheduleEntryOpts) int32 {
	t.Helper()
	scheduleCounter++

	var taskID *int32
	var notes *string

	if opts != nil {
		taskID = opts.TaskID
		notes = opts.Notes
	}

	var id int32
	err := db.QueryRow(`
		INSERT INTO resource_schedule (resource_id, event_id, task_id, start_time, end_time, notes)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id
	`, resourceID, eventID, taskID, startTime, endTime, notes).Scan(&id)

	if err != nil {
		t.Fatalf("failed to create schedule entry: %v", err)
	}

	return id
}

// TimeRange represents a start and end time for test scenarios
type TimeRange struct {
	Start time.Time
	End   time.Time
}

// MakeTimeRange creates a time range from base time with hour offsets
func MakeTimeRange(base time.Time, startHourOffset, endHourOffset int) TimeRange {
	return TimeRange{
		Start: base.Add(time.Duration(startHourOffset) * time.Hour),
		End:   base.Add(time.Duration(endHourOffset) * time.Hour),
	}
}

// OverlappingRanges returns predefined time ranges for testing overlap scenarios.
// The existing range is from 09:00 to 17:00 (8 hours).
func OverlappingRanges(base time.Time) struct {
	Existing       TimeRange // 09:00 - 17:00
	FullyContained TimeRange // 11:00 - 15:00 (within existing)
	FullyContains  TimeRange // 07:00 - 19:00 (contains existing)
	StartWithin    TimeRange // 12:00 - 19:00 (overlaps at start)
	EndWithin      TimeRange // 07:00 - 12:00 (overlaps at end)
	Before         TimeRange // 05:00 - 08:00 (no overlap)
	After          TimeRange // 18:00 - 21:00 (no overlap)
	ExactBoundary  TimeRange // 17:00 - 20:00 (starts exactly at end - no overlap with [) semantics)
} {
	// Set base to start of day
	day := time.Date(base.Year(), base.Month(), base.Day(), 0, 0, 0, 0, base.Location())

	return struct {
		Existing       TimeRange
		FullyContained TimeRange
		FullyContains  TimeRange
		StartWithin    TimeRange
		EndWithin      TimeRange
		Before         TimeRange
		After          TimeRange
		ExactBoundary  TimeRange
	}{
		Existing:       TimeRange{day.Add(9 * time.Hour), day.Add(17 * time.Hour)},   // 09:00 - 17:00
		FullyContained: TimeRange{day.Add(11 * time.Hour), day.Add(15 * time.Hour)},  // 11:00 - 15:00
		FullyContains:  TimeRange{day.Add(7 * time.Hour), day.Add(19 * time.Hour)},   // 07:00 - 19:00
		StartWithin:    TimeRange{day.Add(12 * time.Hour), day.Add(19 * time.Hour)},  // 12:00 - 19:00
		EndWithin:      TimeRange{day.Add(7 * time.Hour), day.Add(12 * time.Hour)},   // 07:00 - 12:00
		Before:         TimeRange{day.Add(5 * time.Hour), day.Add(8 * time.Hour)},    // 05:00 - 08:00
		After:          TimeRange{day.Add(18 * time.Hour), day.Add(21 * time.Hour)},  // 18:00 - 21:00
		ExactBoundary:  TimeRange{day.Add(17 * time.Hour), day.Add(20 * time.Hour)},  // 17:00 - 20:00
	}
}

// SetupBaseData creates the minimum required entities for most tests:
// - 1 user (returns userID)
// - 1 client (returns clientID)
// - 1 event (returns eventID)
func SetupBaseData(t *testing.T, db *sql.DB) (userID, clientID, eventID int32) {
	t.Helper()
	ResetCounters()

	userID = CreateUser(t, db, nil)
	clientID = CreateClient(t, db, nil)
	eventID = CreateEvent(t, db, clientID, userID, nil)

	return userID, clientID, eventID
}
