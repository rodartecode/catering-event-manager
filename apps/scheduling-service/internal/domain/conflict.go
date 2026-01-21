package domain

import "time"

// Conflict represents a scheduling conflict for a resource
type Conflict struct {
	ResourceID          int32     `json:"resource_id"`
	ResourceName        string    `json:"resource_name"`
	ConflictingEventID  int32     `json:"conflicting_event_id"`
	ConflictingEventName string   `json:"conflicting_event_name"`
	ConflictingTaskID   *int32    `json:"conflicting_task_id,omitempty"`
	ConflictingTaskTitle *string  `json:"conflicting_task_title,omitempty"`
	ExistingStartTime   time.Time `json:"existing_start_time"`
	ExistingEndTime     time.Time `json:"existing_end_time"`
	RequestedStartTime  time.Time `json:"requested_start_time"`
	RequestedEndTime    time.Time `json:"requested_end_time"`
	Message             string    `json:"message"`
}

// CheckConflictsRequest represents a request to check for scheduling conflicts
type CheckConflictsRequest struct {
	ResourceIDs []int32   `json:"resource_ids"`
	StartTime   time.Time `json:"start_time"`
	EndTime     time.Time `json:"end_time"`
	// ExcludeScheduleID allows excluding a specific schedule entry (for updates)
	ExcludeScheduleID *int32 `json:"exclude_schedule_id,omitempty"`
}

// CheckConflictsResponse represents the response from conflict checking
type CheckConflictsResponse struct {
	HasConflicts bool       `json:"has_conflicts"`
	Conflicts    []Conflict `json:"conflicts"`
}

// ResourceAvailabilityRequest represents a request for resource availability
type ResourceAvailabilityRequest struct {
	ResourceID int32     `json:"resource_id"`
	StartDate  time.Time `json:"start_date"`
	EndDate    time.Time `json:"end_date"`
}

// ResourceAvailabilityResponse represents the response with schedule entries
type ResourceAvailabilityResponse struct {
	ResourceID int32           `json:"resource_id"`
	Entries    []ScheduleEntry `json:"entries"`
}
