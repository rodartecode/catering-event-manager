// Package testutil provides test utilities including testcontainers for integration tests.
package testutil

import (
	"context"
	"database/sql"
	"fmt"
	"testing"
	"time"

	_ "github.com/lib/pq"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
)

// TestDB wraps the database connection and container for test cleanup
type TestDB struct {
	DB        *sql.DB
	Container testcontainers.Container
}

// SetupTestDB creates a PostgreSQL testcontainer and initializes the schema.
// Returns a TestDB that must be cleaned up with TeardownTestDB.
func SetupTestDB(t *testing.T) *TestDB {
	t.Helper()
	ctx := context.Background()

	// Start PostgreSQL container
	container, err := postgres.Run(ctx,
		"postgres:17-alpine",
		postgres.WithDatabase("test_db"),
		postgres.WithUsername("test_user"),
		postgres.WithPassword("test_password"),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").
				WithOccurrence(2).
				WithStartupTimeout(60*time.Second),
		),
	)
	if err != nil {
		t.Fatalf("failed to start postgres container: %v", err)
	}

	// Get connection string
	connStr, err := container.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		container.Terminate(ctx)
		t.Fatalf("failed to get connection string: %v", err)
	}

	// Connect to database
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		container.Terminate(ctx)
		t.Fatalf("failed to connect to database: %v", err)
	}

	// Verify connection
	if err := db.Ping(); err != nil {
		db.Close()
		container.Terminate(ctx)
		t.Fatalf("failed to ping database: %v", err)
	}

	// Initialize schema
	if err := initSchema(db); err != nil {
		db.Close()
		container.Terminate(ctx)
		t.Fatalf("failed to initialize schema: %v", err)
	}

	return &TestDB{
		DB:        db,
		Container: container,
	}
}

// TeardownTestDB cleans up the test database and container.
func TeardownTestDB(t *testing.T, testDB *TestDB) {
	t.Helper()
	ctx := context.Background()

	if testDB.DB != nil {
		testDB.DB.Close()
	}
	if testDB.Container != nil {
		if err := testDB.Container.Terminate(ctx); err != nil {
			t.Logf("failed to terminate container: %v", err)
		}
	}
}

// CleanupTables truncates all tables for test isolation.
func CleanupTables(t *testing.T, db *sql.DB) {
	t.Helper()

	// Truncate in reverse dependency order
	tables := []string{
		"resource_schedule",
		"task_resources",
		"tasks",
		"events",
		"resources",
		"clients",
		"users",
	}

	for _, table := range tables {
		_, err := db.Exec(fmt.Sprintf("TRUNCATE TABLE %s CASCADE", table))
		if err != nil {
			t.Fatalf("failed to truncate table %s: %v", table, err)
		}
	}
}

