package api

import (
	"database/sql"

	"github.com/gofiber/fiber/v3"
)

type HealthResponse struct {
	Status   string `json:"status"`
	Database string `json:"database"`
}

func RegisterRoutes(app *fiber.App, db *sql.DB) {
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
}
