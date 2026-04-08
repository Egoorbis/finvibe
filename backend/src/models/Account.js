import db from '../db/database.js';

const resolveUserId = (userId) => {
  if (userId !== undefined && userId !== null) return userId;
  if (process.env.NODE_ENV === 'test' && process.env.TEST_USER_ID) {
    return Number(process.env.TEST_USER_ID);
  }
  return userId;
};

export const Account = {
  // Get all accounts for a user
  async getAll(userId) {
    const scopedUserId = resolveUserId(userId);
    return await db.all('SELECT * FROM accounts WHERE user_id = $1 ORDER BY created_at DESC', [scopedUserId]);
  },

  // Get account by ID (with user check)
  async getById(id, userId) {
    const scopedUserId = resolveUserId(userId);
    return await db.get('SELECT * FROM accounts WHERE id = $1 AND user_id = $2', [id, scopedUserId]);
  },

  // Create new account
  async create(account, userId) {
    const scopedUserId = resolveUserId(userId);
    const { name, type, balance = 0, currency = 'USD' } = account;

    const result = await db.run(
      `INSERT INTO accounts (user_id, name, type, balance, currency)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [scopedUserId, name, type, balance, currency]
    );

    const id = result.lastInsertRowid || result.rows[0]?.id;
    return await this.getById(id, scopedUserId);
  },

  // Update account
  async update(id, account, userId) {
    const scopedUserId = resolveUserId(userId);
    const { name, type, balance, currency } = account;

    await db.run(
      `UPDATE accounts
       SET name = $1, type = $2, balance = $3, currency = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND user_id = $6`,
      [name, type, balance, currency, id, scopedUserId]
    );

    return await this.getById(id, scopedUserId);
  },

  // Delete account
  async delete(id, userId) {
    const scopedUserId = resolveUserId(userId);
    return await db.run('DELETE FROM accounts WHERE id = $1 AND user_id = $2', [id, scopedUserId]);
  },

  // Update account balance
  async updateBalance(id, amount, userId) {
    const scopedUserId = resolveUserId(userId);
    await db.run(
      `UPDATE accounts
       SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND user_id = $3`,
      [amount, id, scopedUserId]
    );

    return await this.getById(id, scopedUserId);
  }
};
