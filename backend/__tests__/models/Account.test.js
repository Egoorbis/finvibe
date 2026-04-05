import { jest } from '@jest/globals';
import { setupTestDatabase, teardownTestDatabase, seedTestData, clearTestData } from '../utils/testDb.js';

// Mock the database module
let testDb;
let Account;

beforeAll(async () => {
  testDb = await setupTestDatabase();

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

beforeEach(async () => {
  // Clear all tables before each test
  clearTestData(testDb);
});

describe('Account Model', () => {
  describe('create', () => {
    it('should create a new account with all fields', async () => {
      const accountData = {
        name: 'Savings Account',
        type: 'bank',
        balance: 5000,
        currency: 'USD'
      };

      const account = await Account.create(accountData);

      expect(account).toBeDefined();
      expect(account.id).toBeDefined();
      expect(account.name).toBe(accountData.name);
      expect(account.type).toBe(accountData.type);
      expect(account.balance).toBe(accountData.balance);
      expect(account.currency).toBe(accountData.currency);
      expect(account.created_at).toBeDefined();
    });

    it('should create account with default balance and currency', async () => {
      const accountData = {
        name: 'Credit Card',
        type: 'credit_card'
      };

      const account = await Account.create(accountData);

      expect(account).toBeDefined();
      expect(account.balance).toBe(0);
      expect(account.currency).toBe('USD');
    });

    it('should support different currencies', async () => {
      const account = await Account.create({
        name: 'Euro Account',
        type: 'bank',
        balance: 1000,
        currency: 'EUR'
      });

      expect(account.currency).toBe('EUR');
    });

    it('should support CHF currency', async () => {
      const account = await Account.create({
        name: 'Swiss Account',
        type: 'bank',
        balance: 1000,
        currency: 'CHF'
      });

      expect(account.currency).toBe('CHF');
    });
  });

  describe('getAll', () => {
    it('should return empty array when no accounts exist', async () => {
      const accounts = await Account.getAll();
      expect(accounts).toEqual([]);
    });

    it('should return all accounts', async () => {
      Account.create({ name: 'Account 1', type: 'bank', balance: 100 });
      Account.create({ name: 'Account 2', type: 'credit_card', balance: 200 });

      const accounts = await Account.getAll();

      expect(accounts).toHaveLength(2);
      expect(accounts[1].name).toBe('Account 2'); // Most recent first
      expect(accounts[0].name).toBe('Account 1');
    });

    it('should return accounts ordered by created_at DESC', async () => {
      const account1 = await Account.create({ name: 'First', type: 'bank' });
      const account2 = await Account.create({ name: 'Second', type: 'bank' });
      const account3 = await Account.create({ name: 'Third', type: 'bank' });

      const accounts = await Account.getAll();

      expect(accounts[2].id).toBe(account3.id);
      expect(accounts[1].id).toBe(account2.id);
      expect(accounts[0].id).toBe(account1.id);
    });
  });

  describe('getById', () => {
    it('should return account by id', async () => {
      const created = await Account.create({ name: 'Test Account', type: 'bank', balance: 500 });

      const account = await Account.getById(created.id);

      expect(account).toBeDefined();
      expect(account.id).toBe(created.id);
      expect(account.name).toBe('Test Account');
      expect(account.balance).toBe(500);
    });

    it('should return undefined for non-existent id', async () => {
      const account = await Account.getById(999);
      expect(account).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should update account fields', async () => {
      const account = await Account.create({ name: 'Old Name', type: 'bank', balance: 100 });

      const updated = await Account.update(account.id, {
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
    it('should delete an account', async () => {
      const account = await Account.create({ name: 'To Delete', type: 'bank' });

      const result = await Account.delete(account.id);

      expect(result.changes).toBe(1);
      expect(await Account.getById(account.id)).toBeUndefined();
    });

    it('should return 0 changes for non-existent account', async () => {
      const result = await Account.delete(999);
      expect(result.changes).toBe(0);
    });
  });

  describe('updateBalance', () => {
    it('should increase account balance', async () => {
      const account = await Account.create({ name: 'Test', type: 'bank', balance: 100 });

      const updated = await Account.updateBalance(account.id, 50);

      expect(updated.balance).toBe(150);
    });

    it('should decrease account balance', async () => {
      const account = await Account.create({ name: 'Test', type: 'bank', balance: 100 });

      const updated = await Account.updateBalance(account.id, -30);

      expect(updated.balance).toBe(70);
    });

    it('should handle negative balances', async () => {
      const account = await Account.create({ name: 'Test', type: 'credit_card', balance: 0 });

      const updated = await Account.updateBalance(account.id, -500);

      expect(updated.balance).toBe(-500);
    });

    it('should handle decimal amounts', async () => {
      const account = await Account.create({ name: 'Test', type: 'bank', balance: 100.50 });

      const updated = await Account.updateBalance(account.id, 25.75);

      expect(updated.balance).toBeCloseTo(126.25, 2);
    });
  });
});
