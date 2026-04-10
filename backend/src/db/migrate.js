import DatabaseFactory from './database-factory.js';

const db = await DatabaseFactory.createDatabase({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function runMigrations() {
  console.log('Running PostgreSQL database migrations...');

  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        email_verified BOOLEAN DEFAULT FALSE,
        verification_token VARCHAR(255),
        verification_token_expires TIMESTAMP,
        reset_token VARCHAR(255),
        reset_token_expires TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS accounts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL CHECK(type IN ('bank', 'credit_card')),
        balance NUMERIC(15, 2) DEFAULT 0,
        currency VARCHAR(10) DEFAULT 'USD',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL CHECK(type IN ('income', 'expense')),
        color VARCHAR(50),
        icon VARCHAR(50),
        is_default INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        amount NUMERIC(15, 2) NOT NULL,
        type VARCHAR(50) NOT NULL CHECK(type IN ('income', 'expense')),
        description TEXT,
        account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
        tags TEXT,
        attachment_path TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS budgets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        amount NUMERIC(15, 2) NOT NULL,
        period VARCHAR(50) NOT NULL CHECK(period IN ('monthly', 'yearly')),
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);
      CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);
      CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);
      CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
      CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
      CREATE INDEX IF NOT EXISTS idx_budgets_user ON budgets(user_id);
      CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category_id);
      CREATE INDEX IF NOT EXISTS idx_budgets_dates ON budgets(start_date, end_date);
    `);

    console.log('✅ Database migration completed successfully!');
    console.log('Tables created: users, accounts, categories, transactions, budgets');
  } finally {
    await db.close();
  }
}

runMigrations().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
