import db from '../db/database.js';

export const Budget = {
  // Get all budgets
  getAll() {
    return db.prepare(`
      SELECT
        b.*,
        c.name as category_name,
        c.color as category_color,
        c.icon as category_icon
      FROM budgets b
      LEFT JOIN categories c ON b.category_id = c.id
      ORDER BY b.start_date DESC
    `).all();
  },

  // Get budget by ID
  getById(id) {
    return db.prepare(`
      SELECT
        b.*,
        c.name as category_name,
        c.color as category_color,
        c.icon as category_icon
      FROM budgets b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.id = ?
    `).get(id);
  },

  // Get active budgets for a date
  getActive(date = new Date().toISOString().split('T')[0]) {
    return db.prepare(`
      SELECT
        b.*,
        c.name as category_name,
        c.color as category_color,
        c.icon as category_icon
      FROM budgets b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE ? BETWEEN b.start_date AND b.end_date
      ORDER BY c.name
    `).all(date);
  },

  // Create new budget
  create(budget) {
    const { category_id, amount, period, start_date, end_date } = budget;
    const result = db.prepare(`
      INSERT INTO budgets (category_id, amount, period, start_date, end_date)
      VALUES (?, ?, ?, ?, ?)
    `).run(category_id, amount, period, start_date, end_date);

    return this.getById(result.lastInsertRowid);
  },

  // Update budget
  update(id, budget) {
    const { category_id, amount, period, start_date, end_date } = budget;
    db.prepare(`
      UPDATE budgets
      SET category_id = ?, amount = ?, period = ?, start_date = ?, end_date = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(category_id, amount, period, start_date, end_date, id);

    return this.getById(id);
  },

  // Delete budget
  delete(id) {
    return db.prepare('DELETE FROM budgets WHERE id = ?').run(id);
  },

  // Get budget progress (spent vs budget)
  getProgress(id) {
    const budget = this.getById(id);
    if (!budget) return null;

    const spent = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE category_id = ?
        AND type = 'expense'
        AND date BETWEEN ? AND ?
    `).get(budget.category_id, budget.start_date, budget.end_date);

    return {
      ...budget,
      spent: spent.total,
      remaining: budget.amount - spent.total,
      percentage: (spent.total / budget.amount) * 100
    };
  },

  // Get all budget progress for active budgets
  getAllProgress(date = new Date().toISOString().split('T')[0]) {
    const budgets = this.getActive(date);
    return budgets.map(budget => {
      const spent = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE category_id = ?
          AND type = 'expense'
          AND date BETWEEN ? AND ?
      `).get(budget.category_id, budget.start_date, budget.end_date);

      return {
        ...budget,
        spent: spent.total,
        remaining: budget.amount - spent.total,
        percentage: (spent.total / budget.amount) * 100
      };
    });
  }
};
