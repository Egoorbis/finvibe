import { Account } from '../models/Account.js';

export const accountController = {
  // GET /api/accounts
  async getAll(req, res) {
    try {
      const accounts = await Account.getAll(req.user.id);
      res.json(accounts);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/accounts/:id
  async getById(req, res) {
    try {
      const account = await Account.getById(req.params.id, req.user.id);
      if (!account) {
        return res.status(404).json({ error: 'Account not found' });
      }
      res.json(account);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/accounts
  async create(req, res) {
    try {
      const account = await Account.create(req.body, req.user.id);
      res.status(201).json(account);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // PUT /api/accounts/:id
  async update(req, res) {
    try {
      const account = await Account.update(req.params.id, req.body, req.user.id);
      if (!account) {
        return res.status(404).json({ error: 'Account not found' });
      }
      res.json(account);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // DELETE /api/accounts/:id
  async delete(req, res) {
    try {
      const result = await Account.delete(req.params.id, req.user.id);
      if (result.changes === 0) {
        return res.status(404).json({ error: 'Account not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};
