import { jest } from '@jest/globals';
import { setupTestDatabase, teardownTestDatabase, seedTestData } from '../utils/testDb.js';

let testDb;
let Budget;
let Category;

beforeAll(async () => {
  testDb = setupTestDatabase();

  jest.unstable_mockModule('../../src/db/database.js', () => ({
    default: testDb
  }));

  const budgetModule = await import('../../src/models/Budget.js');
  const categoryModule = await import('../../src/models/Category.js');
  Budget = budgetModule.Budget;
  Category = categoryModule.Category;
});

afterAll(() => {
  teardownTestDatabase(testDb);
});

beforeEach(() => {
  testDb.exec('DELETE FROM transactions');
  testDb.exec('DELETE FROM budgets');
  testDb.exec('DELETE FROM accounts');
  testDb.exec('DELETE FROM categories');
});

describe('Budget Model', () => {
  let expenseCategoryId;

  beforeEach(() => {
    const category = Category.create({
      name: 'Food',
      type: 'expense',
      color: '#FF6B6B',
      icon: '🍽️'
    });
    expenseCategoryId = category.id;
  });

  describe('create', () => {
    it('should create a monthly budget', () => {
      const budgetData = {
        category_id: expenseCategoryId,
        amount: 500,
        period: 'monthly',
        start_date: '2026-01-01',
        end_date: '2026-01-31'
      };

      const budget = Budget.create(budgetData);

      expect(budget).toBeDefined();
      expect(budget.id).toBeDefined();
      expect(budget.category_id).toBe(expenseCategoryId);
      expect(budget.amount).toBe(500);
      expect(budget.period).toBe('monthly');
      expect(budget.start_date).toBe('2026-01-01');
      expect(budget.end_date).toBe('2026-01-31');
      expect(budget.category_name).toBe('Food');
      expect(budget.category_icon).toBe('🍽️');
    });

    it('should create a yearly budget', () => {
      const budget = Budget.create({
        category_id: expenseCategoryId,
        amount: 6000,
        period: 'yearly',
        start_date: '2026-01-01',
        end_date: '2026-12-31'
      });

      expect(budget.period).toBe('yearly');
      expect(budget.amount).toBe(6000);
    });

    it('should include category information', () => {
      const budget = Budget.create({
        category_id: expenseCategoryId,
        amount: 300,
        period: 'monthly',
        start_date: '2026-03-01',
        end_date: '2026-03-31'
      });

      expect(budget.category_name).toBe('Food');
      expect(budget.category_color).toBe('#FF6B6B');
      expect(budget.category_icon).toBe('🍽️');
    });
  });

  describe('getAll', () => {
    it('should return empty array when no budgets exist', () => {
      const budgets = Budget.getAll();
      expect(budgets).toEqual([]);
    });

    it('should return all budgets', () => {
      Budget.create({
        category_id: expenseCategoryId,
        amount: 500,
        period: 'monthly',
        start_date: '2026-01-01',
        end_date: '2026-01-31'
      });

      Budget.create({
        category_id: expenseCategoryId,
        amount: 600,
        period: 'monthly',
        start_date: '2026-02-01',
        end_date: '2026-02-28'
      });

      const budgets = Budget.getAll();
      expect(budgets).toHaveLength(2);
    });

    it('should return budgets ordered by start_date DESC', () => {
      const budget1 = Budget.create({
        category_id: expenseCategoryId,
        amount: 500,
        period: 'monthly',
        start_date: '2026-01-01',
        end_date: '2026-01-31'
      });

      const budget2 = Budget.create({
        category_id: expenseCategoryId,
        amount: 600,
        period: 'monthly',
        start_date: '2026-03-01',
        end_date: '2026-03-31'
      });

      const budgets = Budget.getAll();
      expect(budgets[0].id).toBe(budget2.id); // Most recent first
      expect(budgets[1].id).toBe(budget1.id);
    });
  });

  describe('getById', () => {
    it('should return budget by id with category info', () => {
      const created = Budget.create({
        category_id: expenseCategoryId,
        amount: 750,
        period: 'monthly',
        start_date: '2026-03-01',
        end_date: '2026-03-31'
      });

      const budget = Budget.getById(created.id);

      expect(budget).toBeDefined();
      expect(budget.id).toBe(created.id);
      expect(budget.amount).toBe(750);
      expect(budget.category_name).toBe('Food');
    });

    it('should return undefined for non-existent id', () => {
      const budget = Budget.getById(999);
      expect(budget).toBeUndefined();
    });
  });

  describe('getActive', () => {
    beforeEach(() => {
      // Create budgets for different periods
      Budget.create({
        category_id: expenseCategoryId,
        amount: 500,
        period: 'monthly',
        start_date: '2026-01-01',
        end_date: '2026-01-31'
      });

      Budget.create({
        category_id: expenseCategoryId,
        amount: 600,
        period: 'monthly',
        start_date: '2026-02-01',
        end_date: '2026-02-28'
      });

      Budget.create({
        category_id: expenseCategoryId,
        amount: 700,
        period: 'monthly',
        start_date: '2026-03-01',
        end_date: '2026-03-31'
      });
    });

    it('should return budgets active on specific date', () => {
      const activeBudgets = Budget.getActive('2026-02-15');

      expect(activeBudgets).toHaveLength(1);
      expect(activeBudgets[0].amount).toBe(600);
      expect(activeBudgets[0].start_date).toBe('2026-02-01');
    });

    it('should return budgets active on start date', () => {
      const activeBudgets = Budget.getActive('2026-03-01');

      expect(activeBudgets).toHaveLength(1);
      expect(activeBudgets[0].amount).toBe(700);
    });

    it('should return budgets active on end date', () => {
      const activeBudgets = Budget.getActive('2026-01-31');

      expect(activeBudgets).toHaveLength(1);
      expect(activeBudgets[0].amount).toBe(500);
    });

    it('should return empty array for date with no active budgets', () => {
      const activeBudgets = Budget.getActive('2025-12-31');
      expect(activeBudgets).toEqual([]);
    });

    it('should use current date by default', () => {
      const today = new Date().toISOString().split('T')[0];

      Budget.create({
        category_id: expenseCategoryId,
        amount: 999,
        period: 'monthly',
        start_date: today,
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });

      const activeBudgets = Budget.getActive();
      const todayBudgets = activeBudgets.filter(b => b.amount === 999);

      expect(todayBudgets.length).toBeGreaterThan(0);
    });
  });

  describe('update', () => {
    it('should update budget fields', () => {
      const budget = Budget.create({
        category_id: expenseCategoryId,
        amount: 500,
        period: 'monthly',
        start_date: '2026-01-01',
        end_date: '2026-01-31'
      });

      const updated = Budget.update(budget.id, {
        category_id: expenseCategoryId,
        amount: 750,
        period: 'yearly',
        start_date: '2026-01-01',
        end_date: '2026-12-31'
      });

      expect(updated.amount).toBe(750);
      expect(updated.period).toBe('yearly');
      expect(updated.end_date).toBe('2026-12-31');
    });
  });

  describe('delete', () => {
    it('should delete a budget', () => {
      const budget = Budget.create({
        category_id: expenseCategoryId,
        amount: 500,
        period: 'monthly',
        start_date: '2026-01-01',
        end_date: '2026-01-31'
      });

      const result = Budget.delete(budget.id);

      expect(result.changes).toBe(1);
      expect(Budget.getById(budget.id)).toBeUndefined();
    });

    it('should return 0 changes for non-existent budget', () => {
      const result = Budget.delete(999);
      expect(result.changes).toBe(0);
    });
  });

  describe('getProgress', () => {
    let accountId;

    beforeEach(() => {
      // Create account and transaction for progress testing
      const account = testDb.prepare(`
        INSERT INTO accounts (name, type, balance) VALUES (?, ?, ?)
      `).run('Test Account', 'bank', 1000);
      accountId = account.lastInsertRowid;
    });

    it('should calculate budget progress with no spending', () => {
      const budget = Budget.create({
        category_id: expenseCategoryId,
        amount: 500,
        period: 'monthly',
        start_date: '2026-03-01',
        end_date: '2026-03-31'
      });

      const progress = Budget.getProgress(budget.id);

      expect(progress).toBeDefined();
      expect(progress.spent).toBe(0);
      expect(progress.remaining).toBe(500);
      expect(progress.percentage).toBe(0);
    });

    it('should calculate budget progress with spending', () => {
      const budget = Budget.create({
        category_id: expenseCategoryId,
        amount: 500,
        period: 'monthly',
        start_date: '2026-03-01',
        end_date: '2026-03-31'
      });

      // Add some transactions
      testDb.prepare(`
        INSERT INTO transactions (account_id, category_id, type, amount, date, description)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(accountId, expenseCategoryId, 'expense', 150, '2026-03-10', 'Groceries');

      testDb.prepare(`
        INSERT INTO transactions (account_id, category_id, type, amount, date, description)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(accountId, expenseCategoryId, 'expense', 100, '2026-03-15', 'Restaurant');

      const progress = Budget.getProgress(budget.id);

      expect(progress.spent).toBe(250);
      expect(progress.remaining).toBe(250);
      expect(progress.percentage).toBe(50);
    });

    it('should handle over-budget scenarios', () => {
      const budget = Budget.create({
        category_id: expenseCategoryId,
        amount: 300,
        period: 'monthly',
        start_date: '2026-03-01',
        end_date: '2026-03-31'
      });

      testDb.prepare(`
        INSERT INTO transactions (account_id, category_id, type, amount, date, description)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(accountId, expenseCategoryId, 'expense', 400, '2026-03-10', 'Big purchase');

      const progress = Budget.getProgress(budget.id);

      expect(progress.spent).toBe(400);
      expect(progress.remaining).toBe(-100);
      expect(progress.percentage).toBeCloseTo(133.33, 1);
    });

    it('should only count transactions within budget period', () => {
      const budget = Budget.create({
        category_id: expenseCategoryId,
        amount: 500,
        period: 'monthly',
        start_date: '2026-03-01',
        end_date: '2026-03-31'
      });

      // Transaction before period
      testDb.prepare(`
        INSERT INTO transactions (account_id, category_id, type, amount, date, description)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(accountId, expenseCategoryId, 'expense', 100, '2026-02-28', 'Before');

      // Transaction in period
      testDb.prepare(`
        INSERT INTO transactions (account_id, category_id, type, amount, date, description)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(accountId, expenseCategoryId, 'expense', 150, '2026-03-15', 'During');

      // Transaction after period
      testDb.prepare(`
        INSERT INTO transactions (account_id, category_id, type, amount, date, description)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(accountId, expenseCategoryId, 'expense', 100, '2026-04-01', 'After');

      const progress = Budget.getProgress(budget.id);

      expect(progress.spent).toBe(150); // Only the transaction during the period
    });
  });
});
