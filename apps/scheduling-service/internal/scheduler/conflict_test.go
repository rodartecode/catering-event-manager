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

func TestCheckConflicts_NoResourceIDs(t *testing.T) {
	testDB := testutil.SetupTestDB(t)
	defer testutil.TeardownTestDB(t, testDB)

	service := NewConflictService(testDB.DB)

	req := domain.CheckConflictsRequest{
		ResourceIDs: []int32{}, // Empty
		StartTime:   time.Now(),
		EndTime:     time.Now().Add(1 * time.Hour),
	}

	result, err := service.CheckConflicts(context.Background(), req)

	require.NoError(t, err)
	assert.False(t, result.HasConflicts)
	assert.Empty(t, result.Conflicts)
}

func TestCheckConflicts_InvalidTimeRange_EndBeforeStart(t *testing.T) {
	testDB := testutil.SetupTestDB(t)
	defer testutil.TeardownTestDB(t, testDB)

	service := NewConflictService(testDB.DB)

	now := time.Now()
	req := domain.CheckConflictsRequest{
		ResourceIDs: []int32{1},
		StartTime:   now,
		EndTime:     now.Add(-1 * time.Hour), // End before start
	}

	result, err := service.CheckConflicts(context.Background(), req)

	assert.Nil(t, result)
	require.Error(t, err)

	domainErr, ok := err.(*domain.DomainError)
	require.True(t, ok)
	assert.Equal(t, domain.ErrCodeValidation, domainErr.Code)
	assert.Contains(t, domainErr.Message, "end_time must be after start_time")
}

func TestCheckConflicts_InvalidTimeRange_EndEqualsStart(t *testing.T) {
	testDB := testutil.SetupTestDB(t)
	defer testutil.TeardownTestDB(t, testDB)

	service := NewConflictService(testDB.DB)

	now := time.Now()
	req := domain.CheckConflictsRequest{
		ResourceIDs: []int32{1},
		StartTime:   now,
		EndTime:     now, // Same as start
	}

	result, err := service.CheckConflicts(context.Background(), req)

	assert.Nil(t, result)
	require.Error(t, err)

	domainErr, ok := err.(*domain.DomainError)
	require.True(t, ok)
	assert.Equal(t, domain.ErrCodeValidation, domainErr.Code)
}

func TestCheckConflicts_NoConflicts(t *testing.T) {
	testDB := testutil.SetupTestDB(t)
	defer testutil.TeardownTestDB(t, testDB)

	// Setup base data
	_, _, eventID := testutil.SetupBaseData(t, testDB.DB)
	resourceID := testutil.CreateResource(t, testDB.DB, &testutil.ResourceOpts{
		Name:        "Chef",
		Type:        testutil.ResourceTypeStaff,
		IsAvailable: true,
	})

	// Create an existing schedule entry from 09:00 to 17:00
	baseDay := time.Date(2025, 6, 15, 0, 0, 0, 0, time.UTC)
	existingStart := baseDay.Add(9 * time.Hour)
	existingEnd := baseDay.Add(17 * time.Hour)
	testutil.CreateScheduleEntry(t, testDB.DB, resourceID, eventID, existingStart, existingEnd, nil)

	service := NewConflictService(testDB.DB)

	// Check for conflicts BEFORE the existing entry (05:00 - 08:00)
	req := domain.CheckConflictsRequest{
		ResourceIDs: []int32{resourceID},
		StartTime:   baseDay.Add(5 * time.Hour),
		EndTime:     baseDay.Add(8 * time.Hour),
	}

	result, err := service.CheckConflicts(context.Background(), req)

	require.NoError(t, err)
	assert.False(t, result.HasConflicts)
	assert.Empty(t, result.Conflicts)
}

