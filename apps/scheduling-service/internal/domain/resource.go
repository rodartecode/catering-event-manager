package domain

import (
	"time"
)

// ResourceType represents the type of resource
type ResourceType string

const (
	ResourceTypeStaff     ResourceType = "staff"
	ResourceTypeEquipment ResourceType = "equipment"
	ResourceTypeMaterials ResourceType = "materials"
)

// Resource represents a staff member, equipment, or material that can be assigned to tasks
type Resource struct {
	ID          int32        `json:"id"`
	Name        string       `json:"name"`
	Type        ResourceType `json:"type"`
	HourlyRate  *string      `json:"hourly_rate,omitempty"`
	IsAvailable bool         `json:"is_available"`
	Notes       *string      `json:"notes,omitempty"`
	CreatedAt   time.Time    `json:"created_at"`
	UpdatedAt   time.Time    `json:"updated_at"`
}

// ScheduleEntry represents a time slot when a resource is assigned
type ScheduleEntry struct {
	ID          int32     `json:"id"`
	ResourceID  int32     `json:"resource_id"`
	EventID     int32     `json:"event_id"`
	EventName   string    `json:"event_name,omitempty"`
	TaskID      *int32    `json:"task_id,omitempty"`
	TaskTitle   *string   `json:"task_title,omitempty"`
	StartTime   time.Time `json:"start_time"`
	EndTime     time.Time `json:"end_time"`
	Notes       *string   `json:"notes,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// TimeRange represents a time period
type TimeRange struct {
	Start time.Time `json:"start"`
	End   time.Time `json:"end"`
}

// DateRange represents a date range for queries
type DateRange struct {
	StartDate time.Time `json:"start_date"`
	EndDate   time.Time `json:"end_date"`
}
