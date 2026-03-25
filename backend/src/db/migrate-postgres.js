import DatabaseFactory from './database-factory.js';

const db = DatabaseFactory.createDatabase({
  type: process.env.DB_TYPE || 'postgres',
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

console.log('Running PostgreSQL database migrations...');

// Drop existing tables if they exist (for clean migration)
await db.exec(`
  DROP TABLE IF EXISTS budgets CASCADE;
  DROP TABLE IF EXISTS transactions CASCADE;
  DROP TABLE IF EXISTS categories CASCADE;
  DROP TABLE IF EXISTS accounts CASCADE;
`);

// Create accounts table
await db.exec(`
  CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK(type IN ('bank', 'credit_card')),
    balance NUMERIC(15, 2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'USD',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create categories table
await db.exec(`
  CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK(type IN ('income', 'expense')),
    color VARCHAR(50),
    icon VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create transactions table
await db.exec(`
  CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK(type IN ('income', 'expense')),
    description TEXT,
    account_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    tags TEXT,
    attachment_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
  )
`);

// Create budgets table
await db.exec(`
  CREATE TABLE budgets (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    period VARCHAR(50) NOT NULL CHECK(period IN ('monthly', 'yearly')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
  )
`);

// Create indexes for better query performance
await db.exec(`
  CREATE INDEX idx_transactions_date ON transactions(date);
  CREATE INDEX idx_transactions_account ON transactions(account_id);
  CREATE INDEX idx_transactions_category ON transactions(category_id);
  CREATE INDEX idx_transactions_type ON transactions(type);
  CREATE INDEX idx_budgets_category ON budgets(category_id);
  CREATE INDEX idx_budgets_dates ON budgets(start_date, end_date);
`);

console.log('✅ PostgreSQL migration completed successfully!');
console.log('Tables created: accounts, categories, transactions, budgets');

await db.close();
process.exit(0);
