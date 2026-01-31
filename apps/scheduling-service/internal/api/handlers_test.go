package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/catering-event-manager/scheduling-service/internal/domain"
	"github.com/catering-event-manager/scheduling-service/internal/testutil"
)

// setupTestApp creates a Fiber app with routes registered for testing
func setupTestApp(t *testing.T) (*fiber.App, *testutil.TestDB) {
	t.Helper()

	testDB := testutil.SetupTestDB(t)

	app := fiber.New()
	RegisterMiddleware(app)
	RegisterRoutes(app, testDB.DB)

	return app, testDB
}

func TestHealth_Success(t *testing.T) {
	app, testDB := setupTestApp(t)
	defer testutil.TeardownTestDB(t, testDB)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/health", nil)

	resp, err := app.Test(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)

	body, _ := io.ReadAll(resp.Body)
	var result HealthResponse
	err = json.Unmarshal(body, &result)
	require.NoError(t, err)

	assert.Equal(t, "ok", result.Status)
	assert.Equal(t, "connected", result.Database)
}

func TestCheckConflicts_Success(t *testing.T) {
	app, testDB := setupTestApp(t)
	defer testutil.TeardownTestDB(t, testDB)

	// Setup test data
	_, _, eventID := testutil.SetupBaseData(t, testDB.DB)
	resourceID := testutil.CreateResource(t, testDB.DB, &testutil.ResourceOpts{
		Name: "Chef",
		Type: testutil.ResourceTypeStaff,
	})

	// Create existing schedule
	baseDay := time.Date(2025, 6, 15, 0, 0, 0, 0, time.UTC)
	testutil.CreateScheduleEntry(t, testDB.DB, resourceID, eventID,
		baseDay.Add(9*time.Hour), baseDay.Add(17*time.Hour), nil)

	// Request overlapping time
	reqBody := domain.CheckConflictsRequest{
		ResourceIDs: []int32{resourceID},
		StartTime:   baseDay.Add(10 * time.Hour),
		EndTime:     baseDay.Add(14 * time.Hour),
	}
	body, _ := json.Marshal(reqBody)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/scheduling/check-conflicts", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)

	respBody, _ := io.ReadAll(resp.Body)
	var result domain.CheckConflictsResponse
	err = json.Unmarshal(respBody, &result)
	require.NoError(t, err)

	assert.True(t, result.HasConflicts)
	assert.Len(t, result.Conflicts, 1)
}

func TestCheckConflicts_NoConflicts(t *testing.T) {
	app, testDB := setupTestApp(t)
	defer testutil.TeardownTestDB(t, testDB)

	// Setup test data
	testutil.SetupBaseData(t, testDB.DB)
	resourceID := testutil.CreateResource(t, testDB.DB, nil)

	// Request with no existing schedules
	reqBody := domain.CheckConflictsRequest{
		ResourceIDs: []int32{resourceID},
		StartTime:   time.Now(),
		EndTime:     time.Now().Add(1 * time.Hour),
	}
	body, _ := json.Marshal(reqBody)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/scheduling/check-conflicts", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)

	respBody, _ := io.ReadAll(resp.Body)
	var result domain.CheckConflictsResponse
	err = json.Unmarshal(respBody, &result)
	require.NoError(t, err)

	assert.False(t, result.HasConflicts)
	assert.Empty(t, result.Conflicts)
}

func TestCheckConflicts_InvalidJSON(t *testing.T) {
	app, testDB := setupTestApp(t)
	defer testutil.TeardownTestDB(t, testDB)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/scheduling/check-conflicts",
		bytes.NewReader([]byte("invalid json")))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)

	body, _ := io.ReadAll(resp.Body)
	var result ErrorResponse
	err = json.Unmarshal(body, &result)
	require.NoError(t, err)

	assert.Equal(t, "invalid_request", result.Error)
}

func TestCheckConflicts_ValidationError(t *testing.T) {
	app, testDB := setupTestApp(t)
	defer testutil.TeardownTestDB(t, testDB)

	// End time before start time
	now := time.Now()
	reqBody := domain.CheckConflictsRequest{
		ResourceIDs: []int32{1},
		StartTime:   now,
		EndTime:     now.Add(-1 * time.Hour), // Invalid
	}
	body, _ := json.Marshal(reqBody)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/scheduling/check-conflicts", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)

	respBody, _ := io.ReadAll(resp.Body)
	var result ErrorResponse
	err = json.Unmarshal(respBody, &result)
	require.NoError(t, err)

	assert.Equal(t, "VALIDATION", result.Error)
}

