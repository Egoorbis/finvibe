import db from '../db/database.js';

export const Budget = {
  // Get all budgets
  async getAll() {
    return await db.all(`
      SELECT
        b.*,
        c.name as category_name,
        c.color as category_color,
        c.icon as category_icon
      FROM budgets b
      LEFT JOIN categories c ON b.category_id = c.id
      ORDER BY b.start_date DESC
    `);
  },

  // Get budget by ID
  async getById(id) {
    return await db.get(`
      SELECT
        b.*,
        c.name as category_name,
        c.color as category_color,
        c.icon as category_icon
      FROM budgets b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.id = $1
    `, [id]);
  },

  // Get active budgets for a date
  async getActive(date = new Date().toISOString().split('T')[0]) {
    return await db.all(`
      SELECT
        b.*,
        c.name as category_name,
        c.color as category_color,
        c.icon as category_icon
      FROM budgets b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE $1 BETWEEN b.start_date AND b.end_date
      ORDER BY c.name
    `, [date]);
  },

  // Create new budget
  async create(budget) {
    const { category_id, amount, period, start_date, end_date } = budget;

    const result = await db.run(
      `INSERT INTO budgets (category_id, amount, period, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [category_id, amount, period, start_date, end_date]
    );

    const id = result.lastInsertRowid || result.rows[0]?.id;
    return await this.getById(id);
  },

  // Update budget
  async update(id, budget) {
    const { category_id, amount, period, start_date, end_date } = budget;

    await db.run(
      `UPDATE budgets
       SET category_id = $1, amount = $2, period = $3, start_date = $4, end_date = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6`,
      [category_id, amount, period, start_date, end_date, id]
    );

    return await this.getById(id);
  },

  // Delete budget
  async delete(id) {
    return await db.run('DELETE FROM budgets WHERE id = $1', [id]);
  },

  // Get budget progress (spent vs budget)
  async getProgress(id) {
    const budget = await this.getById(id);
    if (!budget) return null;

    const spent = await db.get(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE category_id = $1
        AND type = 'expense'
        AND date BETWEEN $2 AND $3
    `, [budget.category_id, budget.start_date, budget.end_date]);

    return {
      ...budget,
      spent: spent.total,
      remaining: budget.amount - spent.total,
      percentage: (spent.total / budget.amount) * 100
    };
  },

  // Get all budget progress for active budgets
  async getAllProgress(date = new Date().toISOString().split('T')[0]) {
    const budgets = await this.getActive(date);

    const progressPromises = budgets.map(async (budget) => {
      const spent = await db.get(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE category_id = $1
          AND type = 'expense'
          AND date BETWEEN $2 AND $3
      `, [budget.category_id, budget.start_date, budget.end_date]);

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
