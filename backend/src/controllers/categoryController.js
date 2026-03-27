import { Category } from '../models/Category.js';

export const categoryController = {
  // GET /api/categories
  async getAll(req, res) {
    try {
      const { type } = req.query;
      const categories = type ? await Category.getByType(type) : await Category.getAll();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/categories/:id
  async getById(req, res) {
    try {
      const category = await Category.getById(req.params.id);
      if (!category) {
        return res.status(404).json({ error: 'Category not found' });
      }
      res.json(category);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/categories
  async create(req, res) {
    try {
      const category = await Category.create(req.body);
      res.status(201).json(category);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // PUT /api/categories/:id
  async update(req, res) {
    try {
      const category = await Category.update(req.params.id, req.body);
      if (!category) {
        return res.status(404).json({ error: 'Category not found' });
      }
      res.json(category);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // DELETE /api/categories/:id
  async delete(req, res) {
    try {
      const result = await Category.delete(req.params.id);
      if (result.changes === 0) {
        return res.status(404).json({ error: 'Category not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};
