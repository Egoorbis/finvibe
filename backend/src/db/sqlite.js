import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * SQLite Database Adapter
 * Wraps better-sqlite3 to provide async-compatible interface
 */
class SqliteAdapter {
  constructor(config = {}) {
    const dbPath = config.path || join(__dirname, '../../database.db');
    this.db = new Database(dbPath);
    this.db.pragma('foreign_keys = ON');

    if (config.memory) {
      // For in-memory databases (testing)
      this.db = new Database(':memory:');
      this.db.pragma('foreign_keys = ON');
    }
  }

  /**
   * Execute a query and return all rows
   * Async wrapper for better-sqlite3's synchronous methods
   */
  async all(text, params = []) {
    return Promise.resolve(this.db.prepare(text).all(...params));
  }

  /**
   * Execute a query and return single row
   */
  async get(text, params = []) {
    return Promise.resolve(this.db.prepare(text).get(...params));
  }

  /**
   * Execute a query that modifies data
   */
  async run(text, params = []) {
    const result = this.db.prepare(text).run(...params);
    return Promise.resolve({
      changes: result.changes,
      lastInsertRowid: result.lastInsertRowid,
      rows: []
    });
  }

  /**
   * Execute raw SQL (for migrations)
   */
  async exec(sql) {
    return Promise.resolve(this.db.exec(sql));
  }

  /**
   * Close database connection
   */
  async close() {
    return Promise.resolve(this.db.close());
  }

  /**
   * SQLite pragma
   */
  pragma(statement) {
    return this.db.pragma(statement);
  }

  /**
   * Transaction support
   */
  async transaction(callback) {
    const transaction = this.db.transaction(callback);
    return Promise.resolve(transaction());
  }

  /**
   * Begin transaction
   */
  async begin() {
    return Promise.resolve(this.db.prepare('BEGIN').run());
  }

  /**
   * Commit transaction
   */
  async commit() {
    return Promise.resolve(this.db.prepare('COMMIT').run());
  }

  /**
   * Rollback transaction
   */
  async rollback() {
    return Promise.resolve(this.db.prepare('ROLLBACK').run());
  }
}

export default SqliteAdapter;
