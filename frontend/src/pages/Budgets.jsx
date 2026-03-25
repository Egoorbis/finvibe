import React, { useState, useEffect } from 'react';
import { budgetService, categoryService } from '../services';
import { formatCurrency } from '../utils/helpers';
import './Budgets.css';

const Budgets = () => {
  const [budgets, setBudgets] = useState([]);
  const [budgetProgress, setBudgetProgress] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    category_id: '',
    amount: 0,
    period: 'monthly',
    start_date: new Date().toISOString().split('T')[0],
    end_date: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [budgetsRes, progressRes, categoriesRes] = await Promise.all([
        budgetService.getAll(),
        budgetService.getAllProgress(),
        categoryService.getAll()
      ]);
      setBudgets(budgetsRes.data);
      setBudgetProgress(progressRes.data);
      setCategories(categoriesRes.data.filter(c => c.type === 'expense'));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateEndDate = (startDate, period) => {
    const start = new Date(startDate);
    let end = new Date(start);

    if (period === 'monthly') {
      end.setMonth(end.getMonth() + 1);
      end.setDate(end.getDate() - 1);
    } else if (period === 'yearly') {
      end.setFullYear(end.getFullYear() + 1);
      end.setDate(end.getDate() - 1);
    }

    return end.toISOString().split('T')[0];
  };

  const handleStartDateChange = (date) => {
    const endDate = calculateEndDate(date, formData.period);
    setFormData({ ...formData, start_date: date, end_date: endDate });
  };

  const handlePeriodChange = (period) => {
    const endDate = calculateEndDate(formData.start_date, period);
    setFormData({ ...formData, period, end_date: endDate });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await budgetService.update(editingId, formData);
      } else {
        await budgetService.create(formData);
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({
        category_id: '',
        amount: 0,
        period: 'monthly',
        start_date: new Date().toISOString().split('T')[0],
        end_date: ''
      });
      loadData();
    } catch (error) {
      console.error('Error saving budget:', error);
      alert('Failed to save budget');
    }
  };

  const handleEdit = (budget) => {
    setFormData({
      category_id: budget.category_id,
      amount: budget.amount,
      period: budget.period,
      start_date: budget.start_date,
      end_date: budget.end_date
    });
    setEditingId(budget.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this budget?')) {
      try {
        await budgetService.delete(id);
        loadData();
      } catch (error) {
        console.error('Error deleting budget:', error);
        alert('Failed to delete budget');
      }
    }
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 100) return 'danger';
    if (percentage >= 75) return 'warning';
    return 'success';
  };

  const getProgressLabel = (percentage) => {
    if (percentage >= 100) return 'Over Budget';
    if (percentage >= 75) return 'Approaching Limit';
    return 'On Track';
  };

  if (loading) {
    return <div className="loading">Loading budgets...</div>;
  }

  return (
    <div className="budgets-page">
      <div className="container">
        <div className="page-header">
          <h1>Budgets</h1>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingId(null);
              setFormData({
                category_id: '',
                amount: 0,
                period: 'monthly',
                start_date: new Date().toISOString().split('T')[0],
                end_date: ''
              });
            }}
            className="btn btn-primary"
          >
            {showForm ? 'Cancel' : '+ Add Budget'}
          </button>
        </div>

        {showForm && (
          <div className="card mb-2">
            <div className="card-header">
              {editingId ? 'Edit Budget' : 'New Budget'}
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Category *</label>
                <select
                  className="form-control"
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Budget Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-control"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Period *</label>
                <select
                  className="form-control"
                  value={formData.period}
                  onChange={(e) => handlePeriodChange(e.target.value)}
                  required
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Start Date *</label>
                <input
                  type="date"
                  className="form-control"
                  value={formData.start_date}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">End Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={formData.end_date}
                  readOnly
                  style={{ backgroundColor: '#f5f5f5' }}
                />
                <small className="form-text">Auto-calculated based on period</small>
              </div>

              <button type="submit" className="btn btn-primary">
                {editingId ? 'Update' : 'Create'} Budget
              </button>
            </form>
          </div>
        )}

        {budgetProgress.length === 0 ? (
          <div className="card">
            <p className="text-center">No active budgets. Create your first budget to start tracking your spending!</p>
          </div>
        ) : (
          <div className="budgets-grid">
            {budgetProgress.map((budget) => {
              const percentage = Math.min(budget.percentage, 100);
              const progressColor = getProgressColor(budget.percentage);
              const progressLabel = getProgressLabel(budget.percentage);

              return (
                <div key={budget.id} className="budget-card">
                  <div className="budget-header">
                    <div className="budget-category">
                      <span
                        className="category-icon"
                        style={{ backgroundColor: `${budget.category_color}20` }}
                      >
                        {budget.category_icon || '📦'}
                      </span>
                      <div>
                        <h3>{budget.category_name}</h3>
                        <span className="budget-period">
                          {budget.period === 'monthly' ? '📅 Monthly' : '📆 Yearly'}
                        </span>
                      </div>
                    </div>
                    <span className={`budget-status ${progressColor}`}>
                      {progressLabel}
                    </span>
                  </div>

                  <div className="budget-progress">
                    <div className="progress-bar-container">
                      <div
                        className={`progress-bar ${progressColor}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="progress-label">
                      {budget.percentage.toFixed(1)}% used
                    </div>
                  </div>

                  <div className="budget-amounts">
                    <div className="amount-item">
                      <span className="amount-label">Spent</span>
                      <span className={`amount-value ${budget.spent > budget.amount ? 'over-budget' : ''}`}>
                        {formatCurrency(budget.spent, 'USD')}
                      </span>
                    </div>
                    <div className="amount-item">
                      <span className="amount-label">Budget</span>
                      <span className="amount-value">
                        {formatCurrency(budget.amount, 'USD')}
                      </span>
                    </div>
                    <div className="amount-item">
                      <span className="amount-label">Remaining</span>
                      <span className={`amount-value ${budget.remaining < 0 ? 'over-budget' : 'remaining'}`}>
                        {formatCurrency(Math.abs(budget.remaining), 'USD')}
                      </span>
                    </div>
                  </div>

                  <div className="budget-dates">
                    <small>
                      {new Date(budget.start_date).toLocaleDateString()} - {new Date(budget.end_date).toLocaleDateString()}
                    </small>
                  </div>

                  <div className="budget-actions">
                    <button
                      onClick={() => handleEdit(budget)}
                      className="btn btn-secondary btn-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(budget.id)}
                      className="btn btn-danger btn-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {budgets.length > budgetProgress.length && (
          <div className="mt-3">
            <h2>Inactive Budgets</h2>
            <div className="budgets-grid">
              {budgets
                .filter(b => !budgetProgress.find(p => p.id === b.id))
                .map((budget) => (
                  <div key={budget.id} className="budget-card inactive">
                    <div className="budget-header">
                      <div className="budget-category">
                        <span
                          className="category-icon"
                          style={{ backgroundColor: `${budget.category_color}20` }}
                        >
                          {budget.category_icon || '📦'}
                        </span>
                        <div>
                          <h3>{budget.category_name}</h3>
                          <span className="budget-period">
                            {budget.period === 'monthly' ? '📅 Monthly' : '📆 Yearly'}
                          </span>
                        </div>
                      </div>
                      <span className="budget-status inactive-badge">Inactive</span>
                    </div>

                    <div className="budget-amounts">
                      <div className="amount-item">
                        <span className="amount-label">Budget</span>
                        <span className="amount-value">
                          {formatCurrency(budget.amount, 'USD')}
                        </span>
                      </div>
                    </div>

                    <div className="budget-dates">
                      <small>
                        {new Date(budget.start_date).toLocaleDateString()} - {new Date(budget.end_date).toLocaleDateString()}
                      </small>
                    </div>

                    <div className="budget-actions">
                      <button
                        onClick={() => handleEdit(budget)}
                        className="btn btn-secondary btn-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(budget.id)}
                        className="btn btn-danger btn-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Budgets;
