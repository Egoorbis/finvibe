import { jest } from '@jest/globals';
import request from 'supertest';
import { setupTestDatabase, teardownTestDatabase, clearTestData } from '../utils/testDb.js';

let testDb;
let app;
let Account;

beforeAll(async () => {
  testDb = setupTestDatabase();

  jest.unstable_mockModule('../../src/db/database.js', () => ({
    default: testDb
  }));

  const accountModule = await import('../../src/models/Account.js');
  Account = accountModule.Account;

  const appModule = await import('../../src/index.js');
  app = appModule.default;
});

afterAll(() => {
  teardownTestDatabase(testDb);
});

beforeEach(async () => {
  clearTestData(testDb);
});

describe('Account Controller', () => {
  describe('GET /api/accounts', () => {
    it('should return empty array when no accounts exist', async () => {
      const response = await request(app).get('/api/accounts');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return all accounts', async () => {
      Account.create({ name: 'Account 1', type: 'bank', balance: 100 });
      Account.create({ name: 'Account 2', type: 'credit_card', balance: 200 });

      const response = await request(app).get('/api/accounts');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });
  });

  describe('GET /api/accounts/:id', () => {
    it('should return account by id', async () => {
      const account = Account.create({ name: 'Test Account', type: 'bank', balance: 500 });

      const response = await request(app).get(`/api/accounts/${account.id}`);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Test Account');
      expect(response.body.balance).toBe(500);
    });

    it('should return 404 for non-existent account', async () => {
      const response = await request(app).get('/api/accounts/999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Account not found');
    });
  });

  describe('POST /api/accounts', () => {
    it('should create a new account', async () => {
      const accountData = {
        name: 'New Account',
        type: 'bank',
        balance: 1000,
        currency: 'USD'
      };

      const response = await request(app)
        .post('/api/accounts')
        .send(accountData);

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('New Account');
      expect(response.body.balance).toBe(1000);
    });

    it('should return 400 for invalid data', async () => {
      const response = await request(app)
        .post('/api/accounts')
        .send({ name: 'Test' }); // Missing required type field

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/accounts/:id', () => {
    it('should update an existing account', async () => {
      const account = Account.create({ name: 'Old Name', type: 'bank' });

      const response = await request(app)
        .put(`/api/accounts/${account.id}`)
        .send({
          name: 'New Name',
          type: 'credit_card',
          balance: 500,
          currency: 'EUR'
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('New Name');
      expect(response.body.type).toBe('credit_card');
    });

    it('should return 404 for non-existent account', async () => {
      const response = await request(app)
        .put('/api/accounts/999')
        .send({ name: 'Test', type: 'bank', balance: 0, currency: 'USD' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/accounts/:id', () => {
    it('should delete an account', async () => {
      const account = Account.create({ name: 'To Delete', type: 'bank' });

      const response = await request(app).delete(`/api/accounts/${account.id}`);

      expect(response.status).toBe(204);

      const checkResponse = await request(app).get(`/api/accounts/${account.id}`);
      expect(checkResponse.status).toBe(404);
    });

    it('should return 404 for non-existent account', async () => {
      const response = await request(app).delete('/api/accounts/999');

      expect(response.status).toBe(404);
    });
  });
});
