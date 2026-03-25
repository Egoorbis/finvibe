import DatabaseFactory from './database-factory.js';

/**
 * Main database connection
 * Uses factory pattern to create appropriate database adapter
 * based on environment configuration
 */
const db = DatabaseFactory.createDatabase({
  type: process.env.DB_TYPE, // 'sqlite' or 'postgres'
  // PostgreSQL config (if DB_TYPE=postgres)
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

export default db;
