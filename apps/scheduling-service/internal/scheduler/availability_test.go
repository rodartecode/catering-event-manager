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

func TestGetResourceAvailability_ValidRange(t *testing.T) {
	testDB := testutil.SetupTestDB(t)
	defer testutil.TeardownTestDB(t, testDB)

	// Setup base data
	_, _, eventID := testutil.SetupBaseData(t, testDB.DB)
	resourceID := testutil.CreateResource(t, testDB.DB, &testutil.ResourceOpts{
		Name: "Chef",
		Type: testutil.ResourceTypeStaff,
	})

	// Create schedule entries
	baseDay := time.Date(2025, 6, 15, 0, 0, 0, 0, time.UTC)
	testutil.CreateScheduleEntry(t, testDB.DB, resourceID, eventID,
		baseDay.Add(9*time.Hour), baseDay.Add(12*time.Hour), nil)
	testutil.CreateScheduleEntry(t, testDB.DB, resourceID, eventID,
		baseDay.Add(14*time.Hour), baseDay.Add(17*time.Hour), nil)

	service := NewAvailabilityService(testDB.DB)

	req := domain.ResourceAvailabilityRequest{
		ResourceID: resourceID,
		StartDate:  baseDay,
		EndDate:    baseDay.Add(24 * time.Hour),
	}

	result, err := service.GetResourceAvailability(context.Background(), req)

	require.NoError(t, err)
	assert.Equal(t, resourceID, result.ResourceID)
	assert.Len(t, result.Entries, 2)
}

func TestGetResourceAvailability_InvalidRange(t *testing.T) {
	testDB := testutil.SetupTestDB(t)
	defer testutil.TeardownTestDB(t, testDB)

	service := NewAvailabilityService(testDB.DB)

	now := time.Now()
	req := domain.ResourceAvailabilityRequest{
		ResourceID: 1,
		StartDate:  now,
		EndDate:    now.Add(-1 * time.Hour), // End before start
	}

	result, err := service.GetResourceAvailability(context.Background(), req)

	assert.Nil(t, result)
	require.Error(t, err)

	domainErr, ok := err.(*domain.DomainError)
	require.True(t, ok)
	assert.Equal(t, domain.ErrCodeValidation, domainErr.Code)
	assert.Contains(t, domainErr.Message, "end_date must be after start_date")
}

func TestGetResourceAvailability_EmptyResult(t *testing.T) {
	testDB := testutil.SetupTestDB(t)
	defer testutil.TeardownTestDB(t, testDB)

	// Setup base data (no schedule entries)
	testutil.SetupBaseData(t, testDB.DB)
	resourceID := testutil.CreateResource(t, testDB.DB, nil)

	service := NewAvailabilityService(testDB.DB)

	req := domain.ResourceAvailabilityRequest{
		ResourceID: resourceID,
		StartDate:  time.Now(),
		EndDate:    time.Now().Add(24 * time.Hour),
	}

	result, err := service.GetResourceAvailability(context.Background(), req)

	require.NoError(t, err)
	assert.Equal(t, resourceID, result.ResourceID)
	assert.Empty(t, result.Entries)
}

func TestGetResourceAvailability_WithTaskInfo(t *testing.T) {
	testDB := testutil.SetupTestDB(t)
	defer testutil.TeardownTestDB(t, testDB)

	// Setup base data
	_, _, eventID := testutil.SetupBaseData(t, testDB.DB)
	resourceID := testutil.CreateResource(t, testDB.DB, nil)
	taskID := testutil.CreateTask(t, testDB.DB, eventID, &testutil.TaskOpts{Title: "Food Prep"})

	// Create schedule entry with task
	baseDay := time.Date(2025, 6, 15, 0, 0, 0, 0, time.UTC)
	testutil.CreateScheduleEntry(t, testDB.DB, resourceID, eventID,
		baseDay.Add(9*time.Hour), baseDay.Add(17*time.Hour),
		&testutil.ScheduleEntryOpts{TaskID: &taskID})

	service := NewAvailabilityService(testDB.DB)

	req := domain.ResourceAvailabilityRequest{
		ResourceID: resourceID,
		StartDate:  baseDay,
		EndDate:    baseDay.Add(24 * time.Hour),
	}

	result, err := service.GetResourceAvailability(context.Background(), req)

	require.NoError(t, err)
	require.Len(t, result.Entries, 1)

	entry := result.Entries[0]
	require.NotNil(t, entry.TaskID)
	assert.Equal(t, taskID, *entry.TaskID)
	require.NotNil(t, entry.TaskTitle)
	assert.Equal(t, "Food Prep", *entry.TaskTitle)
}

