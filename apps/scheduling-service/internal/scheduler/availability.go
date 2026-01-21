package scheduler

import (
	"context"
	"database/sql"

	"github.com/catering-event-manager/scheduling-service/internal/domain"
	"github.com/catering-event-manager/scheduling-service/internal/repository"
)

// AvailabilityService handles resource availability queries
type AvailabilityService struct {
	queries *repository.Queries
}

// NewAvailabilityService creates a new availability service
func NewAvailabilityService(db *sql.DB) *AvailabilityService {
	return &AvailabilityService{
		queries: repository.New(db),
	}
}

// GetResourceAvailability returns all schedule entries for a resource within the given date range
func (s *AvailabilityService) GetResourceAvailability(ctx context.Context, req domain.ResourceAvailabilityRequest) (*domain.ResourceAvailabilityResponse, error) {
	// Validate request
	if req.EndDate.Before(req.StartDate) {
		return nil, domain.NewValidationError("end_date must be after start_date")
	}

	// Query schedule entries
	rows, err := s.queries.GetResourceSchedule(ctx, repository.GetResourceScheduleParams{
		ResourceID: req.ResourceID,
		StartTime:  req.StartDate,
		EndTime:    req.EndDate,
	})
	if err != nil {
		return nil, domain.NewInternalError("failed to get resource schedule", err)
	}

	// Convert rows to domain entries
	entries := make([]domain.ScheduleEntry, 0, len(rows))
	for _, row := range rows {
		entry := domain.ScheduleEntry{
			ID:         row.ID,
			ResourceID: row.ResourceID,
			EventID:    row.EventID,
			EventName:  row.EventName,
			StartTime:  row.StartTime,
			EndTime:    row.EndTime,
			CreatedAt:  row.CreatedAt,
			UpdatedAt:  row.UpdatedAt,
		}

		if row.TaskID.Valid {
			entry.TaskID = &row.TaskID.Int32
		}
		if row.TaskTitle.Valid {
			entry.TaskTitle = &row.TaskTitle.String
		}
		if row.Notes.Valid {
			entry.Notes = &row.Notes.String
		}

		entries = append(entries, entry)
	}

	return &domain.ResourceAvailabilityResponse{
		ResourceID: req.ResourceID,
		Entries:    entries,
	}, nil
}

// GetResourceByID retrieves a resource by its ID
func (s *AvailabilityService) GetResourceByID(ctx context.Context, id int32) (*domain.Resource, error) {
	row, err := s.queries.GetResourceByID(ctx, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, domain.NewNotFoundError("resource not found")
		}
		return nil, domain.NewInternalError("failed to get resource", err)
	}

	resource := &domain.Resource{
		ID:          row.ID,
		Name:        row.Name,
		Type:        domain.ResourceType(row.Type),
		IsAvailable: row.IsAvailable,
		CreatedAt:   row.CreatedAt,
		UpdatedAt:   row.UpdatedAt,
	}

	if row.HourlyRate.Valid {
		resource.HourlyRate = &row.HourlyRate.String
	}
	if row.Notes.Valid {
		resource.Notes = &row.Notes.String
	}

	return resource, nil
}
