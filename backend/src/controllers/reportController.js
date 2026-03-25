import { Transaction } from '../models/Transaction.js';

export const reportController = {
  // GET /api/reports/summary
  async getSummary(req, res) {
    try {
      const filters = {
        start_date: req.query.start_date,
        end_date: req.query.end_date
      };

      const summary = await Transaction.getSummary(filters);

      // Format the response
      const result = {
        income: summary.find(s => s.type === 'income') || { count: 0, total: 0, average: 0 },
        expense: summary.find(s => s.type === 'expense') || { count: 0, total: 0, average: 0 }
      };

      result.netIncome = result.income.total - result.expense.total;

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/reports/by-category
  async getByCategory(req, res) {
    try {
      const filters = {
        type: req.query.type,
        start_date: req.query.start_date,
        end_date: req.query.end_date
      };

      const categoryData = await Transaction.getByCategory(filters);
      res.json(categoryData);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};
