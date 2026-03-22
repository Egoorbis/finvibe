import db from '../db/database.js';

export const Category = {
  // Get all categories
  getAll() {
    return db.prepare('SELECT * FROM categories ORDER BY type, name').all();
  },

  // Get categories by type
  getByType(type) {
    return db.prepare('SELECT * FROM categories WHERE type = ? ORDER BY name').all(type);
  },

  // Get category by ID
  getById(id) {
    return db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  },

  // Create new category
  create(category) {
    const { name, type, color = null, icon = null } = category;
    const result = db.prepare(`
      INSERT INTO categories (name, type, color, icon)
      VALUES (?, ?, ?, ?)
    `).run(name, type, color, icon);

    return this.getById(result.lastInsertRowid);
  },

  // Update category
  update(id, category) {
    const { name, type, color, icon } = category;
    db.prepare(`
      UPDATE categories
      SET name = ?, type = ?, color = ?, icon = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, type, color, icon, id);

    return this.getById(id);
  },

  // Delete category
  delete(id) {
    return db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  }
};
