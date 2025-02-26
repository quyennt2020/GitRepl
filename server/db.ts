import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon database with WebSocket support
neonConfig.webSocketConstructor = ws;

// Database connection state
let pool: Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

// Initialize database connection lazily
export const initializeDatabase = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }

  try {
    console.log("Initializing database connection...");
    pool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      max: 20, // Limit connection pool size
      idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
      connectionTimeoutMillis: 5000, // Connection timeout after 5 seconds
    });

    db = drizzle({ client: pool, schema });
    console.log("Database connection initialized successfully");
    return { pool, db };
  } catch (error) {
    console.error("Failed to initialize database connection:", error);
    throw error;
  }
};

// Get or initialize the database connection
export const getDb = () => {
  if (!db) {
    const result = initializeDatabase();
    return result.db;
  }
  return db;
};

// Get or initialize the connection pool
export const getPool = () => {
  if (!pool) {
    const result = initializeDatabase();
    return result.pool;
  }
  return pool;
};

// Lazily initialize DB on first import
export { getDb as db, getPool as pool };