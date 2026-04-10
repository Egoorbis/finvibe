import DatabaseFactory from './database-factory.js';

/**
 * Main database connection
 * Uses factory pattern to create appropriate database adapter
 * based on environment configuration
 */
const db = await DatabaseFactory.createDatabase({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

export default db;
