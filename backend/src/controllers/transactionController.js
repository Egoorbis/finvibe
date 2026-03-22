import { Transaction } from '../models/Transaction.js';

export const transactionController = {
  // GET /api/transactions
  getAll(req, res) {
    try {
      const filters = {
        type: req.query.type,
        account_id: req.query.account_id,
        category_id: req.query.category_id,
        start_date: req.query.start_date,
        end_date: req.query.end_date,
        limit: req.query.limit ? parseInt(req.query.limit) : null
      };

      const transactions = Transaction.getAll(filters);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/transactions/:id
  getById(req, res) {
    try {
      const transaction = Transaction.getById(req.params.id);
      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }
      res.json(transaction);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/transactions
  create(req, res) {
    try {
      const transaction = Transaction.create(req.body);
      res.status(201).json(transaction);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // PUT /api/transactions/:id
  update(req, res) {
    try {
      const transaction = Transaction.update(req.params.id, req.body);
      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }
      res.json(transaction);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // DELETE /api/transactions/:id
  delete(req, res) {
    try {
      const result = Transaction.delete(req.params.id);
      if (!result) {
        return res.status(404).json({ error: 'Transaction not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};
