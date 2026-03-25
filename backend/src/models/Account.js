import db from '../db/database.js';

export const Account = {
  // Get all accounts
  async getAll() {
    return await db.all('SELECT * FROM accounts ORDER BY created_at DESC');
  },

  // Get account by ID
  async getById(id) {
    return await db.get('SELECT * FROM accounts WHERE id = $1', [id]);
  },

  // Create new account
  async create(account) {
    const { name, type, balance = 0, currency = 'USD' } = account;

    const result = await db.run(
      `INSERT INTO accounts (name, type, balance, currency)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [name, type, balance, currency]
    );

    const id = result.lastInsertRowid || result.rows[0]?.id;
    return await this.getById(id);
  },

  // Update account
  async update(id, account) {
    const { name, type, balance, currency } = account;

    await db.run(
      `UPDATE accounts
       SET name = $1, type = $2, balance = $3, currency = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [name, type, balance, currency, id]
    );

    return await this.getById(id);
  },

  // Delete account
  async delete(id) {
    return await db.run('DELETE FROM accounts WHERE id = $1', [id]);
  },

  // Update account balance
  async updateBalance(id, amount) {
    await db.run(
      `UPDATE accounts
       SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [amount, id]
    );

    return await this.getById(id);
  }
};
