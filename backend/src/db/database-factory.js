/**
 * Database Factory
 * Creates appropriate database adapter based on environment.
 * Uses dynamic imports so optional adapters (e.g. better-sqlite3) are only
 * loaded when they are actually needed, keeping production images lean.
 */
class DatabaseFactory {
  static async createDatabase(config = {}) {
    const dbType = config.type || process.env.DB_TYPE || 'sqlite';

    switch (dbType.toLowerCase()) {
      case 'postgres':
      case 'postgresql': {
        console.log('📊 Using PostgreSQL database');
        const { default: PostgresAdapter } = await import('./postgres.js');
        return new PostgresAdapter(config);
      }

      case 'sqlite':
      default: {
        console.log('📊 Using SQLite database');
        const { default: SqliteAdapter } = await import('./sqlite.js');
        return new SqliteAdapter(config);
      }
    }
  }

  /**
   * Create database for testing (always uses in-memory SQLite)
   */
  static async createTestDatabase() {
    const { default: SqliteAdapter } = await import('./sqlite.js');
    return new SqliteAdapter({ memory: true });
  }
}

export default DatabaseFactory;
