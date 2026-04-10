import { jest } from '@jest/globals';
import { setupTestDatabase, teardownTestDatabase, clearTestData } from '../utils/testDb.js';

let testDb;
let Category;

beforeAll(async () => {
  testDb = await setupTestDatabase();

  jest.unstable_mockModule('../../src/db/database.js', () => ({
    default: testDb
  }));

  const categoryModule = await import('../../src/models/Category.js');
  Category = categoryModule.Category;
});

afterAll(async () => {
  await teardownTestDatabase(testDb);
});

beforeEach(async () => {
  await clearTestData(testDb);
});

describe('Category Model', () => {
  describe('create', () => {
    it('should create expense category with all fields', async () => {
      const categoryData = {
        name: 'Food & Dining',
        type: 'expense',
        color: '#FF6B6B',
        icon: '🍽️'
      };

      const category = await Category.create(categoryData);

      expect(category).toBeDefined();
      expect(category.id).toBeDefined();
      expect(category.name).toBe(categoryData.name);
      expect(category.type).toBe(categoryData.type);
      expect(category.color).toBe(categoryData.color);
      expect(category.icon).toBe(categoryData.icon);
      expect(category.created_at).toBeDefined();
    });

    it('should create income category', async () => {
      const category = await Category.create({
        name: 'Salary',
        type: 'income',
        color: '#26DE81',
        icon: '💰'
      });

      expect(category.type).toBe('income');
      expect(category.name).toBe('Salary');
    });

    it('should create category with null color and icon', async () => {
      const category = await Category.create({
        name: 'Misc',
        type: 'expense'
      });

      expect(category.color).toBeNull();
      expect(category.icon).toBeNull();
    });

    it('should support various emoji icons', async () => {
      const emojis = ['🚗', '🏠', '⚡', '📱', '🎬'];

      emojis.forEach(async emoji => {
        const category = await Category.create({
          name: `Test ${emoji}`,
          type: 'expense',
          icon: emoji
        });
        expect(category.icon).toBe(emoji);
      });
    });
  });

  describe('getAll', () => {
    it('should return empty array when no categories exist', async () => {
      const categories = await Category.getAll();
      expect(categories).toEqual([]);
    });

    it('should return all categories', async () => {
      Category.create({ name: 'Food', type: 'expense', color: '#FF6B6B', icon: '🍽️' });
      Category.create({ name: 'Salary', type: 'income', color: '#26DE81', icon: '💰' });
      Category.create({ name: 'Transport', type: 'expense', color: '#4ECDC4', icon: '🚗' });

      const categories = await Category.getAll();

      expect(categories).toHaveLength(3);
    });

    it('should return categories ordered by type then name', async () => {
      Category.create({ name: 'Zebra', type: 'expense' });
      Category.create({ name: 'Alpha', type: 'income' });
      Category.create({ name: 'Beta', type: 'expense' });

      const categories = await Category.getAll();

      // Expenses come first (alphabetically), then income
      expect(categories[0].name).toBe('Beta');
      expect(categories[0].type).toBe('expense');
      expect(categories[1].name).toBe('Zebra');
      expect(categories[1].type).toBe('expense');
      expect(categories[2].name).toBe('Alpha');
      expect(categories[2].type).toBe('income');
    });
  });

  describe('getByType', () => {
    beforeEach(async () => {
      Category.create({ name: 'Food', type: 'expense' });
      Category.create({ name: 'Transport', type: 'expense' });
      Category.create({ name: 'Salary', type: 'income' });
      Category.create({ name: 'Bonus', type: 'income' });
    });

    it('should return only expense categories', async () => {
      const expenses = await Category.getByType('expense');

      expect(expenses).toHaveLength(2);
      expect(expenses.every(c => c.type === 'expense')).toBe(true);
    });

    it('should return only income categories', async () => {
      const income = await Category.getByType('income');

      expect(income).toHaveLength(2);
      expect(income.every(c => c.type === 'income')).toBe(true);
    });

    it('should return categories ordered by name', async () => {
      const expenses = await Category.getByType('expense');

      expect(expenses[0].name).toBe('Food');
      expect(expenses[1].name).toBe('Transport');
    });

    it('should return empty array for non-existent type', async () => {
      const categories = await Category.getByType('invalid');
      expect(categories).toEqual([]);
    });
  });

  describe('getById', () => {
    it('should return category by id', async () => {
      const created = await Category.create({
        name: 'Entertainment',
        type: 'expense',
        color: '#FFA07A',
        icon: '🎬'
      });

      const category = await Category.getById(created.id);

      expect(category).toBeDefined();
      expect(category.id).toBe(created.id);
      expect(category.name).toBe('Entertainment');
      expect(category.color).toBe('#FFA07A');
      expect(category.icon).toBe('🎬');
    });

    it('should return undefined for non-existent id', async () => {
      const category = await Category.getById(999);
      expect(category).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should update category fields', async () => {
      const category = await Category.create({
        name: 'Old Name',
        type: 'expense',
        color: '#FF0000',
        icon: '❌'
      });

      const updated = await Category.update(category.id, {
        name: 'New Name',
        type: 'income',
        color: '#00FF00',
        icon: '✅'
      });

      expect(updated.name).toBe('New Name');
      expect(updated.type).toBe('income');
      expect(updated.color).toBe('#00FF00');
      expect(updated.icon).toBe('✅');
    });

    it('should update only specific fields', async () => {
      const category = await Category.create({
        name: 'Shopping',
        type: 'expense',
        color: '#FF6B6B',
        icon: '🛒'
      });

      const updated = await Category.update(category.id, {
        name: 'Shopping Updated',
        type: 'expense',
        color: '#FF0000',
        icon: '🛒'
      });

      expect(updated.name).toBe('Shopping Updated');
      expect(updated.color).toBe('#FF0000');
      expect(updated.icon).toBe('🛒'); // Unchanged
    });
  });

  describe('delete', () => {
    it('should delete a category', async () => {
      const category = await Category.create({
        name: 'To Delete',
        type: 'expense'
      });

      const result = await Category.delete(category.id);

      expect(result.changes).toBe(1);
      expect(await Category.getById(category.id)).toBeUndefined();
    });

    it('should return 0 changes for non-existent category', async () => {
      const result = await Category.delete(999);
      expect(result.changes).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in name', async () => {
      const category = await Category.create({
        name: "Coffee & Tea's Shop",
        type: 'expense'
      });

      expect(category.name).toBe("Coffee & Tea's Shop");
    });

    it('should handle very long names', async () => {
      const longName = 'A'.repeat(255);
      const category = await Category.create({
        name: longName,
        type: 'expense'
      });

      expect(category.name).toBe(longName);
    });

    it('should handle hex color codes', async () => {
      const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'];

      colors.forEach(async color => {
        const category = await Category.create({
          name: `Color ${color}`,
          type: 'expense',
          color: color
        });
        expect(category.color).toBe(color);
      });
    });
  });
});
