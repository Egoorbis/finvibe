import pg from 'pg';
const { Pool } = pg;

/**
 * PostgreSQL Database Adapter
 * Provides async database operations compatible with the application's data layer
 */
class PostgresAdapter {
  constructor(config) {
    this.pool = new Pool({
      host: config.host || process.env.DB_HOST || 'localhost',
      port: config.port || process.env.DB_PORT || 5432,
      database: config.database || process.env.DB_NAME || 'finvibe',
      user: config.user || process.env.DB_USER || 'postgres',
      password: config.password || process.env.DB_PASSWORD,
      max: config.max || 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client', err);
    });
  }

  /**
   * Execute a query with parameters
   * @param {string} text - SQL query with $1, $2, etc. placeholders
   * @param {Array} params - Array of parameter values
   * @returns {Promise<Object>} - Query result
   */
  async query(text, params = []) {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;

      if (process.env.NODE_ENV === 'development') {
        console.log('Executed query', { text, duration, rows: result.rowCount });
      }

      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  /**
   * Get all rows from a query
   * @param {string} text - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Array>} - Array of row objects
   */
  async all(text, params = []) {
    const result = await this.query(text, params);
    return result.rows;
  }

  /**
   * Get a single row from a query
   * @param {string} text - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Object|undefined>} - Single row object or undefined
   */
  async get(text, params = []) {
    const result = await this.query(text, params);
    return result.rows[0];
  }

  /**
   * Execute a query that modifies data (INSERT, UPDATE, DELETE)
   * @param {string} text - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Object>} - Result with rowCount and rows (for RETURNING clause)
   */
  async run(text, params = []) {
    const result = await this.query(text, params);
    return {
      changes: result.rowCount,
      lastInsertRowid: result.rows[0]?.id, // For RETURNING id clause
      rows: result.rows
    };
  }

  /**
   * Execute multiple SQL statements (for migrations)
   * @param {string} sql - SQL statements separated by semicolons
   */
  async exec(sql) {
    try {
      await this.pool.query(sql);
    } catch (error) {
      console.error('Database exec error:', error);
      throw error;
    }
  }

  /**
   * Start a transaction
   */
  async begin() {
    return await this.query('BEGIN');
  }

  /**
   * Commit a transaction
   */
  async commit() {
    return await this.query('COMMIT');
  }

  /**
   * Rollback a transaction
   */
  async rollback() {
    return await this.query('ROLLBACK');
  }

  /**
   * Execute a function within a transaction
   * @param {Function} callback - Async function to execute in transaction
   */
  async transaction(callback) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Close all connections in the pool
   */
  async close() {
    await this.pool.end();
  }

  /**
   * Pragma-like method for compatibility (no-op for PostgreSQL)
   */
  pragma() {
    // PostgreSQL doesn't use pragma, this is for API compatibility
    return;
  }
}

export default PostgresAdapter;
