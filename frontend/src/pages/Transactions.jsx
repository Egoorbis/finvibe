import React, { useState, useEffect } from 'react';
import { transactionService, accountService, categoryService } from '../services';
import { formatCurrency, formatDate, formatDisplayDate } from '../utils/helpers';
import './Transactions.css';

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Filter state
  const [filters, setFilters] = useState({
    type: '',
    account_id: '',
    category_id: '',
    start_date: '',
    end_date: ''
  });

  // Form state
  const [formData, setFormData] = useState({
    date: formatDate(new Date()),
    amount: '',
    type: 'expense',
    description: '',
    account_id: '',
    category_id: '',
    tags: '',
    attachment: null
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [accountsRes, categoriesRes] = await Promise.all([
        accountService.getAll(),
        categoryService.getAll()
      ]);
      setAccounts(accountsRes.data);
      setCategories(categoriesRes.data);
      await loadTransactions();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== '')
      );
      const response = await transactionService.getAll(cleanFilters);
      setTransactions(response.data);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        amount: parseFloat(formData.amount),
        account_id: parseInt(formData.account_id),
        category_id: parseInt(formData.category_id)
      };

      if (editingId) {
        await transactionService.update(editingId, submitData);
      } else {
        await transactionService.create(submitData);
      }

      setShowForm(false);
      setEditingId(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('Failed to save transaction: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleEdit = (transaction) => {
    setFormData({
      date: transaction.date,
      amount: transaction.amount.toString(),
      type: transaction.type,
      description: transaction.description || '',
      account_id: transaction.account_id.toString(),
      category_id: transaction.category_id.toString(),
      tags: transaction.tags || '',
      attachment: null
    });
    setEditingId(transaction.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this transaction? This will update your account balance.')) {
      try {
        await transactionService.delete(id);
        loadData();
      } catch (error) {
        console.error('Error deleting transaction:', error);
        alert('Failed to delete transaction');
      }
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        e.target.value = '';
        return;
      }
      setFormData({ ...formData, attachment: file });
    }
  };

  const resetForm = () => {
    setFormData({
      date: formatDate(new Date()),
      amount: '',
      type: 'expense',
      description: '',
      account_id: '',
      category_id: '',
      tags: '',
      attachment: null
    });
  };

  const filteredCategories = categories.filter(
    cat => cat.type === formData.type
  );

  if (loading) {
    return <div className="loading">Loading transactions...</div>;
  }

  return (
    <div className="transactions-page">
      <div className="container">
        <div className="page-header">
          <h1>Transactions</h1>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingId(null);
              resetForm();
            }}
            className="btn btn-primary"
          >
            {showForm ? 'Cancel' : '+ Add Transaction'}
          </button>
        </div>

        {/* Transaction Form */}
        {showForm && (
          <div className="card mb-2">
            <div className="card-header">
              {editingId ? 'Edit Transaction' : 'New Transaction'}
            </div>
            <form onSubmit={handleSubmit} className="transaction-form">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Date *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Type *</label>
                  <select
                    className="form-control"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value, category_id: '' })}
                    required
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Account *</label>
                  <select
                    className="form-control"
                    value={formData.account_id}
                    onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                    required
                  >
                    <option value="">Select Account</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.type === 'bank' ? '🏦' : '💳'} {account.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select
                    className="form-control"
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    required
                  >
                    <option value="">Select Category</option>
                    {filteredCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.icon} {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Add a description..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tags</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="e.g., groceries, monthly, urgent (comma-separated)"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Attachment (Receipt/Document)</label>
                <input
                  type="file"
                  className="form-control"
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png,image/jpg,application/pdf"
                />
                <small className="form-text">Max 5MB. Allowed: JPEG, PNG, PDF</small>
                {formData.attachment && (
                  <div className="file-preview">
                    📎 {formData.attachment.name}
                  </div>
                )}
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Update' : 'Create'} Transaction
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filters */}
        <div className="card mb-2">
          <div className="card-header">Filters</div>
          <div className="filters-form">
            <div className="filter-group">
              <label className="form-label">Type</label>
              <select
                className="form-control"
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              >
                <option value="">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>

            <div className="filter-group">
              <label className="form-label">Account</label>
              <select
                className="form-control"
                value={filters.account_id}
                onChange={(e) => setFilters({ ...filters, account_id: e.target.value })}
              >
                <option value="">All Accounts</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label className="form-label">Category</label>
              <select
                className="form-control"
                value={filters.category_id}
                onChange={(e) => setFilters({ ...filters, category_id: e.target.value })}
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label className="form-label">From Date</label>
              <input
                type="date"
                className="form-control"
                value={filters.start_date}
                onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
              />
            </div>

            <div className="filter-group">
              <label className="form-label">To Date</label>
              <input
                type="date"
                className="form-control"
                value={filters.end_date}
                onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
              />
            </div>

            <div className="filter-group">
              <button
                className="btn btn-secondary"
                onClick={() => setFilters({
                  type: '',
                  account_id: '',
                  category_id: '',
                  start_date: '',
                  end_date: ''
                })}
                style={{ marginTop: '24px' }}
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className="card">
          <div className="card-header">
            <h2>All Transactions ({transactions.length})</h2>
          </div>

          {transactions.length === 0 ? (
            <p className="text-center">No transactions found. Add your first transaction to get started!</p>
          ) : (
            <div className="transactions-table-container">
              <table className="table transactions-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Account</th>
                    <th>Tags</th>
                    <th>Amount</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className={`transaction-row ${transaction.type}`}>
                      <td className="date-cell">{formatDisplayDate(transaction.date)}</td>
                      <td className="description-cell">
                        <div className="description-content">
                          {transaction.description || 'No description'}
                          {transaction.attachment_path && (
                            <span className="attachment-indicator" title="Has attachment">
                              📎
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="category-cell">
                        <span className="category-badge" style={{ backgroundColor: transaction.category_color }}>
                          {transaction.category_icon} {transaction.category_name}
                        </span>
                      </td>
                      <td className="account-cell">
                        {transaction.account_type === 'bank' ? '🏦' : '💳'} {transaction.account_name}
                      </td>
                      <td className="tags-cell">
                        {transaction.tags ? (
                          <div className="tags-container">
                            {transaction.tags.split(',').map((tag, index) => (
                              <span key={index} className="tag">
                                {tag.trim()}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="no-tags">—</span>
                        )}
                      </td>
                      <td className={`amount-cell ${transaction.type}`}>
                        <span className="amount-value">
                          {transaction.type === 'income' ? '+' : '-'}
                          {formatCurrency(transaction.amount)}
                        </span>
                      </td>
                      <td className="actions-cell">
                        <button
                          onClick={() => handleEdit(transaction)}
                          className="btn-icon btn-edit"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(transaction.id)}
                          className="btn-icon btn-delete"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Transactions;
