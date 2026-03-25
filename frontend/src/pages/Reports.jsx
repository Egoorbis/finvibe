import React, { useState, useEffect } from 'react';
import { reportService } from '../services';
import { formatCurrency } from '../utils/helpers';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Download } from 'lucide-react';
import './Reports.css';

const Reports = () => {
  const [summary, setSummary] = useState(null);
  const [categoryData, setCategoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('this_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  useEffect(() => {
    loadReportData();
  }, [dateRange, customStartDate, customEndDate]);

  const getDateRangeFilters = () => {
    const today = new Date();
    let start_date, end_date;

    switch (dateRange) {
      case 'this_month':
        start_date = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        end_date = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
        break;
      case 'last_month':
        start_date = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0];
        end_date = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0];
        break;
      case 'this_year':
        start_date = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
        end_date = new Date(today.getFullYear(), 11, 31).toISOString().split('T')[0];
        break;
      case 'last_year':
        start_date = new Date(today.getFullYear() - 1, 0, 1).toISOString().split('T')[0];
        end_date = new Date(today.getFullYear() - 1, 11, 31).toISOString().split('T')[0];
        break;
      case 'custom':
        start_date = customStartDate;
        end_date = customEndDate;
        break;
      default:
        start_date = '';
        end_date = '';
    }

    return { start_date, end_date };
  };

  const loadReportData = async () => {
    try {
      setLoading(true);
      const filters = getDateRangeFilters();

      const [summaryRes, expenseCategoryRes, incomeCategoryRes] = await Promise.all([
        reportService.getSummary(filters),
        reportService.getByCategory({ ...filters, type: 'expense' }),
        reportService.getByCategory({ ...filters, type: 'income' })
      ]);

      setSummary(summaryRes.data);
      setCategoryData({
        expense: expenseCategoryRes.data || [],
        income: incomeCategoryRes.data || []
      });
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const filters = getDateRangeFilters();
    const csvRows = [];

    // Header
    csvRows.push('Report Type,Category,Amount,Count,Average');

    // Expense data
    categoryData.expense.forEach(item => {
      csvRows.push(`Expense,${item.category_name},${item.total},${item.count},${item.average}`);
    });

    // Income data
    categoryData.income.forEach(item => {
      csvRows.push(`Income,${item.category_name},${item.total},${item.count},${item.average}`);
    });

    // Summary
    csvRows.push('');
    csvRows.push('Summary');
    csvRows.push(`Total Income,,${summary.income.total}`);
    csvRows.push(`Total Expenses,,${summary.expense.total}`);
    csvRows.push(`Net Income,,${summary.netIncome}`);

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finvibe-report-${filters.start_date}-to-${filters.end_date}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52BE80'
  ];

  if (loading) {
    return <div className="loading">Loading reports...</div>;
  }

  return (
    <div className="reports-page">
      <div className="container">
        <div className="page-header">
          <h1>Reports & Analytics</h1>
          <button onClick={exportToCSV} className="btn btn-primary">
            <Download size={18} />
            Export CSV
          </button>
        </div>

        {/* Date Range Selector */}
        <div className="card mb-2">
          <div className="date-range-selector">
            <div className="date-range-buttons">
              <button
                className={`range-btn ${dateRange === 'this_month' ? 'active' : ''}`}
                onClick={() => setDateRange('this_month')}
              >
                This Month
              </button>
              <button
                className={`range-btn ${dateRange === 'last_month' ? 'active' : ''}`}
                onClick={() => setDateRange('last_month')}
              >
                Last Month
              </button>
              <button
                className={`range-btn ${dateRange === 'this_year' ? 'active' : ''}`}
                onClick={() => setDateRange('this_year')}
              >
                This Year
              </button>
              <button
                className={`range-btn ${dateRange === 'last_year' ? 'active' : ''}`}
                onClick={() => setDateRange('last_year')}
              >
                Last Year
              </button>
              <button
                className={`range-btn ${dateRange === 'custom' ? 'active' : ''}`}
                onClick={() => setDateRange('custom')}
              >
                Custom Range
              </button>
            </div>

            {dateRange === 'custom' && (
              <div className="custom-date-inputs">
                <input
                  type="date"
                  className="form-control"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  placeholder="Start Date"
                />
                <span>to</span>
                <input
                  type="date"
                  className="form-control"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  placeholder="End Date"
                />
              </div>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="summary-cards">
            <div className="summary-card income">
              <div className="summary-icon">💰</div>
              <div className="summary-info">
                <h3>Total Income</h3>
                <p className="summary-amount">{formatCurrency(summary.income.total, 'USD')}</p>
                <small>{summary.income.count} transactions</small>
              </div>
            </div>

            <div className="summary-card expense">
              <div className="summary-icon">💸</div>
              <div className="summary-info">
                <h3>Total Expenses</h3>
                <p className="summary-amount">{formatCurrency(summary.expense.total, 'USD')}</p>
                <small>{summary.expense.count} transactions</small>
              </div>
            </div>

            <div className={`summary-card net ${summary.netIncome >= 0 ? 'positive' : 'negative'}`}>
              <div className="summary-icon">{summary.netIncome >= 0 ? '📈' : '📉'}</div>
              <div className="summary-info">
                <h3>Net {summary.netIncome >= 0 ? 'Savings' : 'Deficit'}</h3>
                <p className="summary-amount">{formatCurrency(Math.abs(summary.netIncome), 'USD')}</p>
                <small>{summary.netIncome >= 0 ? 'Surplus' : 'Deficit'}</small>
              </div>
            </div>
          </div>
        )}

        {/* Charts Grid */}
        <div className="charts-grid">
          {/* Expense by Category - Pie Chart */}
          {categoryData.expense && categoryData.expense.length > 0 && (
            <div className="card chart-card">
              <h2>Expenses by Category</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData.expense}
                    dataKey="total"
                    nameKey="category_name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => `${entry.category_name}: ${((entry.total / categoryData.expense.reduce((sum, item) => sum + item.total, 0)) * 100).toFixed(1)}%`}
                  >
                    {categoryData.expense.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(value, 'USD')}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Income by Category - Pie Chart */}
          {categoryData.income && categoryData.income.length > 0 && (
            <div className="card chart-card">
              <h2>Income by Category</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData.income}
                    dataKey="total"
                    nameKey="category_name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => `${entry.category_name}: ${((entry.total / categoryData.income.reduce((sum, item) => sum + item.total, 0)) * 100).toFixed(1)}%`}
                  >
                    {categoryData.income.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(value, 'USD')}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top Expense Categories - Bar Chart */}
          {categoryData.expense && categoryData.expense.length > 0 && (
            <div className="card chart-card full-width">
              <h2>Top Expense Categories</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryData.expense.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category_name" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => formatCurrency(value, 'USD')}
                  />
                  <Bar dataKey="total" fill="#FF6B6B" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Income vs Expense Comparison */}
          {summary && (
            <div className="card chart-card full-width">
              <h2>Income vs Expenses</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[
                    { name: 'Income', amount: summary.income.total, fill: '#52BE80' },
                    { name: 'Expenses', amount: summary.expense.total, fill: '#FF6B6B' }
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => formatCurrency(value, 'USD')}
                  />
                  <Bar dataKey="amount">
                    {[
                      { name: 'Income', amount: summary.income.total, fill: '#52BE80' },
                      { name: 'Expenses', amount: summary.expense.total, fill: '#FF6B6B' }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Top Categories Table */}
        {categoryData.expense && categoryData.expense.length > 0 && (
          <div className="card mt-3">
            <h2>Expense Categories Breakdown</h2>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Total</th>
                    <th>Transactions</th>
                    <th>Average</th>
                    <th>% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryData.expense.map((item, index) => {
                    const totalExpenses = categoryData.expense.reduce((sum, cat) => sum + cat.total, 0);
                    const percentage = (item.total / totalExpenses) * 100;

                    return (
                      <tr key={index}>
                        <td>
                          <span style={{ marginRight: '8px' }}>{item.category_icon}</span>
                          {item.category_name}
                        </td>
                        <td className="amount-cell">{formatCurrency(item.total, 'USD')}</td>
                        <td>{item.count}</td>
                        <td className="amount-cell">{formatCurrency(item.average, 'USD')}</td>
                        <td>
                          <div className="percentage-bar-container">
                            <div
                              className="percentage-bar"
                              style={{ width: `${percentage}%`, backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="percentage-text">{percentage.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* No Data Message */}
        {(!categoryData.expense || categoryData.expense.length === 0) &&
         (!categoryData.income || categoryData.income.length === 0) && (
          <div className="card">
            <p className="text-center">No transaction data available for the selected date range.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
