package api

import (
	"database/sql"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/catering-event-manager/scheduling-service/internal/domain"
	"github.com/catering-event-manager/scheduling-service/internal/logger"
	"github.com/catering-event-manager/scheduling-service/internal/scheduler"
)

type HealthResponse struct {
	Status   string `json:"status"`
	Database string `json:"database"`
}

type ErrorResponse struct {
	Error   string `json:"error"`
	Code    string `json:"code,omitempty"`
	Message string `json:"message,omitempty"`
}

func RegisterRoutes(app *fiber.App, db *sql.DB) {
	// Initialize services
	conflictService := scheduler.NewConflictService(db)
	availabilityService := scheduler.NewAvailabilityService(db)

	api := app.Group("/api/v1")

	// Health check endpoint
	api.Get("/health", func(c fiber.Ctx) error {
		dbStatus := "connected"
		if err := db.Ping(); err != nil {
			dbStatus = "disconnected"
		}

		return c.JSON(HealthResponse{
			Status:   "ok",
			Database: dbStatus,
		})
	})

	// Scheduling endpoints
	scheduling := api.Group("/scheduling")

	// POST /api/v1/scheduling/check-conflicts
	scheduling.Post("/check-conflicts", func(c fiber.Ctx) error {
		log := logger.Get()
		startTime := time.Now()

		var req domain.CheckConflictsRequest
		if err := c.Bind().JSON(&req); err != nil {
			log.Warn().Err(err).Msg("Invalid request body for check-conflicts")
			return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
				Error:   "invalid_request",
				Message: "Invalid request body",
			})
		}

		result, err := conflictService.CheckConflicts(c.Context(), req)
		if err != nil {
			if domainErr, ok := err.(*domain.DomainError); ok {
				status := fiber.StatusInternalServerError
				if domainErr.Code == domain.ErrCodeValidation {
					status = fiber.StatusBadRequest
				}
				return c.Status(status).JSON(ErrorResponse{
					Error:   string(domainErr.Code),
					Message: domainErr.Message,
				})
			}
			log.Error().Err(err).Msg("Failed to check conflicts")
			return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
				Error:   "internal_error",
				Message: "Failed to check conflicts",
			})
		}

		duration := time.Since(startTime)
		log.Info().
			Int("resource_count", len(req.ResourceIDs)).
			Int("conflict_count", len(result.Conflicts)).
			Dur("duration_ms", duration).
			Msg("Conflict check completed")

		return c.JSON(result)
	})

	// GET /api/v1/scheduling/resource-availability
	scheduling.Get("/resource-availability", func(c fiber.Ctx) error {
		log := logger.Get()

		// Parse query parameters
		resourceIDStr := c.Query("resource_id")
		startDateStr := c.Query("start_date")
		endDateStr := c.Query("end_date")

		if resourceIDStr == "" || startDateStr == "" || endDateStr == "" {
			return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
				Error:   "missing_parameters",
				Message: "resource_id, start_date, and end_date are required",
			})
		}

		resourceID, err := strconv.ParseInt(resourceIDStr, 10, 32)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
				Error:   "invalid_resource_id",
				Message: "resource_id must be a valid integer",
			})
		}

		startDate, err := time.Parse(time.RFC3339, startDateStr)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
				Error:   "invalid_start_date",
				Message: "start_date must be in RFC3339 format",
			})
		}

		endDate, err := time.Parse(time.RFC3339, endDateStr)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
				Error:   "invalid_end_date",
				Message: "end_date must be in RFC3339 format",
			})
		}

		req := domain.ResourceAvailabilityRequest{
			ResourceID: int32(resourceID),
			StartDate:  startDate,
			EndDate:    endDate,
		}

		result, err := availabilityService.GetResourceAvailability(c.Context(), req)
		if err != nil {
			if domainErr, ok := err.(*domain.DomainError); ok {
				status := fiber.StatusInternalServerError
				switch domainErr.Code {
				case domain.ErrCodeValidation:
					status = fiber.StatusBadRequest
				case domain.ErrCodeNotFound:
					status = fiber.StatusNotFound
				}
				return c.Status(status).JSON(ErrorResponse{
					Error:   string(domainErr.Code),
					Message: domainErr.Message,
				})
			}
			log.Error().Err(err).Int32("resource_id", int32(resourceID)).Msg("Failed to get resource availability")
			return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
				Error:   "internal_error",
				Message: "Failed to get resource availability",
			})
		}

		log.Info().
			Int32("resource_id", int32(resourceID)).
			Int("entry_count", len(result.Entries)).
			Msg("Resource availability retrieved")

		return c.JSON(result)
	})
}
