import { jest } from '@jest/globals';
import { setupTestDatabase, teardownTestDatabase, seedTestData } from '../utils/testDb.js';

// Mock the database module
let testDb;
let Account;

beforeAll(async () => {
  testDb = setupTestDatabase();

  // Mock the database import
  jest.unstable_mockModule('../../src/db/database.js', () => ({
    default: testDb
  }));

  // Import Account after mocking
  const accountModule = await import('../../src/models/Account.js');
  Account = accountModule.Account;
});

afterAll(() => {
  teardownTestDatabase(testDb);
});

beforeEach(() => {
  // Clear all tables before each test
  testDb.exec('DELETE FROM transactions');
  testDb.exec('DELETE FROM budgets');
  testDb.exec('DELETE FROM accounts');
  testDb.exec('DELETE FROM categories');
});

describe('Account Model', () => {
  describe('create', () => {
    it('should create a new account with all fields', () => {
      const accountData = {
        name: 'Savings Account',
        type: 'bank',
        balance: 5000,
        currency: 'USD'
      };

      const account = Account.create(accountData);

      expect(account).toBeDefined();
      expect(account.id).toBeDefined();
      expect(account.name).toBe(accountData.name);
      expect(account.type).toBe(accountData.type);
      expect(account.balance).toBe(accountData.balance);
      expect(account.currency).toBe(accountData.currency);
      expect(account.created_at).toBeDefined();
    });

    it('should create account with default balance and currency', () => {
      const accountData = {
        name: 'Credit Card',
        type: 'credit_card'
      };

      const account = Account.create(accountData);

      expect(account).toBeDefined();
      expect(account.balance).toBe(0);
      expect(account.currency).toBe('USD');
    });

    it('should support different currencies', () => {
      const account = Account.create({
        name: 'Euro Account',
        type: 'bank',
        balance: 1000,
        currency: 'EUR'
      });

      expect(account.currency).toBe('EUR');
    });

    it('should support CHF currency', () => {
      const account = Account.create({
        name: 'Swiss Account',
        type: 'bank',
        balance: 1000,
        currency: 'CHF'
      });

      expect(account.currency).toBe('CHF');
    });
  });

  describe('getAll', () => {
    it('should return empty array when no accounts exist', () => {
      const accounts = Account.getAll();
      expect(accounts).toEqual([]);
    });

    it('should return all accounts', () => {
      Account.create({ name: 'Account 1', type: 'bank', balance: 100 });
      Account.create({ name: 'Account 2', type: 'credit_card', balance: 200 });

      const accounts = Account.getAll();

      expect(accounts).toHaveLength(2);
      expect(accounts[1].name).toBe('Account 2'); // Most recent first
      expect(accounts[0].name).toBe('Account 1');
    });

    it('should return accounts ordered by created_at DESC', () => {
      const account1 = Account.create({ name: 'First', type: 'bank' });
      const account2 = Account.create({ name: 'Second', type: 'bank' });
      const account3 = Account.create({ name: 'Third', type: 'bank' });

      const accounts = Account.getAll();

      expect(accounts[2].id).toBe(account3.id);
      expect(accounts[1].id).toBe(account2.id);
      expect(accounts[0].id).toBe(account1.id);
    });
  });

  describe('getById', () => {
    it('should return account by id', () => {
      const created = Account.create({ name: 'Test Account', type: 'bank', balance: 500 });

      const account = Account.getById(created.id);

      expect(account).toBeDefined();
      expect(account.id).toBe(created.id);
      expect(account.name).toBe('Test Account');
      expect(account.balance).toBe(500);
    });

    it('should return undefined for non-existent id', () => {
      const account = Account.getById(999);
      expect(account).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should update account fields', () => {
      const account = Account.create({ name: 'Old Name', type: 'bank', balance: 100 });

      const updated = Account.update(account.id, {
        name: 'New Name',
        type: 'credit_card',
        balance: 200,
        currency: 'EUR'
      });

      expect(updated.name).toBe('New Name');
      expect(updated.type).toBe('credit_card');
      expect(updated.balance).toBe(200);
      expect(updated.currency).toBe('EUR');
    });
  });

  describe('delete', () => {
    it('should delete an account', () => {
      const account = Account.create({ name: 'To Delete', type: 'bank' });

      const result = Account.delete(account.id);

      expect(result.changes).toBe(1);
      expect(Account.getById(account.id)).toBeUndefined();
    });

    it('should return 0 changes for non-existent account', () => {
      const result = Account.delete(999);
      expect(result.changes).toBe(0);
    });
  });

  describe('updateBalance', () => {
    it('should increase account balance', () => {
      const account = Account.create({ name: 'Test', type: 'bank', balance: 100 });

      const updated = Account.updateBalance(account.id, 50);

      expect(updated.balance).toBe(150);
    });

    it('should decrease account balance', () => {
      const account = Account.create({ name: 'Test', type: 'bank', balance: 100 });

      const updated = Account.updateBalance(account.id, -30);

      expect(updated.balance).toBe(70);
    });

    it('should handle negative balances', () => {
      const account = Account.create({ name: 'Test', type: 'credit_card', balance: 0 });

      const updated = Account.updateBalance(account.id, -500);

      expect(updated.balance).toBe(-500);
    });

    it('should handle decimal amounts', () => {
      const account = Account.create({ name: 'Test', type: 'bank', balance: 100.50 });

      const updated = Account.updateBalance(account.id, 25.75);

      expect(updated.balance).toBeCloseTo(126.25, 2);
    });
  });
});
