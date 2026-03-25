import PostgresAdapter from './postgres.js';
import SqliteAdapter from './sqlite.js';

/**
 * Database Factory
 * Creates appropriate database adapter based on environment
 */
class DatabaseFactory {
  static createDatabase(config = {}) {
    const dbType = config.type || process.env.DB_TYPE || 'sqlite';

    switch (dbType.toLowerCase()) {
      case 'postgres':
      case 'postgresql':
        console.log('📊 Using PostgreSQL database');
        return new PostgresAdapter(config);

      case 'sqlite':
      default:
        console.log('📊 Using SQLite database');
        return new SqliteAdapter(config);
    }
  }

  /**
   * Create database for testing (always uses in-memory SQLite)
   */
  static createTestDatabase() {
    return new SqliteAdapter({ memory: true });
  }
}

export default DatabaseFactory;
