import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { reportService, transactionService, accountService, budgetService } from '../services';
import { formatCurrency, formatDisplayDate, getDateRange } from '../utils/helpers';
import './Dashboard.css';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ income: {}, expense: {}, netIncome: 0 });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [budgetProgress, setBudgetProgress] = useState([]);
  const [period, setPeriod] = useState('this_month');

  useEffect(() => {
    loadDashboardData();
  }, [period]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const dateRange = getDateRange(period);

      // Load all data in parallel
      const [summaryRes, transactionsRes, accountsRes, budgetsRes] = await Promise.all([
        reportService.getSummary(dateRange),
        transactionService.getAll({ ...dateRange, limit: 5 }),
        accountService.getAll(),
        budgetService.getAllProgress()
      ]);

      setSummary(summaryRes.data);
      setRecentTransactions(transactionsRes.data);
      setAccounts(accountsRes.data);
      setBudgetProgress(budgetsRes.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);

  return (
    <div className="dashboard">
      <div className="container">
        <div className="dashboard-header">
          <h1>Dashboard</h1>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="period-selector"
          >
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="this_year">This Year</option>
            <option value="last_year">Last Year</option>
          </select>
        </div>

        {/* Summary Cards */}
        <div className="summary-cards">
          <div className="summary-card income">
            <div className="card-icon">📈</div>
            <div className="card-content">
              <div className="card-label">Total Income</div>
              <div className="card-value">{formatCurrency(summary.income.total || 0)}</div>
              <div className="card-detail">{summary.income.count || 0} transactions</div>
            </div>
          </div>

          <div className="summary-card expense">
            <div className="card-icon">📉</div>
            <div className="card-content">
              <div className="card-label">Total Expenses</div>
              <div className="card-value">{formatCurrency(summary.expense.total || 0)}</div>
              <div className="card-detail">{summary.expense.count || 0} transactions</div>
            </div>
          </div>

          <div className="summary-card net">
            <div className="card-icon">💰</div>
            <div className="card-content">
              <div className="card-label">Net Income</div>
              <div className="card-value">{formatCurrency(summary.netIncome || 0)}</div>
              <div className="card-detail">
                {summary.netIncome >= 0 ? 'Positive' : 'Negative'} cash flow
              </div>
            </div>
          </div>

          <div className="summary-card balance">
            <div className="card-icon">🏦</div>
            <div className="card-content">
              <div className="card-label">Total Balance</div>
              <div className="card-value">{formatCurrency(totalBalance)}</div>
              <div className="card-detail">{accounts.length} accounts</div>
            </div>
          </div>
        </div>

        <div className="dashboard-grid">
          {/* Recent Transactions */}
          <div className="card">
            <div className="card-header flex-between">
              <h2>Recent Transactions</h2>
              <Link to="/transactions" className="btn btn-primary">View All</Link>
            </div>
            {recentTransactions.length === 0 ? (
              <p className="text-center">No transactions yet</p>
            ) : (
              <div className="transaction-list">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="transaction-item">
                    <div className="transaction-icon">
                      {transaction.category_icon || (transaction.type === 'income' ? '💵' : '💸')}
                    </div>
                    <div className="transaction-details">
                      <div className="transaction-description">{transaction.description || 'No description'}</div>
                      <div className="transaction-meta">
                        {transaction.category_name} • {formatDisplayDate(transaction.date)}
                      </div>
                    </div>
                    <div className={`transaction-amount ${transaction.type}`}>
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Budget Progress */}
          <div className="card">
            <div className="card-header flex-between">
              <h2>Budget Progress</h2>
              <Link to="/budgets" className="btn btn-primary">Manage</Link>
            </div>
            {budgetProgress.length === 0 ? (
              <p className="text-center">No active budgets</p>
            ) : (
              <div className="budget-list">
                {budgetProgress.map((budget) => (
                  <div key={budget.id} className="budget-item">
                    <div className="budget-header">
                      <span className="budget-category">
                        {budget.category_icon} {budget.category_name}
                      </span>
                      <span className="budget-amounts">
                        {formatCurrency(budget.spent)} / {formatCurrency(budget.amount)}
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className={`progress-fill ${budget.percentage > 100 ? 'over' : budget.percentage > 80 ? 'warning' : ''}`}
                        style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                      />
                    </div>
                    <div className="budget-footer">
                      <span>{budget.percentage.toFixed(0)}% used</span>
                      <span>{formatCurrency(budget.remaining)} remaining</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Accounts */}
          <div className="card">
            <div className="card-header flex-between">
              <h2>Accounts</h2>
              <Link to="/accounts" className="btn btn-primary">Manage</Link>
            </div>
            {accounts.length === 0 ? (
              <p className="text-center">No accounts yet</p>
            ) : (
              <div className="account-list">
                {accounts.map((account) => (
                  <div key={account.id} className="account-item">
                    <div className="account-icon">
                      {account.type === 'bank' ? '🏦' : '💳'}
                    </div>
                    <div className="account-details">
                      <div className="account-name">{account.name}</div>
                      <div className="account-type">
                        {account.type === 'bank' ? 'Bank Account' : 'Credit Card'}
                      </div>
                    </div>
                    <div className="account-balance">
                      {formatCurrency(account.balance, account.currency)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
