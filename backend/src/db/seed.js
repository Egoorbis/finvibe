import db from './database.js';

console.log('Seeding database with default categories...');

const defaultCategories = [
  // Expense categories
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

  // Income categories
  { name: 'Salary', type: 'income', color: '#26DE81', icon: '💰' },
  { name: 'Freelance', type: 'income', color: '#20BF6B', icon: '💼' },
  { name: 'Business', type: 'income', color: '#0FB9B1', icon: '🏢' },
  { name: 'Investments', type: 'income', color: '#2BCBBA', icon: '📈' },
  { name: 'Gifts Received', type: 'income', color: '#FD79A8', icon: '🎁' },
  { name: 'Refunds', type: 'income', color: '#A29BFE', icon: '💵' },
  { name: 'Other Income', type: 'income', color: '#6C5CE7', icon: '💳' }
];

const insert = db.prepare(`
  INSERT INTO categories (name, type, color, icon)
  VALUES (?, ?, ?, ?)
`);

const insertMany = db.transaction((categories) => {
  for (const category of categories) {
    insert.run(category.name, category.type, category.color, category.icon);
  }
});

try {
  insertMany(defaultCategories);
  console.log(`✅ Successfully seeded ${defaultCategories.length} default categories!`);
  console.log(`   - ${defaultCategories.filter(c => c.type === 'expense').length} expense categories`);
  console.log(`   - ${defaultCategories.filter(c => c.type === 'income').length} income categories`);
} catch (error) {
  if (error.message.includes('UNIQUE constraint')) {
    console.log('ℹ️  Categories already exist, skipping seed.');
  } else {
    console.error('❌ Error seeding categories:', error.message);
  }
}

db.close();
