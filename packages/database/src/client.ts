import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Check if we're in a build environment (no DATABASE_URL required during next build)
// This allows Next.js to collect page data without a database connection
const isBuildTime = !process.env.DATABASE_URL;

// Create a mock database client for build time that will throw on actual usage
function createBuildTimeDb() {
  // Return a minimal mock that passes drizzle-orm's `is()` check
  // but throws when actually used for queries
  const mockClient = postgres('postgres://build:build@localhost:5432/build', {
    max: 0, // No actual connections
    connect_timeout: 0,
  });

  const mockDb = drizzle(mockClient, { schema });

  // Wrap the db to throw helpful errors if somehow used at build time
  return new Proxy(mockDb, {
    get(target, prop) {
      const value = target[prop as keyof typeof target];
      if (typeof value === 'function' && prop !== 'constructor') {
        return () => {
          throw new Error(
            `DATABASE_URL environment variable is not set. ` +
              `Database operations are not available during build time.`
          );
        };
      }
      return value;
    },
  });
}

function createRuntimeDb() {
  const rawConnectionString = process.env.DATABASE_URL;

  if (!rawConnectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  // Trim whitespace/newlines that may have been accidentally added in env config
  const connectionString = rawConnectionString.trim();

  // Connection pool configuration
  // Total pool budget: 200 connections across all services
  // TypeScript (CRUD): 150 connections (75%) - handles majority of read/write operations
  // Go (Scheduling): 50 connections (25%) - handles conflict detection queries
  const client = postgres(connectionString, {
    max: 150, // 75% of 200 total for CRUD operations
    idle_timeout: 30, // Close idle connections after 30 seconds
    connect_timeout: 10, // Connection timeout
    max_lifetime: 60 * 30, // Max connection lifetime: 30 minutes
  });

  return drizzle(client, { schema });
}

// Export a real drizzle instance that passes type checks (including DrizzleAdapter's `is()` check)
// At build time, creates a non-functional mock; at runtime, creates the real connection
export const db = isBuildTime ? createBuildTimeDb() : createRuntimeDb();
