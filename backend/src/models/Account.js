import db from '../db/database.js';

export const Account = {
  // Get all accounts
  getAll() {
    return db.prepare('SELECT * FROM accounts ORDER BY created_at DESC').all();
  },

  // Get account by ID
  getById(id) {
    return db.prepare('SELECT * FROM accounts WHERE id = ?').get(id);
  },

  // Create new account
  create(account) {
    const { name, type, balance = 0, currency = 'USD' } = account;
    const result = db.prepare(`
      INSERT INTO accounts (name, type, balance, currency)
      VALUES (?, ?, ?, ?)
    `).run(name, type, balance, currency);

    return this.getById(result.lastInsertRowid);
  },

  // Update account
  update(id, account) {
    const { name, type, balance, currency } = account;
    db.prepare(`
      UPDATE accounts
      SET name = ?, type = ?, balance = ?, currency = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, type, balance, currency, id);

    return this.getById(id);
  },

  // Delete account
  delete(id) {
    return db.prepare('DELETE FROM accounts WHERE id = ?').run(id);
  },

  // Update account balance
  updateBalance(id, amount) {
    db.prepare(`
      UPDATE accounts
      SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(amount, id);

    return this.getById(id);
  }
};
