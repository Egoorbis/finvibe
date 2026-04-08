import { newDb } from 'pg-mem';
import PostgresAdapter from '../../src/db/postgres.js';

export const TEST_USER = {
  id: 1,
  username: 'testuser',
  email: 'testuser@example.com',
  password: 'hashed-password'
};

// Create PostgreSQL-compatible in-memory database for tests
export async function setupTestDatabase() {
  const pg = newDb({ autoCreateForeignKeyIndices: true });
  const { Pool } = pg.adapters.createPg();

  process.env.NODE_ENV = process.env.NODE_ENV || 'test';
  process.env.TEST_USER_ID = String(TEST_USER.id);
  process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || 'test-resend-key';

  const db = new PostgresAdapter({
    PoolClass: Pool
  });

  await db.exec(`
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) NOT NULL UNIQUE,
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

    CREATE TABLE accounts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(50) NOT NULL CHECK(type IN ('bank', 'credit_card')),
      balance NUMERIC(15, 2) DEFAULT 0,
      currency VARCHAR(10) DEFAULT 'USD',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE categories (
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

    CREATE TABLE transactions (
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

    CREATE TABLE budgets (
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
  `);

  await db.run(
    `INSERT INTO users (username, email, password, email_verified)
     VALUES ($1, $2, $3, $4)`,
    [TEST_USER.username, TEST_USER.email, TEST_USER.password, true]
  );

  return db;
}

export async function teardownTestDatabase(db) {
  if (db) {
    await db.close();
  }
}

export async function clearTestData(db) {
  await db.exec('TRUNCATE TABLE transactions RESTART IDENTITY CASCADE');
  await db.exec('TRUNCATE TABLE budgets RESTART IDENTITY CASCADE');
  await db.exec('TRUNCATE TABLE accounts RESTART IDENTITY CASCADE');
  await db.exec('TRUNCATE TABLE categories RESTART IDENTITY CASCADE');
  await db.exec('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
  await db.run(
    `INSERT INTO users (username, email, password, email_verified)
     VALUES ($1, $2, $3, $4)`,
    [TEST_USER.username, TEST_USER.email, TEST_USER.password, true]
  );
}

export async function seedTestData(db, userId = TEST_USER.id) {
  const account = await db.run(
    `INSERT INTO accounts (user_id, name, type, balance, currency)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [userId, 'Test Bank', 'bank', 1000.00, 'USD']
  );

  const expenseCategory = await db.run(
    `INSERT INTO categories (user_id, name, type, color, icon)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [userId, 'Food', 'expense', '#FF6B6B', '🍽️']
  );

  const incomeCategory = await db.run(
    `INSERT INTO categories (user_id, name, type, color, icon)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [userId, 'Salary', 'income', '#26DE81', '💰']
  );

  return {
    accountId: account.rows[0]?.id,
    expenseCategoryId: expenseCategory.rows[0]?.id,
    incomeCategoryId: incomeCategory.rows[0]?.id
  };
}
