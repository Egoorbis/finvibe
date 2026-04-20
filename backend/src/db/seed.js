import db from './database.js';
import { Category } from '../models/Category.js';

console.log('Seeding database with default categories...');

const defaultCategories = [
  { name: 'Food & Dining', type: 'expense', color: '#FF6B6B', icon: '🍽️', is_default: 1 },
  { name: 'Groceries', type: 'expense', color: '#4ECDC4', icon: '🛒', is_default: 1 },
  { name: 'Transportation', type: 'expense', color: '#45B7D1', icon: '🚗', is_default: 1 },
  { name: 'Shopping', type: 'expense', color: '#FFA07A', icon: '🛍️', is_default: 1 },
  { name: 'Entertainment', type: 'expense', color: '#98D8C8', icon: '🎬', is_default: 1 },
  { name: 'Bills & Utilities', type: 'expense', color: '#F7B731', icon: '📄', is_default: 1 },
  { name: 'Healthcare', type: 'expense', color: '#5F27CD', icon: '🏥', is_default: 1 },
  { name: 'Education', type: 'expense', color: '#00D2D3', icon: '📚', is_default: 1 },
  { name: 'Travel', type: 'expense', color: '#54A0FF', icon: '✈️', is_default: 1 },
  { name: 'Home & Garden', type: 'expense', color: '#48DBFB', icon: '🏡', is_default: 1 },
  { name: 'Insurance', type: 'expense', color: '#FF9FF3', icon: '🛡️', is_default: 1 },
  { name: 'Personal Care', type: 'expense', color: '#FFA502', icon: '💆', is_default: 1 },
  { name: 'Gifts & Donations', type: 'expense', color: '#FF6348', icon: '🎁', is_default: 1 },
  { name: 'Subscriptions', type: 'expense', color: '#2ED573', icon: '📱', is_default: 1 },
  { name: 'Other Expenses', type: 'expense', color: '#A4B0BE', icon: '💸', is_default: 1 },
  { name: 'Salary', type: 'income', color: '#26DE81', icon: '💰', is_default: 1 },
  { name: 'Freelance', type: 'income', color: '#20BF6B', icon: '💼', is_default: 1 },
  { name: 'Business', type: 'income', color: '#0FB9B1', icon: '🏢', is_default: 1 },
  { name: 'Investments', type: 'income', color: '#2BCBBA', icon: '📈', is_default: 1 },
  { name: 'Gifts Received', type: 'income', color: '#FD79A8', icon: '🎁', is_default: 1 },
  { name: 'Refunds', type: 'income', color: '#A29BFE', icon: '💵', is_default: 1 },
  { name: 'Other Income', type: 'income', color: '#6C5CE7', icon: '💳', is_default: 1 }
];

async function seedDatabase() {
  try {
    let seededCount = 0;
    let existingCount = 0;
    const expenseCategories = defaultCategories.filter(c => c.type === 'expense');
    const incomeCategories = defaultCategories.filter(c => c.type === 'income');

    for (const category of defaultCategories) {
      try {
        const existing = await db.get(
          `SELECT id
           FROM categories
           WHERE user_id IS NULL AND name = $1 AND type = $2
           LIMIT 1`,
          [category.name, category.type]
        );

        if (existing) {
          existingCount++;
          continue;
        }

        await Category.create(category);
        seededCount++;
      } catch (error) {
        if (error.message && error.message.includes('UNIQUE')) {
          existingCount++;
        } else {
          console.error('Error seeding category:', category.name, error.message);
        }
      }
    }

    if (seededCount > 0) {
      console.log('Successfully seeded', seededCount, 'new categories!');
      console.log('  -', expenseCategories.length, 'expense categories');
      console.log('  -', incomeCategories.length, 'income categories');
    }

    if (existingCount > 0) {
      console.log(existingCount, 'categories already exist, skipped.');
    }
  } catch (error) {
    console.error('Error during seeding:', error.message);
    process.exit(1);
  } finally {
    await db.close();
    process.exit(0);
  }
}

seedDatabase();