func TestResourceAvailability_Success(t *testing.T) {
	app, testDB := setupTestApp(t)
	defer testutil.TeardownTestDB(t, testDB)

	// Setup test data
	_, _, eventID := testutil.SetupBaseData(t, testDB.DB)
	resourceID := testutil.CreateResource(t, testDB.DB, nil)

	// Create schedule entry
	baseDay := time.Date(2025, 6, 15, 0, 0, 0, 0, time.UTC)
	testutil.CreateScheduleEntry(t, testDB.DB, resourceID, eventID,
		baseDay.Add(9*time.Hour), baseDay.Add(17*time.Hour), nil)

	startDate := baseDay.Format(time.RFC3339)
	endDate := baseDay.Add(24 * time.Hour).Format(time.RFC3339)

	req := httptest.NewRequest(http.MethodGet,
		"/api/v1/scheduling/resource-availability?resource_id="+
			itoa(int(resourceID))+"&start_date="+startDate+"&end_date="+endDate, nil)

	resp, err := app.Test(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)

	body, _ := io.ReadAll(resp.Body)
	var result domain.ResourceAvailabilityResponse
	err = json.Unmarshal(body, &result)
	require.NoError(t, err)

	assert.Equal(t, resourceID, result.ResourceID)
	assert.Len(t, result.Entries, 1)
}

func TestResourceAvailability_MissingParams(t *testing.T) {
	app, testDB := setupTestApp(t)
	defer testutil.TeardownTestDB(t, testDB)

	// Missing all params
	req := httptest.NewRequest(http.MethodGet, "/api/v1/scheduling/resource-availability", nil)

	resp, err := app.Test(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)

	body, _ := io.ReadAll(resp.Body)
	var result ErrorResponse
	err = json.Unmarshal(body, &result)
	require.NoError(t, err)

	assert.Equal(t, "missing_parameters", result.Error)
}

func TestResourceAvailability_InvalidResourceID(t *testing.T) {
	app, testDB := setupTestApp(t)
	defer testutil.TeardownTestDB(t, testDB)

	now := time.Now()
	startDate := now.Format(time.RFC3339)
	endDate := now.Add(24 * time.Hour).Format(time.RFC3339)

	req := httptest.NewRequest(http.MethodGet,
		"/api/v1/scheduling/resource-availability?resource_id=invalid&start_date="+
			startDate+"&end_date="+endDate, nil)

	resp, err := app.Test(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)

	body, _ := io.ReadAll(resp.Body)
	var result ErrorResponse
	err = json.Unmarshal(body, &result)
	require.NoError(t, err)

	assert.Equal(t, "invalid_resource_id", result.Error)
}

func TestResourceAvailability_InvalidDateFormat(t *testing.T) {
	app, testDB := setupTestApp(t)
	defer testutil.TeardownTestDB(t, testDB)

	req := httptest.NewRequest(http.MethodGet,
		"/api/v1/scheduling/resource-availability?resource_id=1&start_date=invalid&end_date=2025-06-16T00:00:00Z", nil)

	resp, err := app.Test(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)

	body, _ := io.ReadAll(resp.Body)
	var result ErrorResponse
	err = json.Unmarshal(body, &result)
	require.NoError(t, err)

	assert.Equal(t, "invalid_start_date", result.Error)
}

func TestResourceAvailability_ValidationError_EndBeforeStart(t *testing.T) {
	app, testDB := setupTestApp(t)
	defer testutil.TeardownTestDB(t, testDB)

	testutil.SetupBaseData(t, testDB.DB)
	resourceID := testutil.CreateResource(t, testDB.DB, nil)

	now := time.Now()
	startDate := now.Format(time.RFC3339)
	endDate := now.Add(-1 * time.Hour).Format(time.RFC3339) // End before start

	req := httptest.NewRequest(http.MethodGet,
		"/api/v1/scheduling/resource-availability?resource_id="+
			itoa(int(resourceID))+"&start_date="+startDate+"&end_date="+endDate, nil)

	resp, err := app.Test(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)

	body, _ := io.ReadAll(resp.Body)
	var result ErrorResponse
	err = json.Unmarshal(body, &result)
	require.NoError(t, err)

	assert.Equal(t, "VALIDATION", result.Error)
}

// Helper function to convert int to string
func itoa(i int) string {
	return fmt.Sprintf("%d", i)
}