// initSchema creates all tables and enums needed for testing.
func initSchema(db *sql.DB) error {
	schema := `
	-- Enums
	CREATE TYPE user_role AS ENUM ('administrator', 'manager');
	CREATE TYPE event_status AS ENUM ('inquiry', 'planning', 'preparation', 'in_progress', 'completed', 'follow_up');
	CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed');
	CREATE TYPE task_category AS ENUM ('pre_event', 'during_event', 'post_event');
	CREATE TYPE resource_type AS ENUM ('staff', 'equipment', 'materials');

	-- Users table
	CREATE TABLE users (
		id SERIAL PRIMARY KEY,
		email VARCHAR(255) NOT NULL UNIQUE,
		password_hash VARCHAR(255) NOT NULL,
		name VARCHAR(255) NOT NULL,
		role user_role NOT NULL DEFAULT 'manager',
		is_active BOOLEAN NOT NULL DEFAULT true,
		created_at TIMESTAMP NOT NULL DEFAULT NOW(),
		updated_at TIMESTAMP NOT NULL DEFAULT NOW()
	);

	-- Clients table
	CREATE TABLE clients (
		id SERIAL PRIMARY KEY,
		company_name VARCHAR(255) NOT NULL,
		contact_name VARCHAR(255) NOT NULL,
		email VARCHAR(255) NOT NULL,
		phone VARCHAR(50),
		address TEXT,
		notes TEXT,
		created_at TIMESTAMP NOT NULL DEFAULT NOW(),
		updated_at TIMESTAMP NOT NULL DEFAULT NOW()
	);

	-- Resources table
	CREATE TABLE resources (
		id SERIAL PRIMARY KEY,
		name VARCHAR(255) NOT NULL,
		type resource_type NOT NULL,
		hourly_rate NUMERIC(10, 2),
		is_available BOOLEAN NOT NULL DEFAULT true,
		notes TEXT,
		created_at TIMESTAMP NOT NULL DEFAULT NOW(),
		updated_at TIMESTAMP NOT NULL DEFAULT NOW()
	);
	CREATE INDEX idx_resources_type ON resources(type);
	CREATE INDEX idx_resources_available ON resources(is_available);
	CREATE INDEX idx_resources_name ON resources(name);

	-- Events table
	CREATE TABLE events (
		id SERIAL PRIMARY KEY,
		client_id INTEGER NOT NULL REFERENCES clients(id),
		event_name VARCHAR(255) NOT NULL,
		event_date TIMESTAMP NOT NULL,
		location VARCHAR(500),
		status event_status NOT NULL DEFAULT 'inquiry',
		estimated_attendees INTEGER,
		notes TEXT,
		is_archived BOOLEAN NOT NULL DEFAULT false,
		archived_at TIMESTAMP,
		archived_by INTEGER REFERENCES users(id),
		created_by INTEGER NOT NULL REFERENCES users(id),
		created_at TIMESTAMP NOT NULL DEFAULT NOW(),
		updated_at TIMESTAMP NOT NULL DEFAULT NOW()
	);
	CREATE INDEX idx_events_client_id ON events(client_id);
	CREATE INDEX idx_events_date ON events(event_date);
	CREATE INDEX idx_events_status ON events(status);

	-- Tasks table
	CREATE TABLE tasks (
		id SERIAL PRIMARY KEY,
		event_id INTEGER NOT NULL REFERENCES events(id),
		title VARCHAR(255) NOT NULL,
		description TEXT,
		category task_category NOT NULL,
		status task_status NOT NULL DEFAULT 'pending',
		assigned_to INTEGER REFERENCES users(id),
		due_date TIMESTAMP,
		depends_on_task_id INTEGER,
		is_overdue BOOLEAN NOT NULL DEFAULT false,
		completed_at TIMESTAMP,
		created_at TIMESTAMP NOT NULL DEFAULT NOW(),
		updated_at TIMESTAMP NOT NULL DEFAULT NOW()
	);
	CREATE INDEX idx_tasks_event_id ON tasks(event_id);
	CREATE INDEX idx_tasks_status ON tasks(status);

	-- Resource schedule table
	CREATE TABLE resource_schedule (
		id SERIAL PRIMARY KEY,
		resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
		event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
		task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
		start_time TIMESTAMPTZ NOT NULL,
		end_time TIMESTAMPTZ NOT NULL,
		notes TEXT,
		created_at TIMESTAMP NOT NULL DEFAULT NOW(),
		updated_at TIMESTAMP NOT NULL DEFAULT NOW()
	);
	CREATE INDEX idx_resource_schedule_resource_id ON resource_schedule(resource_id);
	CREATE INDEX idx_resource_schedule_event_id ON resource_schedule(event_id);
	CREATE INDEX idx_resource_schedule_task_id ON resource_schedule(task_id);
	CREATE INDEX idx_resource_schedule_start_time ON resource_schedule(start_time);
	CREATE INDEX idx_resource_schedule_end_time ON resource_schedule(end_time);

	-- Task resources junction table (for completeness)
	CREATE TABLE task_resources (
		id SERIAL PRIMARY KEY,
		task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
		resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
		assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
		UNIQUE(task_id, resource_id)
	);
	`

	_, err := db.Exec(schema)
	return err
}
