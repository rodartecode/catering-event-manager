import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

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

export const db = drizzle(client, { schema });
