package scheduler

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/catering-event-manager/scheduling-service/internal/domain"
	"github.com/catering-event-manager/scheduling-service/internal/repository"
)

// ConflictService handles scheduling conflict detection
type ConflictService struct {
	queries *repository.Queries
}

// NewConflictService creates a new conflict detection service
func NewConflictService(db *sql.DB) *ConflictService {
	return &ConflictService{
		queries: repository.New(db),
	}
}

// CheckConflicts checks for scheduling conflicts for the given resources and time range
func (s *ConflictService) CheckConflicts(ctx context.Context, req domain.CheckConflictsRequest) (*domain.CheckConflictsResponse, error) {
	// Validate request
	if len(req.ResourceIDs) == 0 {
		return &domain.CheckConflictsResponse{
			HasConflicts: false,
			Conflicts:    []domain.Conflict{},
		}, nil
	}

	if req.EndTime.Before(req.StartTime) || req.EndTime.Equal(req.StartTime) {
		return nil, domain.NewValidationError("end_time must be after start_time")
	}

	// Build params for query
	params := repository.CheckConflictsParams{
		Column1: req.ResourceIDs,
		Column2: req.StartTime,
		Column3: req.EndTime,
	}

	if req.ExcludeScheduleID != nil {
		params.ExcludeScheduleID = sql.NullInt32{Int32: *req.ExcludeScheduleID, Valid: true}
	}

	// Execute conflict detection query
	rows, err := s.queries.CheckConflicts(ctx, params)
	if err != nil {
		return nil, domain.NewInternalError("failed to check conflicts", err)
	}

	// Convert rows to domain conflicts
	conflicts := make([]domain.Conflict, 0, len(rows))
	for _, row := range rows {
		conflict := domain.Conflict{
			ResourceID:           row.ResourceID,
			ResourceName:         row.ResourceName,
			ConflictingEventID:   row.EventID,
			ConflictingEventName: row.EventName,
			ExistingStartTime:    row.ExistingStartTime,
			ExistingEndTime:      row.ExistingEndTime,
			RequestedStartTime:   req.StartTime,
			RequestedEndTime:     req.EndTime,
			Message:              fmt.Sprintf("Resource '%s' is already assigned to event '%s' from %s to %s", row.ResourceName, row.EventName, row.ExistingStartTime.Format("2006-01-02 15:04"), row.ExistingEndTime.Format("2006-01-02 15:04")),
		}

		if row.TaskID.Valid {
			conflict.ConflictingTaskID = &row.TaskID.Int32
		}
		if row.TaskTitle.Valid {
			conflict.ConflictingTaskTitle = &row.TaskTitle.String
		}

		conflicts = append(conflicts, conflict)
	}

	return &domain.CheckConflictsResponse{
		HasConflicts: len(conflicts) > 0,
		Conflicts:    conflicts,
	}, nil
}
