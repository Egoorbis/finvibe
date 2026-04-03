import { Transaction } from '../models/Transaction.js';

export const transactionController = {
  // GET /api/transactions
  async getAll(req, res) {
    try {
      // Validate and sanitize limit parameter
      let limit = null;
      if (req.query.limit) {
        const parsedLimit = parseInt(req.query.limit, 10);
        // Validate: must be a valid positive integer within reasonable bounds
        if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 1000) {
          return res.status(400).json({
            error: 'Invalid limit parameter. Must be a positive integer between 1 and 1000.'
          });
        }
        limit = parsedLimit;
      }

      const filters = {
        type: req.query.type,
        account_id: req.query.account_id,
        category_id: req.query.category_id,
        start_date: req.query.start_date,
        end_date: req.query.end_date,
        limit: limit
      };

      const transactions = await Transaction.getAll(req.user.id, filters);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/transactions/:id
  async getById(req, res) {
    try {
      const transaction = await Transaction.getById(req.params.id, req.user.id);
      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }
      res.json(transaction);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/transactions
  async create(req, res) {
    try {
      const transaction = await Transaction.create(req.body, req.user.id);
      res.status(201).json(transaction);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // PUT /api/transactions/:id
  async update(req, res) {
    try {
      const transaction = await Transaction.update(req.params.id, req.body, req.user.id);
      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }
      res.json(transaction);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // DELETE /api/transactions/:id
  async delete(req, res) {
    try {
      const result = await Transaction.delete(req.params.id, req.user.id);
      if (!result) {
        return res.status(404).json({ error: 'Transaction not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};