func TestCheckConflicts_NoConflicts_AfterExisting(t *testing.T) {
	testDB := testutil.SetupTestDB(t)
	defer testutil.TeardownTestDB(t, testDB)

	// Setup base data
	_, _, eventID := testutil.SetupBaseData(t, testDB.DB)
	resourceID := testutil.CreateResource(t, testDB.DB, &testutil.ResourceOpts{
		Name: "Chef",
		Type: testutil.ResourceTypeStaff,
	})

	// Create an existing schedule entry from 09:00 to 17:00
	baseDay := time.Date(2025, 6, 15, 0, 0, 0, 0, time.UTC)
	existingStart := baseDay.Add(9 * time.Hour)
	existingEnd := baseDay.Add(17 * time.Hour)
	testutil.CreateScheduleEntry(t, testDB.DB, resourceID, eventID, existingStart, existingEnd, nil)

	service := NewConflictService(testDB.DB)

	// Check for conflicts AFTER the existing entry (18:00 - 21:00)
	req := domain.CheckConflictsRequest{
		ResourceIDs: []int32{resourceID},
		StartTime:   baseDay.Add(18 * time.Hour),
		EndTime:     baseDay.Add(21 * time.Hour),
	}

	result, err := service.CheckConflicts(context.Background(), req)

	require.NoError(t, err)
	assert.False(t, result.HasConflicts)
	assert.Empty(t, result.Conflicts)
}

func TestCheckConflicts_SingleOverlap(t *testing.T) {
	testDB := testutil.SetupTestDB(t)
	defer testutil.TeardownTestDB(t, testDB)

	// Setup base data
	_, _, eventID := testutil.SetupBaseData(t, testDB.DB)
	resourceID := testutil.CreateResource(t, testDB.DB, &testutil.ResourceOpts{
		Name: "Chef",
		Type: testutil.ResourceTypeStaff,
	})

	// Create an existing schedule entry from 09:00 to 17:00
	baseDay := time.Date(2025, 6, 15, 0, 0, 0, 0, time.UTC)
	existingStart := baseDay.Add(9 * time.Hour)
	existingEnd := baseDay.Add(17 * time.Hour)
	testutil.CreateScheduleEntry(t, testDB.DB, resourceID, eventID, existingStart, existingEnd, nil)

	service := NewConflictService(testDB.DB)

	// Check for overlap at the start (07:00 - 12:00 overlaps with 09:00 - 17:00)
	req := domain.CheckConflictsRequest{
		ResourceIDs: []int32{resourceID},
		StartTime:   baseDay.Add(7 * time.Hour),
		EndTime:     baseDay.Add(12 * time.Hour),
	}

	result, err := service.CheckConflicts(context.Background(), req)

	require.NoError(t, err)
	assert.True(t, result.HasConflicts)
	require.Len(t, result.Conflicts, 1)

	conflict := result.Conflicts[0]
	assert.Equal(t, resourceID, conflict.ResourceID)
	assert.Equal(t, "Chef", conflict.ResourceName)
	assert.Equal(t, eventID, conflict.ConflictingEventID)
	assert.Contains(t, conflict.Message, "Chef")
	assert.Contains(t, conflict.Message, "already assigned")
}

func TestCheckConflicts_MultipleOverlaps(t *testing.T) {
	testDB := testutil.SetupTestDB(t)
	defer testutil.TeardownTestDB(t, testDB)

	// Setup base data
	_, _, eventID := testutil.SetupBaseData(t, testDB.DB)
	resource1 := testutil.CreateResource(t, testDB.DB, &testutil.ResourceOpts{Name: "Chef 1", Type: testutil.ResourceTypeStaff})
	resource2 := testutil.CreateResource(t, testDB.DB, &testutil.ResourceOpts{Name: "Chef 2", Type: testutil.ResourceTypeStaff})

	// Create schedule entries for both resources
	baseDay := time.Date(2025, 6, 15, 0, 0, 0, 0, time.UTC)
	existingStart := baseDay.Add(9 * time.Hour)
	existingEnd := baseDay.Add(17 * time.Hour)

	testutil.CreateScheduleEntry(t, testDB.DB, resource1, eventID, existingStart, existingEnd, nil)
	testutil.CreateScheduleEntry(t, testDB.DB, resource2, eventID, existingStart, existingEnd, nil)

	service := NewConflictService(testDB.DB)

	// Check for overlap on both resources
	req := domain.CheckConflictsRequest{
		ResourceIDs: []int32{resource1, resource2},
		StartTime:   baseDay.Add(10 * time.Hour),
		EndTime:     baseDay.Add(14 * time.Hour),
	}

	result, err := service.CheckConflicts(context.Background(), req)

	require.NoError(t, err)
	assert.True(t, result.HasConflicts)
	assert.Len(t, result.Conflicts, 2)
}

