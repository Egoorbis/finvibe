import DatabaseFactory from '../../src/db/database-factory.js';

// Create test database
export function setupTestDatabase() {
  // Use in-memory SQLite database for tests
  const db = DatabaseFactory.createTestDatabase();

  // Create schema (synchronous for setup)
  db.db.exec(`
    CREATE TABLE accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('bank', 'credit_card')),
      balance REAL NOT NULL DEFAULT 0,
      currency TEXT DEFAULT 'USD',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      color TEXT,
      icon TEXT,
      is_default INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      account_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      amount REAL NOT NULL,
      date DATE NOT NULL,
      description TEXT,
      tags TEXT,
      attachment_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
    );

    CREATE TABLE budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      category_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      period TEXT NOT NULL CHECK(period IN ('monthly', 'yearly')),
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );
  `);

  return db;
}

export async function teardownTestDatabase(db) {
  if (db) {
    await db.close();
  }
}

export function clearTestData(db) {
  // Clear all tables synchronously for tests
  db.db.exec('DELETE FROM transactions');
  db.db.exec('DELETE FROM budgets');
  db.db.exec('DELETE FROM accounts');
  db.db.exec('DELETE FROM categories');
}

export function seedTestData(db) {
  // Seed accounts (using direct db access for sync operation)
  const account = db.db.prepare(`
    INSERT INTO accounts (name, type, balance, currency)
    VALUES (?, ?, ?, ?)
  `).run('Test Bank', 'bank', 1000.00, 'USD');

  // Seed categories
  const expenseCategory = db.db.prepare(`
    INSERT INTO categories (name, type, color, icon)
    VALUES (?, ?, ?, ?)
  `).run('Food', 'expense', '#FF6B6B', '🍽️');

  const incomeCategory = db.db.prepare(`
    INSERT INTO categories (name, type, color, icon)
    VALUES (?, ?, ?, ?)
  `).run('Salary', 'income', '#26DE81', '💰');

  return {
    accountId: account.lastInsertRowid,
    expenseCategoryId: expenseCategory.lastInsertRowid,
    incomeCategoryId: incomeCategory.lastInsertRowid
  };
}
