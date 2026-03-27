import db from '../db/database.js';

export const Category = {
  // Get all categories for a user (includes default categories)
  async getAll(userId) {
    return await db.all(
      'SELECT * FROM categories WHERE user_id = $1 OR user_id IS NULL ORDER BY type, name',
      [userId]
    );
  },

  // Get categories by type for a user
  async getByType(type, userId) {
    return await db.all(
      'SELECT * FROM categories WHERE (user_id = $1 OR user_id IS NULL) AND type = $2 ORDER BY name',
      [userId, type]
    );
  },

  // Get category by ID (with user check)
  async getById(id, userId) {
    return await db.get(
      'SELECT * FROM categories WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)',
      [id, userId]
    );
  },

  // Create new category
  async create(category, userId = null) {
    const { name, type, color = null, icon = null, is_default = 0 } = category;

    const result = await db.run(
      `INSERT INTO categories (user_id, name, type, color, icon, is_default)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [userId, name, type, color, icon, is_default]
    );

    const id = result.lastInsertRowid || result.rows[0]?.id;
    return await this.getById(id, userId);
  },

  // Update category (only if owned by user)
  async update(id, category, userId) {
    const { name, type, color, icon } = category;

    await db.run(
      `UPDATE categories
       SET name = $1, type = $2, color = $3, icon = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND user_id = $6`,
      [name, type, color, icon, id, userId]
    );

    return await this.getById(id, userId);
  },

  // Delete category (only if owned by user, not default)
  async delete(id, userId) {
    return await db.run(
      'DELETE FROM categories WHERE id = $1 AND user_id = $2 AND is_default = 0',
      [id, userId]
    );
  }
};
