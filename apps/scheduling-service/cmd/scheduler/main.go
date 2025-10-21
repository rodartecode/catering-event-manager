package main

import (
	"log"
	"os"
	"path/filepath"

	"github.com/gofiber/fiber/v3"
	"github.com/joho/godotenv"
	"github.com/catering-event-manager/scheduling-service/internal/api"
	"github.com/catering-event-manager/scheduling-service/internal/repository"
)

func main() {
	// Load .env file from repository root
	envPath := filepath.Join("..", "..", ".env")
	if err := godotenv.Load(envPath); err != nil {
		log.Printf("Warning: .env file not found at %s (this is ok in production)", envPath)
	}

	// Also try loading local .env in scheduling-service directory
	_ = godotenv.Load(".env")

	// Load environment variables
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Initialize database connection
	db, err := repository.NewDB()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Create Fiber app
	app := fiber.New(fiber.Config{
		AppName: "Catering Scheduler Service v1.0",
	})

	// Register middleware
	api.RegisterMiddleware(app)

	// Register routes
	api.RegisterRoutes(app, db)

	// Start server
	log.Printf("Starting scheduler service on port %s", port)
	if err := app.Listen(":" + port); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
