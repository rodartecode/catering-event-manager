package domain

import "time"

// StationConflict represents a production task that conflicts with a proposed time slot
type StationConflict struct {
	ProductionTaskID int32     `json:"production_task_id"`
	TaskName         string    `json:"task_name"`
	EventName        string    `json:"event_name"`
	StartTime        time.Time `json:"start_time"`
	EndTime          time.Time `json:"end_time"`
}

// CheckStationConflictsRequest represents a request to check station capacity conflicts
type CheckStationConflictsRequest struct {
	StationID     int32     `json:"station_id"`
	StartTime     time.Time `json:"start_time"`
	EndTime       time.Time `json:"end_time"`
	ExcludeTaskID *int32    `json:"exclude_task_id,omitempty"`
}

// CheckStationConflictsResponse represents the response from station conflict checking
type CheckStationConflictsResponse struct {
	HasConflicts    bool              `json:"has_conflicts"`
	StationCapacity int32             `json:"station_capacity"`
	ConcurrentCount int64             `json:"concurrent_count"`
	Conflicts       []StationConflict `json:"conflicts"`
}
