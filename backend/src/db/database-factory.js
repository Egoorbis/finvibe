/**
 * Database Factory
 * Creates PostgreSQL database adapter based on environment configuration.
 */
class DatabaseFactory {
  static async createDatabase(config = {}) {
    const dbType = (config.type || process.env.DB_TYPE || 'postgres').toLowerCase();
    if (dbType !== 'postgres' && dbType !== 'postgresql') {
      throw new Error(`Unsupported database type "${dbType}". Only PostgreSQL is supported.`);
    }

    console.log('📊 Using PostgreSQL database');
    const { default: PostgresAdapter } = await import('./postgres.js');
    return new PostgresAdapter(config);
  }
}

export default DatabaseFactory;
