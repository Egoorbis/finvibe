import { jest } from '@jest/globals';
import { setupTestDatabase, teardownTestDatabase } from '../utils/testDb.js';

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

beforeEach(() => {
  testDb.exec('DELETE FROM transactions');
  testDb.exec('DELETE FROM budgets');
  testDb.exec('DELETE FROM accounts');
  testDb.exec('DELETE FROM categories');
});

describe('Transaction Model', () => {
  let accountId;
  let expenseCategoryId;
  let incomeCategoryId;

  beforeEach(() => {
    const account = Account.create({
      name: 'Test Account',
      type: 'bank',
      balance: 1000,
      currency: 'USD'
    });
    accountId = account.id;

    const expenseCategory = Category.create({
      name: 'Food',
      type: 'expense',
      color: '#FF6B6B',
      icon: '🍽️'
    });
    expenseCategoryId = expenseCategory.id;

    const incomeCategory = Category.create({
      name: 'Salary',
      type: 'income',
      color: '#52BE80',
      icon: '💰'
    });
    incomeCategoryId = incomeCategory.id;
  });

  describe('create', () => {
    it('should create expense transaction with all fields', () => {
      const transactionData = {
        account_id: accountId,
        category_id: expenseCategoryId,
        type: 'expense',
        amount: 50.75,
        date: '2026-03-15',
        description: 'Lunch at restaurant',
        tags: 'food,dining',
        receipt_path: '/uploads/receipt123.jpg'
      };

      const transaction = Transaction.create(transactionData);

      expect(transaction).toBeDefined();
      expect(transaction.id).toBeDefined();
      expect(transaction.account_id).toBe(accountId);
      expect(transaction.category_id).toBe(expenseCategoryId);
      expect(transaction.type).toBe('expense');
      expect(transaction.amount).toBe(50.75);
      expect(transaction.date).toBe('2026-03-15');
      expect(transaction.description).toBe('Lunch at restaurant');
      expect(transaction.tags).toBe('food,dining');
      expect(transaction.receipt_path).toBe('/uploads/receipt123.jpg');
      expect(transaction.created_at).toBeDefined();
    });

    it('should create income transaction', () => {
      const transaction = Transaction.create({
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

    it('should update account balance on expense creation', () => {
      Transaction.create({
        account_id: accountId,
        category_id: expenseCategoryId,
        type: 'expense',
        amount: 100,
        date: '2026-03-15',
        description: 'Groceries'
      });

      const account = Account.getById(accountId);
      expect(account.balance).toBe(900); // 1000 - 100
    });

    it('should update account balance on income creation', () => {
      Transaction.create({
        account_id: accountId,
        category_id: incomeCategoryId,
        type: 'income',
        amount: 500,
        date: '2026-03-15',
        description: 'Freelance payment'
      });

      const account = Account.getById(accountId);
      expect(account.balance).toBe(1500); // 1000 + 500
    });

    it('should include category information', () => {
      const transaction = Transaction.create({
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

    it('should create transaction without optional fields', () => {
      const transaction = Transaction.create({
        account_id: accountId,
        category_id: expenseCategoryId,
        type: 'expense',
        amount: 10,
        date: '2026-03-15',
        description: 'Coffee'
      });

      expect(transaction.tags).toBeNull();
      expect(transaction.receipt_path).toBeNull();
    });

    it('should handle decimal amounts correctly', () => {
      const transaction = Transaction.create({
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
    it('should return empty array when no transactions exist', () => {
      const transactions = Transaction.getAll();
      expect(transactions).toEqual([]);
    });

    it('should return all transactions', () => {
      Transaction.create({
        account_id: accountId,
        category_id: expenseCategoryId,
        type: 'expense',
        amount: 50,
        date: '2026-03-15',
        description: 'Groceries'
      });

      Transaction.create({
        account_id: accountId,
        category_id: incomeCategoryId,
        type: 'income',
        amount: 1000,
        date: '2026-03-01',
        description: 'Salary'
      });

      const transactions = Transaction.getAll();
      expect(transactions).toHaveLength(2);
    });

    it('should return transactions ordered by date DESC', () => {
      const t1 = Transaction.create({
        account_id: accountId,
        category_id: expenseCategoryId,
        type: 'expense',
        amount: 50,
        date: '2026-03-10',
        description: 'Old transaction'
      });

      const t2 = Transaction.create({
        account_id: accountId,
        category_id: expenseCategoryId,
        type: 'expense',
        amount: 75,
        date: '2026-03-20',
        description: 'Recent transaction'
      });

      const transactions = Transaction.getAll();
      expect(transactions[0].id).toBe(t2.id); // Most recent first
      expect(transactions[1].id).toBe(t1.id);
    });
  });

  describe('getById', () => {
    it('should return transaction by id with full details', () => {
      const created = Transaction.create({
        account_id: accountId,
        category_id: expenseCategoryId,
        type: 'expense',
        amount: 150.50,
        date: '2026-03-15',
        description: 'Electronics',
        tags: 'tech,gadgets'
      });

      const transaction = Transaction.getById(created.id);

      expect(transaction).toBeDefined();
      expect(transaction.id).toBe(created.id);
      expect(transaction.amount).toBe(150.50);
      expect(transaction.tags).toBe('tech,gadgets');
      expect(transaction.category_name).toBe('Food');
      expect(transaction.account_name).toBe('Test Account');
    });

    it('should return undefined for non-existent id', () => {
      const transaction = Transaction.getById(999);
      expect(transaction).toBeUndefined();
    });
  });

  describe('getByFilters', () => {
    beforeEach(() => {
      // Create multiple transactions for filtering tests
      Transaction.create({
        account_id: accountId,
        category_id: expenseCategoryId,
        type: 'expense',
        amount: 50,
        date: '2026-01-15',
        description: 'January expense'
      });

      Transaction.create({
        account_id: accountId,
        category_id: expenseCategoryId,
        type: 'expense',
        amount: 75,
        date: '2026-02-20',
        description: 'February expense'
      });

      Transaction.create({
        account_id: accountId,
        category_id: incomeCategoryId,
        type: 'income',
        amount: 1000,
        date: '2026-02-01',
        description: 'February income'
      });

      Transaction.create({
        account_id: accountId,
        category_id: incomeCategoryId,
        type: 'income',
        amount: 1000,
        date: '2026-03-01',
        description: 'March income'
      });
    });

    it('should filter by type', () => {
      const expenses = Transaction.getByFilters({ type: 'expense' });
      expect(expenses).toHaveLength(2);
      expect(expenses.every(t => t.type === 'expense')).toBe(true);

      const income = Transaction.getByFilters({ type: 'income' });
      expect(income).toHaveLength(2);
      expect(income.every(t => t.type === 'income')).toBe(true);
    });

    it('should filter by account_id', () => {
      const transactions = Transaction.getByFilters({ account_id: accountId });
      expect(transactions).toHaveLength(4);
    });

    it('should filter by category_id', () => {
      const expenseTransactions = Transaction.getByFilters({ category_id: expenseCategoryId });
      expect(expenseTransactions).toHaveLength(2);
      expect(expenseTransactions.every(t => t.category_id === expenseCategoryId)).toBe(true);
    });

    it('should filter by start_date', () => {
      const transactions = Transaction.getByFilters({ start_date: '2026-02-01' });
      expect(transactions).toHaveLength(3); // Feb and March transactions
    });

    it('should filter by end_date', () => {
      const transactions = Transaction.getByFilters({ end_date: '2026-02-28' });
      expect(transactions).toHaveLength(3); // Jan and Feb transactions
    });

    it('should filter by date range', () => {
      const transactions = Transaction.getByFilters({
        start_date: '2026-02-01',
        end_date: '2026-02-28'
      });
      expect(transactions).toHaveLength(2); // Only February transactions
      expect(transactions.every(t => t.date >= '2026-02-01' && t.date <= '2026-02-28')).toBe(true);
    });

    it('should combine multiple filters', () => {
      const transactions = Transaction.getByFilters({
        type: 'expense',
        start_date: '2026-02-01',
        end_date: '2026-02-28'
      });
      expect(transactions).toHaveLength(1);
      expect(transactions[0].description).toBe('February expense');
    });

    it('should return all transactions when no filters provided', () => {
      const transactions = Transaction.getByFilters({});
      expect(transactions).toHaveLength(4);
    });
  });

  describe('update', () => {
    it('should update transaction fields', () => {
      const transaction = Transaction.create({
        account_id: accountId,
        category_id: expenseCategoryId,
        type: 'expense',
        amount: 100,
        date: '2026-03-15',
        description: 'Original'
      });

      const updated = Transaction.update(transaction.id, {
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

    it('should adjust account balance when amount changes', () => {
      const transaction = Transaction.create({
        account_id: accountId,
        category_id: expenseCategoryId,
        type: 'expense',
        amount: 100,
        date: '2026-03-15',
        description: 'Original'
      });

      expect(Account.getById(accountId).balance).toBe(900); // 1000 - 100

      Transaction.update(transaction.id, { amount: 150 });

      expect(Account.getById(accountId).balance).toBe(850); // 1000 - 150
    });

    it('should handle type change from expense to income', () => {
      const transaction = Transaction.create({
        account_id: accountId,
        category_id: expenseCategoryId,
        type: 'expense',
        amount: 100,
        date: '2026-03-15',
        description: 'Expense'
      });

      expect(Account.getById(accountId).balance).toBe(900); // 1000 - 100

      Transaction.update(transaction.id, {
        category_id: incomeCategoryId,
        type: 'income'
      });

      expect(Account.getById(accountId).balance).toBe(1100); // 1000 + 100 (reversed and added)
    });

    it('should handle type change from income to expense', () => {
      const transaction = Transaction.create({
        account_id: accountId,
        category_id: incomeCategoryId,
        type: 'income',
        amount: 100,
        date: '2026-03-15',
        description: 'Income'
      });

      expect(Account.getById(accountId).balance).toBe(1100); // 1000 + 100

      Transaction.update(transaction.id, {
        category_id: expenseCategoryId,
        type: 'expense'
      });

      expect(Account.getById(accountId).balance).toBe(900); // 1000 - 100 (reversed and subtracted)
    });
  });

  describe('delete', () => {
    it('should delete a transaction', () => {
      const transaction = Transaction.create({
        account_id: accountId,
        category_id: expenseCategoryId,
        type: 'expense',
        amount: 50,
        date: '2026-03-15',
        description: 'To delete'
      });

      const result = Transaction.delete(transaction.id);

      expect(result.changes).toBe(1);
      expect(Transaction.getById(transaction.id)).toBeUndefined();
    });

    it('should restore account balance on expense deletion', () => {
      const transaction = Transaction.create({
        account_id: accountId,
        category_id: expenseCategoryId,
        type: 'expense',
        amount: 100,
        date: '2026-03-15',
        description: 'Expense'
      });

      expect(Account.getById(accountId).balance).toBe(900); // 1000 - 100

      Transaction.delete(transaction.id);

      expect(Account.getById(accountId).balance).toBe(1000); // Restored
    });

    it('should restore account balance on income deletion', () => {
      const transaction = Transaction.create({
        account_id: accountId,
        category_id: incomeCategoryId,
        type: 'income',
        amount: 200,
        date: '2026-03-15',
        description: 'Income'
      });

      expect(Account.getById(accountId).balance).toBe(1200); // 1000 + 200

      Transaction.delete(transaction.id);

      expect(Account.getById(accountId).balance).toBe(1000); // Restored
    });

    it('should return 0 changes for non-existent transaction', () => {
      const result = Transaction.delete(999);
      expect(result.changes).toBe(0);
    });
  });

  describe('getSummary', () => {
    beforeEach(() => {
      // Create sample transactions
      Transaction.create({
        account_id: accountId,
        category_id: expenseCategoryId,
        type: 'expense',
        amount: 100,
        date: '2026-03-10',
        description: 'Expense 1'
      });

      Transaction.create({
        account_id: accountId,
        category_id: expenseCategoryId,
        type: 'expense',
        amount: 150,
        date: '2026-03-15',
        description: 'Expense 2'
      });

      Transaction.create({
        account_id: accountId,
        category_id: incomeCategoryId,
        type: 'income',
        amount: 1000,
        date: '2026-03-01',
        description: 'Income 1'
      });

      Transaction.create({
        account_id: accountId,
        category_id: incomeCategoryId,
        type: 'income',
        amount: 500,
        date: '2026-03-20',
        description: 'Income 2'
      });
    });

    it('should calculate summary without filters', () => {
      const summary = Transaction.getSummary();

      expect(summary.income).toBe(1500);
      expect(summary.expense).toBe(250);
      expect(summary.net).toBe(1250);
      expect(summary.transactionCount).toBe(4);
    });

    it('should calculate summary with date range filter', () => {
      const summary = Transaction.getSummary({
        start_date: '2026-03-10',
        end_date: '2026-03-20'
      });

      expect(summary.income).toBe(500); // Only second income
      expect(summary.expense).toBe(250); // Both expenses
      expect(summary.transactionCount).toBe(3);
    });

    it('should calculate summary filtered by type', () => {
      const summary = Transaction.getSummary({ type: 'expense' });

      expect(summary.income).toBe(0);
      expect(summary.expense).toBe(250);
      expect(summary.net).toBe(-250);
      expect(summary.transactionCount).toBe(2);
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in description', () => {
      const transaction = Transaction.create({
        account_id: accountId,
        category_id: expenseCategoryId,
        type: 'expense',
        amount: 25,
        date: '2026-03-15',
        description: "Joe's Coffee & Tea's"
      });

      expect(transaction.description).toBe("Joe's Coffee & Tea's");
    });

    it('should handle very long descriptions', () => {
      const longDescription = 'A'.repeat(500);
      const transaction = Transaction.create({
        account_id: accountId,
        category_id: expenseCategoryId,
        type: 'expense',
        amount: 25,
        date: '2026-03-15',
        description: longDescription
      });

      expect(transaction.description).toBe(longDescription);
    });

    it('should handle multiple tags', () => {
      const transaction = Transaction.create({
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

    it('should handle large amounts', () => {
      const transaction = Transaction.create({
        account_id: accountId,
        category_id: expenseCategoryId,
        type: 'expense',
        amount: 999999.99,
        date: '2026-03-15',
        description: 'Large purchase'
      });

      expect(transaction.amount).toBe(999999.99);
    });

    it('should handle zero amount', () => {
      const transaction = Transaction.create({
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
