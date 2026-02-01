package repository

import (
	"database/sql"
	"fmt"
	"os"
	"time"

	_ "github.com/lib/pq"
)

func NewDB() (*sql.DB, error) {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		return nil, fmt.Errorf("DATABASE_URL environment variable not set")
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Configure connection pool
	// Total pool budget: 200 connections across all services
	// TypeScript (CRUD): 150 connections (75%) - handles majority of read/write operations
	// Go (Scheduling): 50 connections (25%) - handles conflict detection queries
	db.SetMaxOpenConns(50)           // 25% of 200 total for scheduling
	db.SetMaxIdleConns(10)           // Keep 10 idle for quick reuse
	db.SetConnMaxLifetime(30 * time.Minute) // Recycle connections
	db.SetConnMaxIdleTime(5 * time.Minute)  // Close idle connections

	// Test connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return db, nil
}
