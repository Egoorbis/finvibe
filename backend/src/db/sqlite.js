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
   * Convert PostgreSQL-style placeholders ($1, $2) to SQLite-style (?)
   */
  convertPlaceholders(text) {
    let index = 1;
    return text.replace(/\$\d+/g, () => '?');
  }

  /**
   * Execute a query and return all rows
   * Async wrapper for better-sqlite3's synchronous methods
   */
  async all(text, params = []) {
    const sqliteQuery = this.convertPlaceholders(text);
    return Promise.resolve(this.db.prepare(sqliteQuery).all(...params));
  }

  /**
   * Execute a query and return single row
   */
  async get(text, params = []) {
    const sqliteQuery = this.convertPlaceholders(text);
    return Promise.resolve(this.db.prepare(sqliteQuery).get(...params));
  }

  /**
   * Execute a query that modifies data
   */
  async run(text, params = []) {
    const sqliteQuery = this.convertPlaceholders(text);
    const result = this.db.prepare(sqliteQuery).run(...params);
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
