package scheduler

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/catering-event-manager/scheduling-service/internal/domain"
	"github.com/catering-event-manager/scheduling-service/internal/repository"
)

// StationConflictService handles kitchen station capacity conflict detection
type StationConflictService struct {
	queries *repository.Queries
}

// NewStationConflictService creates a new station conflict detection service
func NewStationConflictService(db *sql.DB) *StationConflictService {
	return &StationConflictService{
		queries: repository.New(db),
	}
}

// CheckStationConflicts checks if a station's capacity would be exceeded in the given time range
func (s *StationConflictService) CheckStationConflicts(ctx context.Context, req domain.CheckStationConflictsRequest) (*domain.CheckStationConflictsResponse, error) {
	if req.EndTime.Before(req.StartTime) || req.EndTime.Equal(req.StartTime) {
		return nil, domain.NewValidationError("end_time must be after start_time")
	}

	// Get station capacity
	station, err := s.queries.GetStationCapacity(ctx, req.StationID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, domain.NewNotFoundError(fmt.Sprintf("station %d not found", req.StationID))
		}
		return nil, domain.NewInternalError("failed to get station capacity", err)
	}

	// Count concurrent tasks
	countParams := repository.CountStationConcurrencyParams{
		StationID: sql.NullInt32{Int32: req.StationID, Valid: true},
		Column2:   req.StartTime,
		Column3:   req.EndTime,
	}
	if req.ExcludeTaskID != nil {
		countParams.ExcludeTaskID = sql.NullInt32{Int32: *req.ExcludeTaskID, Valid: true}
	}

	count, err := s.queries.CountStationConcurrency(ctx, countParams)
	if err != nil {
		return nil, domain.NewInternalError("failed to count station concurrency", err)
	}

	// Get conflicting tasks for detail
	conflictParams := repository.CheckStationConflictsParams{
		StationID: sql.NullInt32{Int32: req.StationID, Valid: true},
		Column2:   req.StartTime,
		Column3:   req.EndTime,
	}
	if req.ExcludeTaskID != nil {
		conflictParams.ExcludeTaskID = sql.NullInt32{Int32: *req.ExcludeTaskID, Valid: true}
	}

	rows, err := s.queries.CheckStationConflicts(ctx, conflictParams)
	if err != nil {
		return nil, domain.NewInternalError("failed to check station conflicts", err)
	}

	conflicts := make([]domain.StationConflict, 0, len(rows))
	for _, row := range rows {
		conflicts = append(conflicts, domain.StationConflict{
			ProductionTaskID: row.ID,
			TaskName:         row.TaskName,
			EventName:        row.EventName,
			StartTime:        row.ScheduledStart.Time,
			EndTime:          row.ScheduledEnd.Time,
		})
	}

	hasConflicts := count >= int64(station.Capacity)

	return &domain.CheckStationConflictsResponse{
		HasConflicts:    hasConflicts,
		StationCapacity: station.Capacity,
		ConcurrentCount: count,
		Conflicts:       conflicts,
	}, nil
}
