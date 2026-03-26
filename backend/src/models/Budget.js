import db from '../db/database.js';

export const Budget = {
  // Get all budgets for a user
  async getAll(userId) {
    return await db.all(`
      SELECT
        b.*,
        c.name as category_name,
        c.color as category_color,
        c.icon as category_icon
      FROM budgets b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.user_id = $1
      ORDER BY b.start_date DESC
    `, [userId]);
  },

  // Get budget by ID (with user check)
  async getById(id, userId) {
    return await db.get(`
      SELECT
        b.*,
        c.name as category_name,
        c.color as category_color,
        c.icon as category_icon
      FROM budgets b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.id = $1 AND b.user_id = $2
    `, [id, userId]);
  },

  // Get active budgets for a date
  async getActive(userId, date = new Date().toISOString().split('T')[0]) {
    return await db.all(`
      SELECT
        b.*,
        c.name as category_name,
        c.color as category_color,
        c.icon as category_icon
      FROM budgets b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.user_id = $1 AND $2 BETWEEN b.start_date AND b.end_date
      ORDER BY c.name
    `, [userId, date]);
  },

  // Create new budget
  async create(budget, userId) {
    const { category_id, amount, period, start_date, end_date } = budget;

    const result = await db.run(
      `INSERT INTO budgets (user_id, category_id, amount, period, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [userId, category_id, amount, period, start_date, end_date]
    );

    const id = result.lastInsertRowid || result.rows[0]?.id;
    return await this.getById(id, userId);
  },

  // Update budget
  async update(id, budget, userId) {
    const { category_id, amount, period, start_date, end_date } = budget;

    await db.run(
      `UPDATE budgets
       SET category_id = $1, amount = $2, period = $3, start_date = $4, end_date = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND user_id = $7`,
      [category_id, amount, period, start_date, end_date, id, userId]
    );

    return await this.getById(id, userId);
  },

  // Delete budget
  async delete(id, userId) {
    return await db.run('DELETE FROM budgets WHERE id = $1 AND user_id = $2', [id, userId]);
  },

  // Get budget progress (spent vs budget)
  async getProgress(id, userId) {
    const budget = await this.getById(id, userId);
    if (!budget) return null;

    const spent = await db.get(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE user_id = $1
        AND category_id = $2
        AND type = 'expense'
        AND date BETWEEN $3 AND $4
    `, [userId, budget.category_id, budget.start_date, budget.end_date]);

    return {
      ...budget,
      spent: spent.total,
      remaining: budget.amount - spent.total,
      percentage: (spent.total / budget.amount) * 100
    };
  },

  // Get all budget progress for active budgets
  async getAllProgress(userId, date = new Date().toISOString().split('T')[0]) {
    const budgets = await this.getActive(userId, date);

    const progressPromises = budgets.map(async (budget) => {
      const spent = await db.get(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE user_id = $1
          AND category_id = $2
          AND type = 'expense'
          AND date BETWEEN $3 AND $4
      `, [userId, budget.category_id, budget.start_date, budget.end_date]);

      return {
        ...budget,
        spent: spent.total,
        remaining: budget.amount - spent.total,
        percentage: (spent.total / budget.amount) * 100
      };
    });

    return await Promise.all(progressPromises);
  }
};
