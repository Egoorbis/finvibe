import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create test database
export function setupTestDatabase() {
  const testDbPath = join(__dirname, '../../test.db');

  // Remove existing test database
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  const db = new Database(testDbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Create schema
  db.exec(`
    CREATE TABLE accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('bank', 'credit_card')),
      balance REAL NOT NULL DEFAULT 0,
      currency TEXT DEFAULT 'USD',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      color TEXT,
      icon TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      amount REAL NOT NULL,
      date DATE NOT NULL,
      description TEXT,
      tags TEXT,
      attachment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
    );

    CREATE TABLE budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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

export function teardownTestDatabase(db) {
  if (db) {
    db.close();
  }

  const testDbPath = join(__dirname, '../../test.db');
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
}

export function seedTestData(db) {
  // Seed accounts
  const account = db.prepare(`
    INSERT INTO accounts (name, type, balance, currency)
    VALUES (?, ?, ?, ?)
  `).run('Test Bank', 'bank', 1000.00, 'USD');

  // Seed categories
  const expenseCategory = db.prepare(`
    INSERT INTO categories (name, type, color, icon)
    VALUES (?, ?, ?, ?)
  `).run('Food', 'expense', '#FF6B6B', '🍽️');

  const incomeCategory = db.prepare(`
    INSERT INTO categories (name, type, color, icon)
    VALUES (?, ?, ?, ?)
  `).run('Salary', 'income', '#26DE81', '💰');

  return {
    accountId: account.lastInsertRowid,
    expenseCategoryId: expenseCategory.lastInsertRowid,
    incomeCategoryId: incomeCategory.lastInsertRowid
  };
}
