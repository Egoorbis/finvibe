import { Budget } from '../models/Budget.js';

export const budgetController = {
  // GET /api/budgets
  getAll(req, res) {
    try {
      const budgets = Budget.getAll();
      res.json(budgets);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/budgets/active
  getActive(req, res) {
    try {
      const { date } = req.query;
      const budgets = Budget.getActive(date);
      res.json(budgets);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/budgets/progress
  getAllProgress(req, res) {
    try {
      const { date } = req.query;
      const progress = Budget.getAllProgress(date);
      res.json(progress);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/budgets/:id
  getById(req, res) {
    try {
      const budget = Budget.getById(req.params.id);
      if (!budget) {
        return res.status(404).json({ error: 'Budget not found' });
      }
      res.json(budget);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/budgets/:id/progress
  getProgress(req, res) {
    try {
      const progress = Budget.getProgress(req.params.id);
      if (!progress) {
        return res.status(404).json({ error: 'Budget not found' });
      }
      res.json(progress);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/budgets
  create(req, res) {
    try {
      const budget = Budget.create(req.body);
      res.status(201).json(budget);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // PUT /api/budgets/:id
  update(req, res) {
    try {
      const budget = Budget.update(req.params.id, req.body);
      if (!budget) {
        return res.status(404).json({ error: 'Budget not found' });
      }
      res.json(budget);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // DELETE /api/budgets/:id
  delete(req, res) {
    try {
      const result = Budget.delete(req.params.id);
      if (result.changes === 0) {
        return res.status(404).json({ error: 'Budget not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};
