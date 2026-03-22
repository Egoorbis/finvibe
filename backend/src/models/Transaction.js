import db from '../db/database.js';

export const Transaction = {
  // Get all transactions with account and category details
  getAll(filters = {}) {
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
      WHERE 1=1
    `;

    const params = [];

    if (filters.type) {
      query += ' AND t.type = ?';
      params.push(filters.type);
    }

    if (filters.account_id) {
      query += ' AND t.account_id = ?';
      params.push(filters.account_id);
    }

    if (filters.category_id) {
      query += ' AND t.category_id = ?';
      params.push(filters.category_id);
    }

    if (filters.start_date) {
      query += ' AND t.date >= ?';
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      query += ' AND t.date <= ?';
      params.push(filters.end_date);
    }

    query += ' ORDER BY t.date DESC, t.created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    return db.prepare(query).all(...params);
  },

  // Get transaction by ID
  getById(id) {
    return db.prepare(`
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
      WHERE t.id = ?
    `).get(id);
  },

  // Create new transaction
  create(transaction) {
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

    const result = db.prepare(`
      INSERT INTO transactions (date, amount, type, description, account_id, category_id, tags, attachment_path)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(date, amount, type, description, account_id, category_id, tags, attachment_path);

    // Update account balance
    const balanceChange = type === 'income' ? amount : -amount;
    db.prepare(`
      UPDATE accounts
      SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(balanceChange, account_id);

    return this.getById(result.lastInsertRowid);
  },

  // Update transaction
  update(id, transaction) {
    const oldTransaction = this.getById(id);
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
    db.prepare(`
      UPDATE accounts
      SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(oldBalanceChange, oldTransaction.account_id);

    // Apply new balance change
    const newBalanceChange = type === 'income' ? amount : -amount;
    db.prepare(`
      UPDATE accounts
      SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newBalanceChange, account_id);

    // Update transaction
    db.prepare(`
      UPDATE transactions
      SET date = ?, amount = ?, type = ?, description = ?, account_id = ?,
          category_id = ?, tags = ?, attachment_path = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(date, amount, type, description, account_id, category_id, tags, attachment_path, id);

    return this.getById(id);
  },

  // Delete transaction
  delete(id) {
    const transaction = this.getById(id);
    if (!transaction) return null;

    // Revert balance change
    const balanceChange = transaction.type === 'income' ? -transaction.amount : transaction.amount;
    db.prepare(`
      UPDATE accounts
      SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(balanceChange, transaction.account_id);

    return db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
  },

  // Get summary statistics
  getSummary(filters = {}) {
    let query = `
      SELECT
        type,
        COUNT(*) as count,
        SUM(amount) as total,
        AVG(amount) as average
      FROM transactions
      WHERE 1=1
    `;

    const params = [];

    if (filters.start_date) {
      query += ' AND date >= ?';
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      query += ' AND date <= ?';
      params.push(filters.end_date);
    }

    query += ' GROUP BY type';

    return db.prepare(query).all(...params);
  },

  // Get spending by category
  getByCategory(filters = {}) {
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
      WHERE 1=1
    `;

    const params = [];

    if (filters.type) {
      query += ' AND t.type = ?';
      params.push(filters.type);
    }

    if (filters.start_date) {
      query += ' AND t.date >= ?';
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      query += ' AND t.date <= ?';
      params.push(filters.end_date);
    }

    query += ' GROUP BY c.id, c.name, c.color, c.icon, t.type ORDER BY total DESC';

    return db.prepare(query).all(...params);
  }
};
