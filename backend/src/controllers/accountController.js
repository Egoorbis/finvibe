import { Account } from '../models/Account.js';

export const accountController = {
  // GET /api/accounts
  getAll(req, res) {
    try {
      const accounts = Account.getAll();
      res.json(accounts);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/accounts/:id
  getById(req, res) {
    try {
      const account = Account.getById(req.params.id);
      if (!account) {
        return res.status(404).json({ error: 'Account not found' });
      }
      res.json(account);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/accounts
  create(req, res) {
    try {
      const account = Account.create(req.body);
      res.status(201).json(account);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // PUT /api/accounts/:id
  update(req, res) {
    try {
      const account = Account.update(req.params.id, req.body);
      if (!account) {
        return res.status(404).json({ error: 'Account not found' });
      }
      res.json(account);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // DELETE /api/accounts/:id
  delete(req, res) {
    try {
      const result = Account.delete(req.params.id);
      if (result.changes === 0) {
        return res.status(404).json({ error: 'Account not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};
