import { Budget } from '../models/Budget.js';

export const budgetController = {
  // GET /api/budgets
  async getAll(req, res) {
    try {
      const budgets = await Budget.getAll(req.user.id);
      res.json(budgets);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/budgets/active
  async getActive(req, res) {
    try {
      const { date } = req.query;
      const budgets = await Budget.getActive(req.user.id, date);
      res.json(budgets);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/budgets/progress
  async getAllProgress(req, res) {
    try {
      const { date } = req.query;
      const progress = await Budget.getAllProgress(req.user.id, date);
      res.json(progress);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/budgets/:id
  async getById(req, res) {
    try {
      const budget = await Budget.getById(req.params.id, req.user.id);
      if (!budget) {
        return res.status(404).json({ error: 'Budget not found' });
      }
      res.json(budget);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/budgets/:id/progress
  async getProgress(req, res) {
    try {
      const progress = await Budget.getProgress(req.params.id, req.user.id);
      if (!progress) {
        return res.status(404).json({ error: 'Budget not found' });
      }
      res.json(progress);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/budgets
  async create(req, res) {
    try {
      const budget = await Budget.create(req.body, req.user.id);
      res.status(201).json(budget);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // PUT /api/budgets/:id
  async update(req, res) {
    try {
      const budget = await Budget.update(req.params.id, req.body, req.user.id);
      if (!budget) {
        return res.status(404).json({ error: 'Budget not found' });
      }
      res.json(budget);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // DELETE /api/budgets/:id
  async delete(req, res) {
    try {
      const result = await Budget.delete(req.params.id, req.user.id);
      if (result.changes === 0) {
        return res.status(404).json({ error: 'Budget not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};
