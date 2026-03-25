import db from '../db/database.js';

export const Category = {
  // Get all categories
  async getAll() {
    return await db.all('SELECT * FROM categories ORDER BY type, name');
  },

  // Get categories by type
  async getByType(type) {
    return await db.all('SELECT * FROM categories WHERE type = $1 ORDER BY name', [type]);
  },

  // Get category by ID
  async getById(id) {
    return await db.get('SELECT * FROM categories WHERE id = $1', [id]);
  },

  // Create new category
  async create(category) {
    const { name, type, color = null, icon = null } = category;

    const result = await db.run(
      `INSERT INTO categories (name, type, color, icon)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [name, type, color, icon]
    );

    const id = result.lastInsertRowid || result.rows[0]?.id;
    return await this.getById(id);
  },

  // Update category
  async update(id, category) {
    const { name, type, color, icon } = category;

    await db.run(
      `UPDATE categories
       SET name = $1, type = $2, color = $3, icon = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [name, type, color, icon, id]
    );

    return await this.getById(id);
  },

  // Delete category
  async delete(id) {
    return await db.run('DELETE FROM categories WHERE id = $1', [id]);
  }
};
