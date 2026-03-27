import React, { useState, useEffect } from 'react';
import { accountService } from '../services';
import { formatCurrency } from '../utils/helpers';
import './Accounts.css';

const Accounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'bank',
    balance: 0,
    currency: 'USD'
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const response = await accountService.getAll();
      setAccounts(response.data);
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await accountService.update(editingId, formData);
      } else {
        await accountService.create(formData);
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', type: 'bank', balance: 0, currency: 'USD' });
      loadAccounts();
    } catch (error) {
      console.error('Error saving account:', error);
      alert('Failed to save account');
    }
  };

  const handleEdit = (account) => {
    setFormData({
      name: account.name,
      type: account.type,
      balance: account.balance,
      currency: account.currency
    });
    setEditingId(account.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this account?')) {
      try {
        await accountService.delete(id);
        loadAccounts();
      } catch (error) {
        console.error('Error deleting account:', error);
        alert('Failed to delete account. It may have associated transactions.');
      }
    }
  };

  if (loading) {
    return <div className="loading">Loading accounts...</div>;
  }

  return (
    <div className="accounts-page">
      <div className="container">
        <div className="page-header">
          <h1>Accounts</h1>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingId(null);
              setFormData({ name: '', type: 'bank', balance: 0, currency: 'USD' });
            }}
            className="btn btn-primary"
          >
            {showForm ? 'Cancel' : '+ Add Account'}
          </button>
        </div>

        {showForm && (
          <div className="card mb-2">
            <div className="card-header">
              {editingId ? 'Edit Account' : 'New Account'}
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Account Name *</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Account Type *</label>
                <select
                  className="form-control"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  required
                >
                  <option value="bank">Bank Account</option>
                  <option value="credit_card">Credit Card</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Initial Balance *</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  value={formData.balance}
                  onChange={(e) => setFormData({ ...formData, balance: parseFloat(e.target.value) })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Currency</label>
                <select
                  className="form-control"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="CAD">CAD - Canadian Dollar</option>
                  <option value="CHF">CHF - Swiss Franc</option>
                </select>
              </div>

              <button type="submit" className="btn btn-primary">
                {editingId ? 'Update' : 'Create'} Account
              </button>
            </form>
          </div>
        )}

        {accounts.length === 0 ? (
          <div className="card">
            <p className="text-center">No accounts yet. Create your first account to get started!</p>
          </div>
        ) : (
          <div className="accounts-grid">
            {accounts.map((account) => (
              <div key={account.id} className="account-card">
                <div className="account-card-header">
                  <div className="account-icon">
                    {account.type === 'bank' ? '🏦' : '💳'}
                  </div>
                  <div className="account-info">
                    <h3>{account.name}</h3>
                    <p className="account-type-label">
                      {account.type === 'bank' ? 'Bank Account' : 'Credit Card'}
                    </p>
                  </div>
                </div>
                <div className="account-balance-section">
                  <div className="balance-label">Current Balance</div>
                  <div className="balance-amount">
                    {formatCurrency(account.balance, account.currency)}
                  </div>
                </div>
                <div className="account-actions">
                  <button
                    onClick={() => handleEdit(account)}
                    className="btn btn-secondary"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(account.id)}
                    className="btn btn-danger"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Accounts;
