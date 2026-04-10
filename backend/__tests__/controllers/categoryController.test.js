import { jest } from '@jest/globals';
import request from 'supertest';
import { setupTestDatabase, teardownTestDatabase, clearTestData } from '../utils/testDb.js';

let testDb;
let app;
let Category;

beforeAll(async () => {
  testDb = await setupTestDatabase();

  jest.unstable_mockModule('../../src/db/database.js', () => ({
    default: testDb
  }));

  const categoryModule = await import('../../src/models/Category.js');
  Category = categoryModule.Category;

  const appModule = await import('../../src/index.js');
  app = appModule.default;
});

afterAll(async () => {
  await teardownTestDatabase(testDb);
});

beforeEach(async () => {
  await clearTestData(testDb);
});

describe('Category Controller', () => {
  describe('GET /api/categories', () => {
    it('should return empty array when no categories exist', async () => {
      const response = await request(app).get('/api/categories');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return all categories', async () => {
      Category.create({ name: 'Food', type: 'expense', color: '#FF6B6B', icon: '🍽️' });
      Category.create({ name: 'Salary', type: 'income', color: '#26DE81', icon: '💰' });

      const response = await request(app).get('/api/categories');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });

    it('should filter categories by type', async () => {
      Category.create({ name: 'Food', type: 'expense', color: '#FF6B6B', icon: '🍽️' });
      Category.create({ name: 'Salary', type: 'income', color: '#26DE81', icon: '💰' });

      const response = await request(app).get('/api/categories?type=expense');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].type).toBe('expense');
    });
  });

  describe('GET /api/categories/:id', () => {
    it('should return category by id', async () => {
      const category = await Category.create({
        name: 'Transport',
        type: 'expense',
        color: '#4ECDC4',
        icon: '🚗'
      });

      const response = await request(app).get(`/api/categories/${category.id}`);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Transport');
      expect(response.body.icon).toBe('🚗');
    });

    it('should return 404 for non-existent category', async () => {
      const response = await request(app).get('/api/categories/999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Category not found');
    });
  });

  describe('POST /api/categories', () => {
    it('should create a new category', async () => {
      const categoryData = {
        name: 'Shopping',
        type: 'expense',
        color: '#FF6B9D',
        icon: '🛍️'
      };

      const response = await request(app)
        .post('/api/categories')
        .send(categoryData);

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Shopping');
      expect(response.body.icon).toBe('🛍️');
    });

    it('should return 400 for invalid data', async () => {
      const response = await request(app)
        .post('/api/categories')
        .send({ name: 'Test' }); // Missing required type field

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/categories/:id', () => {
    it('should update an existing category', async () => {
      const category = await Category.create({
        name: 'Old Name',
        type: 'expense',
        color: '#FF0000',
        icon: '❓'
      });

      const response = await request(app)
        .put(`/api/categories/${category.id}`)
        .send({
          name: 'New Name',
          type: 'income',
          color: '#00FF00',
          icon: '✅'
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('New Name');
      expect(response.body.type).toBe('income');
      expect(response.body.icon).toBe('✅');
    });

    it('should return 404 for non-existent category', async () => {
      const response = await request(app)
        .put('/api/categories/999')
        .send({ name: 'Test', type: 'expense', color: '#FF0000', icon: '❓' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/categories/:id', () => {
    it('should delete a category', async () => {
      const category = await Category.create({
        name: 'To Delete',
        type: 'expense',
        color: '#FF0000',
        icon: '🗑️'
      });

      const response = await request(app).delete(`/api/categories/${category.id}`);

      expect(response.status).toBe(204);

      const checkResponse = await request(app).get(`/api/categories/${category.id}`);
      expect(checkResponse.status).toBe(404);
    });

    it('should return 404 for non-existent category', async () => {
      const response = await request(app).delete('/api/categories/999');

      expect(response.status).toBe(404);
    });
  });
});