func TestCheckConflicts_ExcludeScheduleID(t *testing.T) {
	testDB := testutil.SetupTestDB(t)
	defer testutil.TeardownTestDB(t, testDB)

	// Setup base data
	_, _, eventID := testutil.SetupBaseData(t, testDB.DB)
	resourceID := testutil.CreateResource(t, testDB.DB, nil)

	// Create an existing schedule entry
	baseDay := time.Date(2025, 6, 15, 0, 0, 0, 0, time.UTC)
	existingStart := baseDay.Add(9 * time.Hour)
	existingEnd := baseDay.Add(17 * time.Hour)
	scheduleID := testutil.CreateScheduleEntry(t, testDB.DB, resourceID, eventID, existingStart, existingEnd, nil)

	service := NewConflictService(testDB.DB)

	// Check for conflicts but exclude this schedule entry (update scenario)
	excludeID := scheduleID
	req := domain.CheckConflictsRequest{
		ResourceIDs:       []int32{resourceID},
		StartTime:         existingStart,
		EndTime:           existingEnd,
		ExcludeScheduleID: &excludeID,
	}

	result, err := service.CheckConflicts(context.Background(), req)

	require.NoError(t, err)
	assert.False(t, result.HasConflicts)
	assert.Empty(t, result.Conflicts)
}

func TestCheckConflicts_ExactBoundary_NoOverlap(t *testing.T) {
	testDB := testutil.SetupTestDB(t)
	defer testutil.TeardownTestDB(t, testDB)

	// Setup base data
	_, _, eventID := testutil.SetupBaseData(t, testDB.DB)
	resourceID := testutil.CreateResource(t, testDB.DB, nil)

	// Create an existing schedule entry from 09:00 to 17:00
	baseDay := time.Date(2025, 6, 15, 0, 0, 0, 0, time.UTC)
	existingStart := baseDay.Add(9 * time.Hour)
	existingEnd := baseDay.Add(17 * time.Hour)
	testutil.CreateScheduleEntry(t, testDB.DB, resourceID, eventID, existingStart, existingEnd, nil)

	service := NewConflictService(testDB.DB)

	// Check for conflicts starting exactly when existing ends (17:00 - 20:00)
	// Using [) interval semantics, this should NOT conflict
	req := domain.CheckConflictsRequest{
		ResourceIDs: []int32{resourceID},
		StartTime:   baseDay.Add(17 * time.Hour), // Exactly at existing end
		EndTime:     baseDay.Add(20 * time.Hour),
	}

	result, err := service.CheckConflicts(context.Background(), req)

	require.NoError(t, err)
	// With [) interval semantics, starting exactly at end time should NOT overlap
	assert.False(t, result.HasConflicts)
}

func TestCheckConflicts_FullyContained(t *testing.T) {
	testDB := testutil.SetupTestDB(t)
	defer testutil.TeardownTestDB(t, testDB)

	// Setup base data
	_, _, eventID := testutil.SetupBaseData(t, testDB.DB)
	resourceID := testutil.CreateResource(t, testDB.DB, nil)

	// Create an existing schedule entry from 09:00 to 17:00
	baseDay := time.Date(2025, 6, 15, 0, 0, 0, 0, time.UTC)
	existingStart := baseDay.Add(9 * time.Hour)
	existingEnd := baseDay.Add(17 * time.Hour)
	testutil.CreateScheduleEntry(t, testDB.DB, resourceID, eventID, existingStart, existingEnd, nil)

	service := NewConflictService(testDB.DB)

	// Requested range is fully contained within existing (11:00 - 15:00)
	req := domain.CheckConflictsRequest{
		ResourceIDs: []int32{resourceID},
		StartTime:   baseDay.Add(11 * time.Hour),
		EndTime:     baseDay.Add(15 * time.Hour),
	}

	result, err := service.CheckConflicts(context.Background(), req)

	require.NoError(t, err)
	assert.True(t, result.HasConflicts)
	assert.Len(t, result.Conflicts, 1)
}

