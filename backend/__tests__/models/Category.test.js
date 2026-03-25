import { jest } from '@jest/globals';
import { setupTestDatabase, teardownTestDatabase } from '../utils/testDb.js';

let testDb;
let Category;

beforeAll(async () => {
  testDb = setupTestDatabase();

  jest.unstable_mockModule('../../src/db/database.js', () => ({
    default: testDb
  }));

  const categoryModule = await import('../../src/models/Category.js');
  Category = categoryModule.Category;
});

afterAll(() => {
  teardownTestDatabase(testDb);
});

beforeEach(() => {
  testDb.exec('DELETE FROM transactions');
  testDb.exec('DELETE FROM budgets');
  testDb.exec('DELETE FROM categories');
});

describe('Category Model', () => {
  describe('create', () => {
    it('should create expense category with all fields', () => {
      const categoryData = {
        name: 'Food & Dining',
        type: 'expense',
        color: '#FF6B6B',
        icon: '🍽️'
      };

      const category = Category.create(categoryData);

      expect(category).toBeDefined();
      expect(category.id).toBeDefined();
      expect(category.name).toBe(categoryData.name);
      expect(category.type).toBe(categoryData.type);
      expect(category.color).toBe(categoryData.color);
      expect(category.icon).toBe(categoryData.icon);
      expect(category.created_at).toBeDefined();
    });

    it('should create income category', () => {
      const category = Category.create({
        name: 'Salary',
        type: 'income',
        color: '#26DE81',
        icon: '💰'
      });

      expect(category.type).toBe('income');
      expect(category.name).toBe('Salary');
    });

    it('should create category with null color and icon', () => {
      const category = Category.create({
        name: 'Misc',
        type: 'expense'
      });

      expect(category.color).toBeNull();
      expect(category.icon).toBeNull();
    });

    it('should support various emoji icons', () => {
      const emojis = ['🚗', '🏠', '⚡', '📱', '🎬'];

      emojis.forEach(emoji => {
        const category = Category.create({
          name: `Test ${emoji}`,
          type: 'expense',
          icon: emoji
        });
        expect(category.icon).toBe(emoji);
      });
    });
  });

  describe('getAll', () => {
    it('should return empty array when no categories exist', () => {
      const categories = Category.getAll();
      expect(categories).toEqual([]);
    });

    it('should return all categories', () => {
      Category.create({ name: 'Food', type: 'expense', color: '#FF6B6B', icon: '🍽️' });
      Category.create({ name: 'Salary', type: 'income', color: '#26DE81', icon: '💰' });
      Category.create({ name: 'Transport', type: 'expense', color: '#4ECDC4', icon: '🚗' });

      const categories = Category.getAll();

      expect(categories).toHaveLength(3);
    });

    it('should return categories ordered by type then name', () => {
      Category.create({ name: 'Zebra', type: 'expense' });
      Category.create({ name: 'Alpha', type: 'income' });
      Category.create({ name: 'Beta', type: 'expense' });

      const categories = Category.getAll();

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
    beforeEach(() => {
      Category.create({ name: 'Food', type: 'expense' });
      Category.create({ name: 'Transport', type: 'expense' });
      Category.create({ name: 'Salary', type: 'income' });
      Category.create({ name: 'Bonus', type: 'income' });
    });

    it('should return only expense categories', () => {
      const expenses = Category.getByType('expense');

      expect(expenses).toHaveLength(2);
      expect(expenses.every(c => c.type === 'expense')).toBe(true);
    });

    it('should return only income categories', () => {
      const income = Category.getByType('income');

      expect(income).toHaveLength(2);
      expect(income.every(c => c.type === 'income')).toBe(true);
    });

    it('should return categories ordered by name', () => {
      const expenses = Category.getByType('expense');

      expect(expenses[0].name).toBe('Food');
      expect(expenses[1].name).toBe('Transport');
    });

    it('should return empty array for non-existent type', () => {
      const categories = Category.getByType('invalid');
      expect(categories).toEqual([]);
    });
  });

  describe('getById', () => {
    it('should return category by id', () => {
      const created = Category.create({
        name: 'Entertainment',
        type: 'expense',
        color: '#FFA07A',
        icon: '🎬'
      });

      const category = Category.getById(created.id);

      expect(category).toBeDefined();
      expect(category.id).toBe(created.id);
      expect(category.name).toBe('Entertainment');
      expect(category.color).toBe('#FFA07A');
      expect(category.icon).toBe('🎬');
    });

    it('should return undefined for non-existent id', () => {
      const category = Category.getById(999);
      expect(category).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should update category fields', () => {
      const category = Category.create({
        name: 'Old Name',
        type: 'expense',
        color: '#FF0000',
        icon: '❌'
      });

      const updated = Category.update(category.id, {
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

    it('should update only specific fields', () => {
      const category = Category.create({
        name: 'Shopping',
        type: 'expense',
        color: '#FF6B6B',
        icon: '🛒'
      });

      const updated = Category.update(category.id, {
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
    it('should delete a category', () => {
      const category = Category.create({
        name: 'To Delete',
        type: 'expense'
      });

      const result = Category.delete(category.id);

      expect(result.changes).toBe(1);
      expect(Category.getById(category.id)).toBeUndefined();
    });

    it('should return 0 changes for non-existent category', () => {
      const result = Category.delete(999);
      expect(result.changes).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in name', () => {
      const category = Category.create({
        name: "Coffee & Tea's Shop",
        type: 'expense'
      });

      expect(category.name).toBe("Coffee & Tea's Shop");
    });

    it('should handle very long names', () => {
      const longName = 'A'.repeat(255);
      const category = Category.create({
        name: longName,
        type: 'expense'
      });

      expect(category.name).toBe(longName);
    });

    it('should handle hex color codes', () => {
      const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'];

      colors.forEach(color => {
        const category = Category.create({
          name: `Color ${color}`,
          type: 'expense',
          color: color
        });
        expect(category.color).toBe(color);
      });
    });
  });
});
