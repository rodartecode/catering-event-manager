package scheduler

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/catering-event-manager/scheduling-service/internal/domain"
	"github.com/catering-event-manager/scheduling-service/internal/testutil"
)

func TestCheckStationConflicts_InvalidTimeRange(t *testing.T) {
	testDB := testutil.SetupTestDB(t)
	defer testutil.TeardownTestDB(t, testDB)

	service := NewStationConflictService(testDB.DB)

	now := time.Now()
	req := domain.CheckStationConflictsRequest{
		StationID: 1,
		StartTime: now,
		EndTime:   now.Add(-1 * time.Hour),
	}

	_, err := service.CheckStationConflicts(context.Background(), req)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "end_time must be after start_time")
}

func TestCheckStationConflicts_StationNotFound(t *testing.T) {
	testDB := testutil.SetupTestDB(t)
	defer testutil.TeardownTestDB(t, testDB)

	service := NewStationConflictService(testDB.DB)

	now := time.Now()
	req := domain.CheckStationConflictsRequest{
		StationID: 9999,
		StartTime: now,
		EndTime:   now.Add(1 * time.Hour),
	}

	_, err := service.CheckStationConflicts(context.Background(), req)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "not found")
}