func TestCheckConflicts_FullyContains(t *testing.T) {
	testDB := testutil.SetupTestDB(t)
	defer testutil.TeardownTestDB(t, testDB)

	// Setup base data
	_, _, eventID := testutil.SetupBaseData(t, testDB.DB)
	resourceID := testutil.CreateResource(t, testDB.DB, nil)

	// Create an existing schedule entry from 09:00 to 17:00
	baseDay := time.Date(2025, 6, 15, 0, 0, 0, 0, time.UTC)
	existingStart := baseDay.Add(9 * time.Hour)
	existingEnd := baseDay.Add(17 * time.Hour)
	testutil.CreateScheduleEntry(t, testDB.DB, resourceID, eventID, existingStart, existingEnd, nil)

	service := NewConflictService(testDB.DB)

	// Requested range fully contains existing (07:00 - 19:00)
	req := domain.CheckConflictsRequest{
		ResourceIDs: []int32{resourceID},
		StartTime:   baseDay.Add(7 * time.Hour),
		EndTime:     baseDay.Add(19 * time.Hour),
	}

	result, err := service.CheckConflicts(context.Background(), req)

	require.NoError(t, err)
	assert.True(t, result.HasConflicts)
	assert.Len(t, result.Conflicts, 1)
}

func TestCheckConflicts_WithTaskInfo(t *testing.T) {
	testDB := testutil.SetupTestDB(t)
	defer testutil.TeardownTestDB(t, testDB)

	// Setup base data with a task
	_, _, eventID := testutil.SetupBaseData(t, testDB.DB)
	resourceID := testutil.CreateResource(t, testDB.DB, &testutil.ResourceOpts{Name: "Head Chef"})
	taskID := testutil.CreateTask(t, testDB.DB, eventID, &testutil.TaskOpts{Title: "Food Prep"})

	// Create schedule entry with task
	baseDay := time.Date(2025, 6, 15, 0, 0, 0, 0, time.UTC)
	existingStart := baseDay.Add(9 * time.Hour)
	existingEnd := baseDay.Add(17 * time.Hour)
	testutil.CreateScheduleEntry(t, testDB.DB, resourceID, eventID, existingStart, existingEnd, &testutil.ScheduleEntryOpts{
		TaskID: &taskID,
	})

	service := NewConflictService(testDB.DB)

	// Check for overlap
	req := domain.CheckConflictsRequest{
		ResourceIDs: []int32{resourceID},
		StartTime:   baseDay.Add(10 * time.Hour),
		EndTime:     baseDay.Add(12 * time.Hour),
	}

	result, err := service.CheckConflicts(context.Background(), req)

	require.NoError(t, err)
	assert.True(t, result.HasConflicts)
	require.Len(t, result.Conflicts, 1)

	conflict := result.Conflicts[0]
	require.NotNil(t, conflict.ConflictingTaskID)
	assert.Equal(t, taskID, *conflict.ConflictingTaskID)
	require.NotNil(t, conflict.ConflictingTaskTitle)
	assert.Equal(t, "Food Prep", *conflict.ConflictingTaskTitle)
}

func TestCheckConflicts_NonExistentResource(t *testing.T) {
	testDB := testutil.SetupTestDB(t)
	defer testutil.TeardownTestDB(t, testDB)

	service := NewConflictService(testDB.DB)

	// Check for conflicts with non-existent resource ID
	req := domain.CheckConflictsRequest{
		ResourceIDs: []int32{99999},
		StartTime:   time.Now(),
		EndTime:     time.Now().Add(1 * time.Hour),
	}

	result, err := service.CheckConflicts(context.Background(), req)

	require.NoError(t, err)
	assert.False(t, result.HasConflicts)
	assert.Empty(t, result.Conflicts)
}