func TestGetResourceByID_Found(t *testing.T) {
	testDB := testutil.SetupTestDB(t)
	defer testutil.TeardownTestDB(t, testDB)

	resourceID := testutil.CreateResource(t, testDB.DB, &testutil.ResourceOpts{
		Name:        "Head Chef",
		Type:        testutil.ResourceTypeStaff,
		IsAvailable: true,
	})

	service := NewAvailabilityService(testDB.DB)

	result, err := service.GetResourceByID(context.Background(), resourceID)

	require.NoError(t, err)
	assert.Equal(t, resourceID, result.ID)
	assert.Equal(t, "Head Chef", result.Name)
	assert.Equal(t, domain.ResourceType("staff"), result.Type)
	assert.True(t, result.IsAvailable)
}

func TestGetResourceByID_NotFound(t *testing.T) {
	testDB := testutil.SetupTestDB(t)
	defer testutil.TeardownTestDB(t, testDB)

	service := NewAvailabilityService(testDB.DB)

	result, err := service.GetResourceByID(context.Background(), 99999)

	assert.Nil(t, result)
	require.Error(t, err)

	domainErr, ok := err.(*domain.DomainError)
	require.True(t, ok)
	assert.Equal(t, domain.ErrCodeNotFound, domainErr.Code)
	assert.Contains(t, domainErr.Message, "resource not found")
}

func TestGetResourceByID_WithNullableFields(t *testing.T) {
	testDB := testutil.SetupTestDB(t)
	defer testutil.TeardownTestDB(t, testDB)

	hourlyRate := "150.00"
	notes := "Senior chef with 10 years experience"
	resourceID := testutil.CreateResource(t, testDB.DB, &testutil.ResourceOpts{
		Name:        "Senior Chef",
		Type:        testutil.ResourceTypeStaff,
		HourlyRate:  &hourlyRate,
		IsAvailable: true,
		Notes:       &notes,
	})

	service := NewAvailabilityService(testDB.DB)

	result, err := service.GetResourceByID(context.Background(), resourceID)

	require.NoError(t, err)
	require.NotNil(t, result.HourlyRate)
	assert.Equal(t, "150.00", *result.HourlyRate)
	require.NotNil(t, result.Notes)
	assert.Equal(t, "Senior chef with 10 years experience", *result.Notes)
}

func TestGetResourceByID_AllResourceTypes(t *testing.T) {
	testDB := testutil.SetupTestDB(t)
	defer testutil.TeardownTestDB(t, testDB)

	testCases := []struct {
		name         string
		resourceType string
		expected     domain.ResourceType
	}{
		{"Staff", testutil.ResourceTypeStaff, domain.ResourceTypeStaff},
		{"Equipment", testutil.ResourceTypeEquipment, domain.ResourceTypeEquipment},
		{"Materials", testutil.ResourceTypeMaterials, domain.ResourceTypeMaterials},
	}

	service := NewAvailabilityService(testDB.DB)

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			resourceID := testutil.CreateResource(t, testDB.DB, &testutil.ResourceOpts{
				Name: tc.name,
				Type: tc.resourceType,
			})

			result, err := service.GetResourceByID(context.Background(), resourceID)

			require.NoError(t, err)
			assert.Equal(t, tc.expected, result.Type)
		})
	}
}
