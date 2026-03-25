import db from './database.js';
import { Category } from '../models/Category.js';

console.log('Seeding database with default categories...');

const defaultCategories = [
  { name: 'Food & Dining', type: 'expense', color: '#FF6B6B', icon: '🍽️' },
  { name: 'Groceries', type: 'expense', color: '#4ECDC4', icon: '🛒' },
  { name: 'Transportation', type: 'expense', color: '#45B7D1', icon: '🚗' },
  { name: 'Shopping', type: 'expense', color: '#FFA07A', icon: '🛍️' },
  { name: 'Entertainment', type: 'expense', color: '#98D8C8', icon: '🎬' },
  { name: 'Bills & Utilities', type: 'expense', color: '#F7B731', icon: '📄' },
  { name: 'Healthcare', type: 'expense', color: '#5F27CD', icon: '🏥' },
  { name: 'Education', type: 'expense', color: '#00D2D3', icon: '📚' },
  { name: 'Travel', type: 'expense', color: '#54A0FF', icon: '✈️' },
  { name: 'Home & Garden', type: 'expense', color: '#48DBFB', icon: '🏡' },
  { name: 'Insurance', type: 'expense', color: '#FF9FF3', icon: '🛡️' },
  { name: 'Personal Care', type: 'expense', color: '#FFA502', icon: '💆' },
  { name: 'Gifts & Donations', type: 'expense', color: '#FF6348', icon: '🎁' },
  { name: 'Subscriptions', type: 'expense', color: '#2ED573', icon: '📱' },
  { name: 'Other Expenses', type: 'expense', color: '#A4B0BE', icon: '💸' },
  { name: 'Salary', type: 'income', color: '#26DE81', icon: '💰' },
  { name: 'Freelance', type: 'income', color: '#20BF6B', icon: '💼' },
  { name: 'Business', type: 'income', color: '#0FB9B1', icon: '🏢' },
  { name: 'Investments', type: 'income', color: '#2BCBBA', icon: '📈' },
  { name: 'Gifts Received', type: 'income', color: '#FD79A8', icon: '🎁' },
  { name: 'Refunds', type: 'income', color: '#A29BFE', icon: '💵' },
  { name: 'Other Income', type: 'income', color: '#6C5CE7', icon: '💳' }
];

async function seedDatabase() {
  try {
    let seededCount = 0;
    let existingCount = 0;
    const expenseCategories = defaultCategories.filter(c => c.type === 'expense');
    const incomeCategories = defaultCategories.filter(c => c.type === 'income');

    for (const category of defaultCategories) {
      try {
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
