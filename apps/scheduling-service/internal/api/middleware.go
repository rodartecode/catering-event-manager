package api

import (
	"log"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/gofiber/fiber/v3/middleware/limiter"
	"github.com/gofiber/fiber/v3/middleware/logger"
	"github.com/gofiber/fiber/v3/middleware/recover"
)

func RegisterMiddleware(app *fiber.App) {
	// Recover from panics
	app.Use(recover.New())

	// Request logging
	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} - ${method} ${path} (${latency})\n",
	}))

	// Rate limiting - 200 requests per minute per IP
	// Protects against DoS and resource exhaustion (SEC-003)
	app.Use(limiter.New(limiter.Config{
		Max:        200,
		Expiration: 1 * time.Minute,
		KeyGenerator: func(c fiber.Ctx) string {
			// Use X-Forwarded-For if behind proxy, otherwise use IP
			if xff := c.Get("X-Forwarded-For"); xff != "" {
				return xff
			}
			return c.IP()
		},
		LimitReached: func(c fiber.Ctx) error {
			log.Printf("Rate limit exceeded for IP: %s", c.IP())
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error":   "Too many requests",
				"message": "Rate limit exceeded. Please try again later.",
			})
		},
		SkipFailedRequests:     false,
		SkipSuccessfulRequests: false,
	}))

	// CORS configuration - read allowed origins from environment
	allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
	if allowedOrigins == "" {
		allowedOrigins = "http://localhost:3000"
	}
	app.Use(cors.New(cors.Config{
		AllowOrigins: strings.Split(allowedOrigins, ","),
		AllowMethods: []string{"GET", "POST", "PUT", "DELETE"},
		AllowHeaders: []string{"Content-Type", "Authorization"},
	}))
}
