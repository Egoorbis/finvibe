import db from './database.js';

async function runMigrations() {
  console.log('Running database migrations...');

  const isPostgres = typeof db.pool !== 'undefined';
  const idColumn = isPostgres ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
  const timestampType = isPostgres ? 'TIMESTAMP' : 'DATETIME';

  try {
    // Create users table (must be first as other tables reference it)
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id ${idColumn},
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        created_at ${timestampType} DEFAULT CURRENT_TIMESTAMP,
        updated_at ${timestampType} DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create accounts table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS accounts (
        id ${idColumn},
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('bank', 'credit_card')),
        balance REAL DEFAULT 0,
        currency TEXT DEFAULT 'USD',
        created_at ${timestampType} DEFAULT CURRENT_TIMESTAMP,
        updated_at ${timestampType} DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create categories table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id ${idColumn},
        user_id INTEGER,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
        color TEXT,
        icon TEXT,
        is_default INTEGER DEFAULT 0,
        created_at ${timestampType} DEFAULT CURRENT_TIMESTAMP,
        updated_at ${timestampType} DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create transactions table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        id ${idColumn},
        user_id INTEGER NOT NULL,
        date DATE NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
        description TEXT,
        account_id INTEGER NOT NULL,
        category_id INTEGER NOT NULL,
        tags TEXT,
        attachment_path TEXT,
        created_at ${timestampType} DEFAULT CURRENT_TIMESTAMP,
        updated_at ${timestampType} DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
      )
    `);

    // Create budgets table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS budgets (
        id ${idColumn},
        user_id INTEGER NOT NULL,
        category_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        period TEXT NOT NULL CHECK(period IN ('monthly', 'yearly')),
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        created_at ${timestampType} DEFAULT CURRENT_TIMESTAMP,
        updated_at ${timestampType} DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for better query performance
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
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
