import { jest } from '@jest/globals';
import { setupTestDatabase, teardownTestDatabase, seedTestData, clearTestData } from '../utils/testDb.js';

let testDb;
let Budget;
let Category;
let Account;
let Transaction;

beforeAll(async () => {
  testDb = setupTestDatabase();

  jest.unstable_mockModule('../../src/db/database.js', () => ({
    default: testDb
  }));

  const budgetModule = await import('../../src/models/Budget.js');
  const categoryModule = await import('../../src/models/Category.js');
  const accountModule = await import('../../src/models/Account.js');
  const transactionModule = await import('../../src/models/Transaction.js');
  Budget = budgetModule.Budget;
  Category = categoryModule.Category;
  Account = accountModule.Account;
  Transaction = transactionModule.Transaction;
});

afterAll(() => {
  teardownTestDatabase(testDb);
});

beforeEach(async () => {
  clearTestData(testDb);
});

describe('Budget Model', () => {
  let expenseCategoryId;

  beforeEach(async () => {
    const category = await Category.create({
      name: 'Food',
      type: 'expense',
      color: '#FF6B6B',
      icon: '🍽️'
    });
    expenseCategoryId = category.id;
  });

  describe('create', () => {
    it('should create a monthly budget', async () => {
      const budgetData = {
        category_id: expenseCategoryId,
        amount: 500,
        period: 'monthly',
        start_date: '2026-01-01',
        end_date: '2026-01-31'
      };

      const budget = await Budget.create(budgetData);

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

    it('should create a yearly budget', async () => {
      const budget = await Budget.create({
        category_id: expenseCategoryId,
        amount: 6000,
        period: 'yearly',
        start_date: '2026-01-01',
        end_date: '2026-12-31'
      });

      expect(budget.period).toBe('yearly');
      expect(budget.amount).toBe(6000);
    });

    it('should include category information', async () => {
      const budget = await Budget.create({
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
    it('should return empty array when no budgets exist', async () => {
      const budgets = await Budget.getAll();
      expect(budgets).toEqual([]);
    });

    it('should return all budgets', async () => {
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

      const budgets = await Budget.getAll();
      expect(budgets).toHaveLength(2);
    });

    it('should return budgets ordered by start_date DESC', async () => {
      const budget1 = await Budget.create({
        category_id: expenseCategoryId,
        amount: 500,
        period: 'monthly',
        start_date: '2026-01-01',
        end_date: '2026-01-31'
      });

      const budget2 = await Budget.create({
        category_id: expenseCategoryId,
        amount: 600,
        period: 'monthly',
        start_date: '2026-03-01',
        end_date: '2026-03-31'
      });

      const budgets = await Budget.getAll();
      expect(budgets[0].id).toBe(budget2.id); // Most recent first
      expect(budgets[1].id).toBe(budget1.id);
    });
  });

  describe('getById', () => {
    it('should return budget by id with category info', async () => {
      const created = await Budget.create({
        category_id: expenseCategoryId,
        amount: 750,
        period: 'monthly',
        start_date: '2026-03-01',
        end_date: '2026-03-31'
      });

      const budget = await Budget.getById(created.id);

      expect(budget).toBeDefined();
      expect(budget.id).toBe(created.id);
      expect(budget.amount).toBe(750);
      expect(budget.category_name).toBe('Food');
    });

    it('should return undefined for non-existent id', async () => {
      const budget = await Budget.getById(999);
      expect(budget).toBeUndefined();
    });
  });

  describe('getActive', () => {
    beforeEach(async () => {
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

    it('should return budgets active on specific date', async () => {
      const activeBudgets = await Budget.getActive('2026-02-15');

      expect(activeBudgets).toHaveLength(1);
      expect(activeBudgets[0].amount).toBe(600);
      expect(activeBudgets[0].start_date).toBe('2026-02-01');
    });

    it('should return budgets active on start date', async () => {
      const activeBudgets = await Budget.getActive('2026-03-01');

      expect(activeBudgets).toHaveLength(1);
      expect(activeBudgets[0].amount).toBe(700);
    });

    it('should return budgets active on end date', async () => {
      const activeBudgets = await Budget.getActive('2026-01-31');

      expect(activeBudgets).toHaveLength(1);
      expect(activeBudgets[0].amount).toBe(500);
    });

    it('should return empty array for date with no active budgets', async () => {
      const activeBudgets = await Budget.getActive('2025-12-31');
      expect(activeBudgets).toEqual([]);
    });

    it('should use current date by default', async () => {
      const today = new Date().toISOString().split('T')[0];

      Budget.create({
        category_id: expenseCategoryId,
        amount: 999,
        period: 'monthly',
        start_date: today,
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });

      const activeBudgets = await Budget.getActive();
      const todayBudgets = activeBudgets.filter(b => b.amount === 999);

      expect(todayBudgets.length).toBeGreaterThan(0);
    });
  });

  describe('update', () => {
    it('should update budget fields', async () => {
      const budget = await Budget.create({
        category_id: expenseCategoryId,
        amount: 500,
        period: 'monthly',
        start_date: '2026-01-01',
        end_date: '2026-01-31'
      });

      const updated = await Budget.update(budget.id, {
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
    it('should delete a budget', async () => {
      const budget = await Budget.create({
        category_id: expenseCategoryId,
        amount: 500,
        period: 'monthly',
        start_date: '2026-01-01',
        end_date: '2026-01-31'
      });

      const result = await Budget.delete(budget.id);

      expect(result.changes).toBe(1);
      expect(await Budget.getById(budget.id)).toBeUndefined();
    });

    it('should return 0 changes for non-existent budget', async () => {
      const result = await Budget.delete(999);
      expect(result.changes).toBe(0);
    });
  });

  describe('getProgress', () => {
    let accountId;

    beforeEach(async () => {
      // Create account and transaction for progress testing
      const account = await Account.create({
        name: 'Test Account',
        type: 'bank',
        balance: 1000
      });
      accountId = account.id;
    });

    it('should calculate budget progress with no spending', async () => {
      const budget = await Budget.create({
        category_id: expenseCategoryId,
        amount: 500,
        period: 'monthly',
        start_date: '2026-03-01',
        end_date: '2026-03-31'
      });

      const progress = await Budget.getProgress(budget.id);

      expect(progress).toBeDefined();
      expect(progress.spent).toBe(0);
      expect(progress.remaining).toBe(500);
      expect(progress.percentage).toBe(0);
    });

    it('should calculate budget progress with spending', async () => {
      const budget = await Budget.create({
        category_id: expenseCategoryId,
        amount: 500,
        period: 'monthly',
        start_date: '2026-03-01',
        end_date: '2026-03-31'
      });

      // Add some transactions
      await Transaction.create({
        account_id: accountId,
        category_id: expenseCategoryId,
        type: 'expense',
        amount: 150,
        date: '2026-03-10',
        description: 'Groceries'
      });

      await Transaction.create({
        account_id: accountId,
        category_id: expenseCategoryId,
        type: 'expense',
        amount: 100,
        date: '2026-03-15',
        description: 'Restaurant'
      });

      const progress = await Budget.getProgress(budget.id);

      expect(progress.spent).toBe(250);
      expect(progress.remaining).toBe(250);
      expect(progress.percentage).toBe(50);
    });

    it('should handle over-budget scenarios', async () => {
      const budget = await Budget.create({
        category_id: expenseCategoryId,
        amount: 300,
        period: 'monthly',
        start_date: '2026-03-01',
        end_date: '2026-03-31'
      });

      await Transaction.create({
        account_id: accountId,
        category_id: expenseCategoryId,
        type: 'expense',
        amount: 400,
        date: '2026-03-10',
        description: 'Big purchase'
      });

      const progress = await Budget.getProgress(budget.id);

      expect(progress.spent).toBe(400);
      expect(progress.remaining).toBe(-100);
      expect(progress.percentage).toBeCloseTo(133.33, 1);
    });

    it('should only count transactions within budget period', async () => {
      const budget = await Budget.create({
        category_id: expenseCategoryId,
        amount: 500,
        period: 'monthly',
        start_date: '2026-03-01',
        end_date: '2026-03-31'
      });

      // Transaction before period
      await Transaction.create({
        account_id: accountId,
        category_id: expenseCategoryId,
        type: 'expense',
        amount: 100,
        date: '2026-02-28',
        description: 'Before'
      });

      // Transaction in period
      await Transaction.create({
        account_id: accountId,
        category_id: expenseCategoryId,
        type: 'expense',
        amount: 150,
        date: '2026-03-15',
        description: 'During'
      });

      // Transaction after period
      await Transaction.create({
        account_id: accountId,
        category_id: expenseCategoryId,
        type: 'expense',
        amount: 100,
        date: '2026-04-01',
        description: 'After'
      });

      const progress = await Budget.getProgress(budget.id);

      expect(progress.spent).toBe(150); // Only the transaction during the period
    });
  });
});
