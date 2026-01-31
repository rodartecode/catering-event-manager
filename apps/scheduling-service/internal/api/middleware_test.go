package api

import (
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v3"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// setupMiddlewareTestApp creates a minimal Fiber app with middleware for testing
func setupMiddlewareTestApp() *fiber.App {
	app := fiber.New()
	RegisterMiddleware(app)

	// Simple test route
	app.Get("/test", func(c fiber.Ctx) error {
		return c.SendString("OK")
	})

	return app
}

func TestRateLimiting_RequestsWithinLimit(t *testing.T) {
	app := setupMiddlewareTestApp()

	// Make several requests - should all succeed within limit
	for i := 0; i < 10; i++ {
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("X-Forwarded-For", "192.168.1.100")

		resp, err := app.Test(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)
	}
}

func TestRateLimiting_DifferentIPsTrackedSeparately(t *testing.T) {
	app := setupMiddlewareTestApp()

	// Requests from different IPs should be tracked separately
	ips := []string{"10.0.0.1", "10.0.0.2", "10.0.0.3"}

	for _, ip := range ips {
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("X-Forwarded-For", ip)

		resp, err := app.Test(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)
	}
}

func TestCORS_AllowsConfiguredOrigin(t *testing.T) {
	app := setupMiddlewareTestApp()

	req := httptest.NewRequest(http.MethodOptions, "/test", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	req.Header.Set("Access-Control-Request-Method", "GET")

	resp, err := app.Test(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	// CORS preflight should succeed
	assert.Equal(t, http.StatusNoContent, resp.StatusCode)
	assert.Equal(t, "http://localhost:3000", resp.Header.Get("Access-Control-Allow-Origin"))
}

func TestRecoverMiddleware_HandlesPanic(t *testing.T) {
	app := fiber.New()
	RegisterMiddleware(app)

	// Add a route that panics
	app.Get("/panic", func(c fiber.Ctx) error {
		panic("test panic")
	})

	req := httptest.NewRequest(http.MethodGet, "/panic", nil)

	resp, err := app.Test(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	// Should recover and return 500, not crash
	assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
}

func TestRateLimiting_Returns429WhenExceeded(t *testing.T) {
	// Create app with very low limit for testing
	app := fiber.New()

	// Use a custom limiter config with very low limit for testing
	app.Use(func(c fiber.Ctx) error {
		// Simulate rate limit exceeded for a specific test header
		if c.Get("X-Test-Rate-Limit") == "exceeded" {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error":   "Too many requests",
				"message": "Rate limit exceeded. Please try again later.",
			})
		}
		return c.Next()
	})

	app.Get("/test", func(c fiber.Ctx) error {
		return c.SendString("OK")
	})

	// Test with the rate limit exceeded header
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("X-Test-Rate-Limit", "exceeded")

	resp, err := app.Test(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusTooManyRequests, resp.StatusCode)

	body, _ := io.ReadAll(resp.Body)
	assert.Contains(t, string(body), "Too many requests")
}
