import db from '../db/database.js';

const resolveUserId = (userId) => {
  if (userId !== undefined && userId !== null) return userId;
  if (process.env.NODE_ENV === 'test' && process.env.TEST_USER_ID) {
    return Number(process.env.TEST_USER_ID);
  }
  return userId;
};

export const Transaction = {
  // Get all transactions with account and category details
  async getAll(userId, filters = {}) {
    const scopedUserId = resolveUserId(userId);
    let query = `
      SELECT
        t.*,
        a.name as account_name,
        a.type as account_type,
        c.name as category_name,
        c.color as category_color,
        c.icon as category_icon
      FROM transactions t
      LEFT JOIN accounts a ON t.account_id = a.id
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1
    `;

    const params = [scopedUserId];
    let paramIndex = 2;

    if (filters.type) {
      query += ` AND t.type = $${paramIndex}`;
      params.push(filters.type);
      paramIndex++;
    }

    if (filters.account_id) {
      query += ` AND t.account_id = $${paramIndex}`;
      params.push(filters.account_id);
      paramIndex++;
    }

    if (filters.category_id) {
      query += ` AND t.category_id = $${paramIndex}`;
      params.push(filters.category_id);
      paramIndex++;
    }

    if (filters.start_date) {
      query += ` AND t.date >= $${paramIndex}`;
      params.push(filters.start_date);
      paramIndex++;
    }

    if (filters.end_date) {
      query += ` AND t.date <= $${paramIndex}`;
      params.push(filters.end_date);
      paramIndex++;
    }

    query += ' ORDER BY t.date DESC, t.created_at DESC';

    if (filters.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
    }

    return await db.all(query, params);
  },

  // Get transaction by ID (with user check)
  async getById(id, userId) {
    const scopedUserId = resolveUserId(userId);
    return await db.get(`
      SELECT
        t.*,
        a.name as account_name,
        a.type as account_type,
        c.name as category_name,
        c.color as category_color,
        c.icon as category_icon
      FROM transactions t
      LEFT JOIN accounts a ON t.account_id = a.id
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.id = $1 AND t.user_id = $2
    `, [id, scopedUserId]);
  },

  // Create new transaction
  async create(transaction, userId) {
    const scopedUserId = resolveUserId(userId);
    const {
      date,
      amount,
      type,
      description = null,
      account_id,
      category_id,
      tags = null,
      attachment_path = null
    } = transaction;

    const result = await db.run(
      `INSERT INTO transactions (user_id, date, amount, type, description, account_id, category_id, tags, attachment_path)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [scopedUserId, date, amount, type, description, account_id, category_id, tags, attachment_path]
    );

    // Update account balance
    const balanceChange = type === 'income' ? amount : -amount;
    await db.run(
      `UPDATE accounts
       SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND user_id = $3`,
      [balanceChange, account_id, scopedUserId]
    );

    const id = result.lastInsertRowid || result.rows[0]?.id;
    return await this.getById(id, scopedUserId);
  },

  // Update transaction
  async update(id, transaction, userId) {
    const scopedUserId = resolveUserId(userId);
    const oldTransaction = await this.getById(id, scopedUserId);
    if (!oldTransaction) return null;

    const {
      date,
      amount,
      type,
      description,
      account_id,
      category_id,
      tags,
      attachment_path
    } = transaction;

    // Revert old balance change
    const oldBalanceChange = oldTransaction.type === 'income' ? -oldTransaction.amount : oldTransaction.amount;
    await db.run(
      `UPDATE accounts
       SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND user_id = $3`,
      [oldBalanceChange, oldTransaction.account_id, scopedUserId]
    );

    // Apply new balance change
    const newBalanceChange = type === 'income' ? amount : -amount;
    await db.run(
      `UPDATE accounts
       SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND user_id = $3`,
      [newBalanceChange, account_id, scopedUserId]
    );

    // Update transaction
    await db.run(
      `UPDATE transactions
       SET date = $1, amount = $2, type = $3, description = $4, account_id = $5,
           category_id = $6, tags = $7, attachment_path = $8, updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 AND user_id = $10`,
      [date, amount, type, description, account_id, category_id, tags, attachment_path, id, scopedUserId]
    );

    return await this.getById(id, scopedUserId);
  },

  // Delete transaction
  async delete(id, userId) {
    const scopedUserId = resolveUserId(userId);
    const transaction = await this.getById(id, scopedUserId);
    if (!transaction) return null;

    // Revert balance change
    const balanceChange = transaction.type === 'income' ? -transaction.amount : transaction.amount;
    await db.run(
      `UPDATE accounts
       SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND user_id = $3`,
      [balanceChange, transaction.account_id, scopedUserId]
    );

    return await db.run('DELETE FROM transactions WHERE id = $1 AND user_id = $2', [id, scopedUserId]);
  },

  // Get summary statistics
  async getSummary(userId, filters = {}) {
    const scopedUserId = resolveUserId(userId);
    let query = `
      SELECT
        type,
        COUNT(*) as count,
        SUM(amount) as total,
        AVG(amount) as average
      FROM transactions
      WHERE user_id = $1
    `;

    const params = [scopedUserId];
    let paramIndex = 2;

    if (filters.start_date) {
      query += ` AND date >= $${paramIndex}`;
      params.push(filters.start_date);
      paramIndex++;
    }

    if (filters.end_date) {
      query += ` AND date <= $${paramIndex}`;
      params.push(filters.end_date);
    }

    query += ' GROUP BY type';

    return await db.all(query, params);
  },

  // Get spending by category
  async getByCategory(userId, filters = {}) {
    const scopedUserId = resolveUserId(userId);
    let query = `
      SELECT
        c.id,
        c.name,
        c.color,
        c.icon,
        t.type,
        COUNT(*) as count,
        SUM(t.amount) as total
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1
    `;

    const params = [scopedUserId];
    let paramIndex = 2;

    if (filters.type) {
      query += ` AND t.type = $${paramIndex}`;
      params.push(filters.type);
      paramIndex++;
    }

    if (filters.start_date) {
      query += ` AND t.date >= $${paramIndex}`;
      params.push(filters.start_date);
      paramIndex++;
    }

    if (filters.end_date) {
      query += ` AND t.date <= $${paramIndex}`;
      params.push(filters.end_date);
    }

    query += ' GROUP BY c.id, c.name, c.color, c.icon, t.type ORDER BY total DESC';

    return await db.all(query, params);
  }
};
