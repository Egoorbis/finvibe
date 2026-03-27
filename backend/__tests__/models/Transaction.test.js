import { jest } from '@jest/globals';
import { setupTestDatabase, teardownTestDatabase, clearTestData } from '../utils/testDb.js';

let testDb;
let Transaction;
let Account;
let Category;

beforeAll(async () => {
  testDb = setupTestDatabase();

  jest.unstable_mockModule('../../src/db/database.js', () => ({
    default: testDb
  }));

  const transactionModule = await import('../../src/models/Transaction.js');
  const accountModule = await import('../../src/models/Account.js');
  const categoryModule = await import('../../src/models/Category.js');
  Transaction = transactionModule.Transaction;
  Account = accountModule.Account;
  Category = categoryModule.Category;
});

afterAll(() => {
  teardownTestDatabase(testDb);
});

beforeEach(async () => {
  clearTestData(testDb);
});

describe('Transaction Model', () => {
  let accountId;
  let expenseCategoryId;
  let incomeCategoryId;

  beforeEach(async () => {
    const account = await Account.create({
      name: 'Test Account',
      type: 'bank',
      balance: 1000,
      currency: 'USD'
    });
    accountId = account.id;

    const expenseCategory = await Category.create({
      name: 'Food',
      type: 'expense',
      color: '#FF6B6B',
      icon: '🍽️'
    });
    expenseCategoryId = expenseCategory.id;

    const incomeCategory = await Category.create({
      name: 'Salary',
      type: 'income',
      color: '#52BE80',
      icon: '💰'
    });
    incomeCategoryId = incomeCategory.id;
  });

  describe('create', () => {
    it('should create expense transaction with all fields', async () => {
      const transactionData = {
        account_id: accountId,
        category_id: expenseCategoryId,
        type: 'expense',
        amount: 50.75,
        date: '2026-03-15',
        description: 'Lunch at restaurant',
        tags: 'food,dining',
        attachment_path: '/uploads/receipt123.jpg'
      };

      const transaction = await Transaction.create(transactionData);

      expect(transaction).toBeDefined();
      expect(transaction.id).toBeDefined();
      expect(transaction.account_id).toBe(accountId);
      expect(transaction.category_id).toBe(expenseCategoryId);
      expect(transaction.type).toBe('expense');
      expect(transaction.amount).toBe(50.75);
      expect(transaction.date).toBe('2026-03-15');
      expect(transaction.description).toBe('Lunch at restaurant');
      expect(transaction.tags).toBe('food,dining');
      expect(transaction.attachment_path).toBe('/uploads/receipt123.jpg');
      expect(transaction.created_at).toBeDefined();
    });

    it('should create income transaction', async () => {
      const transaction = await Transaction.create({
        account_id: accountId,
        category_id: incomeCategoryId,
        type: 'income',
        amount: 3000,
        date: '2026-03-01',
        description: 'Monthly salary'
      });

      expect(transaction.type).toBe('income');
      expect(transaction.amount).toBe(3000);
      expect(transaction.category_name).toBe('Salary');
    });

    it('should update account balance on expense creation', async () => {
      await Transaction.create({
        account_id: accountId,
        category_id: expenseCategoryId,
        type: 'expense',
        amount: 100,
        date: '2026-03-15',
        description: 'Groceries'
      });

      const account = await Account.getById(accountId);
      expect(account.balance).toBe(900); // 1000 - 100
    });

    it('should update account balance on income creation', async () => {
      await Transaction.create({
        account_id: accountId,
        category_id: incomeCategoryId,
        type: 'income',
        amount: 500,
        date: '2026-03-15',
        description: 'Freelance payment'
      });

      const account = await Account.getById(accountId);
      expect(account.balance).toBe(1500); // 1000 + 500
    });

    it('should include category information', async () => {
      const transaction = await Transaction.create({
        account_id: accountId,
        category_id: expenseCategoryId,
        type: 'expense',
        amount: 25,
        date: '2026-03-15',
        description: 'Snacks'
      });

      expect(transaction.category_name).toBe('Food');
      expect(transaction.category_icon).toBe('🍽️');
      expect(transaction.category_color).toBe('#FF6B6B');
    });

    it('should create transaction without optional fields', async () => {
      const transaction = await Transaction.create({
        account_id: accountId,
        category_id: expenseCategoryId,
        type: 'expense',
        amount: 10,
        date: '2026-03-15',
        description: 'Coffee'
      });

      expect(transaction.tags).toBeNull();
      expect(transaction.attachment_path).toBeNull();
    });

    it('should handle decimal amounts correctly', async () => {
      const transaction = await Transaction.create({
        account_id: accountId,
        category_id: expenseCategoryId,
        type: 'expense',
        amount: 12.99,
        date: '2026-03-15',
        description: 'Book'
      });

      expect(transaction.amount).toBe(12.99);
    });
  });

  describe('getAll', () => {
    it('should return empty array when no transactions exist', async () => {
      const transactions = await Transaction.getAll();
      expect(transactions).toEqual([]);
    });

    it('should return all transactions', async () => {
      await Transaction.create({
        account_id: accountId,
        category_id: expenseCategoryId,
        type: 'expense',
        amount: 50,
        date: '2026-03-15',
        description: 'Groceries'
      });

      await Transaction.create({
        account_id: accountId,
        category_id: incomeCategoryId,
        type: 'income',
        amount: 1000,
        date: '2026-03-01',
        description: 'Salary'
      });

      const transactions = await Transaction.getAll();
      expect(transactions).toHaveLength(2);
    });

    it('should return transactions ordered by date DESC', async () => {
      const t1 = await Transaction.create({
        account_id: accountId,
        category_id: expenseCategoryId,
        type: 'expense',
        amount: 50,
        date: '2026-03-10',
        description: 'Old transaction'
      });

      const t2 = await Transaction.create({
        account_id: accountId,
        category_id: expenseCategoryId,
        type: 'expense',
        amount: 75,
        date: '2026-03-20',
        description: 'Recent transaction'
      });

      const transactions = await Transaction.getAll();
      expect(transactions[0].id).toBe(t2.id); // Most recent first
      expect(transactions[1].id).toBe(t1.id);
    });
  });

  describe('getById', () => {
    it('should return transaction by id with full details', async () => {
      const created = await Transaction.create({
        account_id: accountId,
        category_id: expenseCategoryId,
        type: 'expense',
        amount: 150.50,
        date: '2026-03-15',
        description: 'Electronics',
        tags: 'tech,gadgets'
      });

      const transaction = await Transaction.getById(created.id);

      expect(transaction).toBeDefined();
      expect(transaction.id).toBe(created.id);
      expect(transaction.amount).toBe(150.50);
      expect(transaction.tags).toBe('tech,gadgets');
      expect(transaction.category_name).toBe('Food');
      expect(transaction.account_name).toBe('Test Account');
    });

    it('should return undefined for non-existent id', async () => {
      const transaction = await Transaction.getById(999);
      expect(transaction).toBeUndefined();
    });
  });

  describe('filtering with getAll', () => {
    beforeEach(async () => {
      // Create multiple transactions for filtering tests
      await Transaction.create({
        account_id: accountId,
        category_id: expenseCategoryId,
        type: 'expense',
        amount: 50,
        date: '2026-01-15',
        description: 'January expense'
      });

      await Transaction.create({
        account_id: accountId,
        category_id: expenseCategoryId,
        type: 'expense',
        amount: 75,
        date: '2026-02-20',
        description: 'February expense'
      });

      await Transaction.create({
        account_id: accountId,
        category_id: incomeCategoryId,
        type: 'income',
        amount: 1000,
        date: '2026-02-01',
        description: 'February income'
      });

      await Transaction.create({
        account_id: accountId,
        category_id: incomeCategoryId,
        type: 'income',
        amount: 1000,
        date: '2026-03-01',
        description: 'March income'
      });
    });

    it('should filter by type', async () => {
      const expenses = await Transaction.getAll({ type: 'expense' });
      expect(expenses).toHaveLength(2);
      expect(expenses.every(t => t.type === 'expense')).toBe(true);

      const income = await Transaction.getAll({ type: 'income' });
      expect(income).toHaveLength(2);
      expect(income.every(t => t.type === 'income')).toBe(true);
    });

    it('should filter by account_id', async () => {
      const transactions = await Transaction.getAll({ account_id: accountId });
      expect(transactions).toHaveLength(4);
    });

    it('should filter by category_id', async () => {
      const expenseTransactions = await Transaction.getAll({ category_id: expenseCategoryId });
      expect(expenseTransactions).toHaveLength(2);
      expect(expenseTransactions.every(t => t.category_id === expenseCategoryId)).toBe(true);
    });

    it('should filter by start_date', async () => {
      const transactions = await Transaction.getAll({ start_date: '2026-02-01' });
      expect(transactions).toHaveLength(3); // Feb and March transactions
    });

    it('should filter by end_date', async () => {
      const transactions = await Transaction.getAll({ end_date: '2026-02-28' });
      expect(transactions).toHaveLength(3); // Jan and Feb transactions
    });

    it('should filter by date range', async () => {
      const transactions = await Transaction.getAll({
        start_date: '2026-02-01',
        end_date: '2026-02-28'
      });
      expect(transactions).toHaveLength(2); // Only February transactions
      expect(transactions.every(t => t.date >= '2026-02-01' && t.date <= '2026-02-28')).toBe(true);
    });

    it('should combine multiple filters', async () => {
      const transactions = await Transaction.getAll({
        type: 'expense',
        start_date: '2026-02-01',
        end_date: '2026-02-28'
      });
      expect(transactions).toHaveLength(1);
      expect(transactions[0].description).toBe('February expense');
    });

    it('should return all transactions when no filters provided', async () => {
      const transactions = await Transaction.getAll({});
      expect(transactions).toHaveLength(4);
    });
  });

  describe('update', () => {
    it('should update transaction fields', async () => {
      const transaction = await Transaction.create({
        account_id: accountId,
        category_id: expenseCategoryId,
        type: 'expense',
        amount: 100,
        date: '2026-03-15',
        description: 'Original'
      });

      const updated = await Transaction.update(transaction.id, {
        account_id: accountId,
        category_id: expenseCategoryId,
        type: 'expense',
        amount: 150,
        date: '2026-03-20',
        description: 'Updated',
        tags: 'new,tags'
      });

      expect(updated.amount).toBe(150);
      expect(updated.date).toBe('2026-03-20');
      expect(updated.description).toBe('Updated');
      expect(updated.tags).toBe('new,tags');
    });

    it('should adjust account balance when amount changes', async () => {
      const transaction = await Transaction.create({
        account_id: accountId,
        category_id: expenseCategoryId,
        type: 'expense',
        amount: 100,
        date: '2026-03-15',
        description: 'Original'
      });

      expect((await Account.getById(accountId)).balance).toBe(900); // 1000 - 100

      await Transaction.update(transaction.id, {
        account_id: accountId,
        category_id: expenseCategoryId,
        type: 'expense',
        amount: 150,
        date: '2026-03-15',
        description: 'Original'
      });

      expect((await Account.getById(accountId)).balance).toBe(850); // 1000 - 150
    });

    it('should handle type change from expense to income', async () => {
      const transaction = await Transaction.create({
        account_id: accountId,
        category_id: expenseCategoryId,
        type: 'expense',
        amount: 100,
        date: '2026-03-15',
        description: 'Expense'
      });

      expect((await Account.getById(accountId)).balance).toBe(900); // 1000 - 100

      await Transaction.update(transaction.id, {
        account_id: accountId,
        category_id: incomeCategoryId,
        type: 'income',
        amount: 100,
        date: '2026-03-15',
        description: 'Income'
      });

      expect((await Account.getById(accountId)).balance).toBe(1100); // 1000 + 100 (reversed and added)
    });

    it('should handle type change from income to expense', async () => {
      const transaction = await Transaction.create({
        account_id: accountId,
        category_id: incomeCategoryId,
        type: 'income',
        amount: 100,
        date: '2026-03-15',
        description: 'Income'
      });

      expect((await Account.getById(accountId)).balance).toBe(1100); // 1000 + 100

      await Transaction.update(transaction.id, {
        account_id: accountId,
        category_id: expenseCategoryId,
        type: 'expense',
        amount: 100,
        date: '2026-03-15',
        description: 'Expense'
      });

      expect((await Account.getById(accountId)).balance).toBe(900); // 1000 - 100 (reversed and subtracted)
    });
  });

  describe('delete', () => {
    it('should delete a transaction', async () => {
      const transaction = await Transaction.create({
        account_id: accountId,
        category_id: expenseCategoryId,
        type: 'expense',
        amount: 50,
        date: '2026-03-15',
        description: 'To delete'
      });

      const result = await Transaction.delete(transaction.id);

      expect(result.changes).toBe(1);
      expect(await Transaction.getById(transaction.id)).toBeUndefined();
    });

    it('should restore account balance on expense deletion', async () => {
      const transaction = await Transaction.create({
        account_id: accountId,
        category_id: expenseCategoryId,
        type: 'expense',
        amount: 100,
        date: '2026-03-15',
        description: 'Expense'
      });

      expect((await Account.getById(accountId)).balance).toBe(900); // 1000 - 100

      await Transaction.delete(transaction.id);

      expect((await Account.getById(accountId)).balance).toBe(1000); // Restored
    });

    it('should restore account balance on income deletion', async () => {
      const transaction = await Transaction.create({
        account_id: accountId,
        category_id: incomeCategoryId,
        type: 'income',
        amount: 200,
        date: '2026-03-15',
        description: 'Income'
      });

      expect((await Account.getById(accountId)).balance).toBe(1200); // 1000 + 200

      await Transaction.delete(transaction.id);

      expect((await Account.getById(accountId)).balance).toBe(1000); // Restored
    });

    it('should return null for non-existent transaction', async () => {
      const result = await Transaction.delete(999);
      expect(result).toBeNull();
    });
  });

  describe('getSummary', () => {
    beforeEach(async () => {
      // Create sample transactions
      await Transaction.create({
        account_id: accountId,
        category_id: expenseCategoryId,
        type: 'expense',
        amount: 100,
        date: '2026-03-10',
        description: 'Expense 1'
      });

      await Transaction.create({
        account_id: accountId,
        category_id: expenseCategoryId,
        type: 'expense',
        amount: 150,
        date: '2026-03-15',
        description: 'Expense 2'
      });

      await Transaction.create({
        account_id: accountId,
        category_id: incomeCategoryId,
        type: 'income',
        amount: 1000,
        date: '2026-03-01',
        description: 'Income 1'
      });

      await Transaction.create({
        account_id: accountId,
        category_id: incomeCategoryId,
        type: 'income',
        amount: 500,
        date: '2026-03-20',
        description: 'Income 2'
      });
    });

    it('should calculate summary without filters', async () => {
      const summary = await Transaction.getSummary();

      const incomeSum = summary.find(s => s.type === 'income');
      const expenseSum = summary.find(s => s.type === 'expense');

      expect(incomeSum.total).toBe(1500);
      expect(incomeSum.count).toBe(2);
      expect(expenseSum.total).toBe(250);
      expect(expenseSum.count).toBe(2);
    });

    it('should calculate summary with date range filter', async () => {
      const summary = await Transaction.getSummary({
        start_date: '2026-03-10',
        end_date: '2026-03-20'
      });

      const incomeSum = summary.find(s => s.type === 'income');
      const expenseSum = summary.find(s => s.type === 'expense');

      expect(incomeSum.total).toBe(500); // Only second income
      expect(expenseSum.total).toBe(250); // Both expenses
    });

    it('should calculate summary filtered by type', async () => {
      // Note: getSummary doesn't filter by type, it groups by type
      // Use getAll with type filter for this use case
      const expenseTransactions = await Transaction.getAll({ type: 'expense' });
      const totalExpense = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);

      expect(totalExpense).toBe(250);
      expect(expenseTransactions.length).toBe(2);
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in description', async () => {
      const transaction = await Transaction.create({
        account_id: accountId,
        category_id: expenseCategoryId,
        type: 'expense',
        amount: 25,
        date: '2026-03-15',
        description: "Joe's Coffee & Tea's"
      });

      expect(transaction.description).toBe("Joe's Coffee & Tea's");
    });

    it('should handle very long descriptions', async () => {
      const longDescription = 'A'.repeat(500);
      const transaction = await Transaction.create({
        account_id: accountId,
        category_id: expenseCategoryId,
        type: 'expense',
        amount: 25,
        date: '2026-03-15',
        description: longDescription
      });

      expect(transaction.description).toBe(longDescription);
    });

    it('should handle multiple tags', async () => {
      const transaction = await Transaction.create({
        account_id: accountId,
        category_id: expenseCategoryId,
        type: 'expense',
        amount: 25,
        date: '2026-03-15',
        description: 'Shopping',
        tags: 'electronics,gadgets,tech,sale'
      });

      expect(transaction.tags).toBe('electronics,gadgets,tech,sale');
    });

    it('should handle large amounts', async () => {
      const transaction = await Transaction.create({
        account_id: accountId,
        category_id: expenseCategoryId,
        type: 'expense',
        amount: 999999.99,
        date: '2026-03-15',
        description: 'Large purchase'
      });

      expect(transaction.amount).toBe(999999.99);
    });

    it('should handle zero amount', async () => {
      const transaction = await Transaction.create({
        account_id: accountId,
        category_id: expenseCategoryId,
        type: 'expense',
        amount: 0,
        date: '2026-03-15',
        description: 'Zero amount test'
      });

      expect(transaction.amount).toBe(0);
    });
  });
});
