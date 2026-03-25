import React, { useState, useEffect } from 'react';
import { categoryService } from '../services';
import './Categories.css';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'expense',
    color: '#FF6B6B',
    icon: '📦'
  });

  // Common emoji icons for categories
  const commonIcons = [
    '🍽️', '🚗', '🏠', '💰', '🎬', '🏥', '✈️', '🎓',
    '👕', '⚡', '💳', '📱', '🎮', '🏋️', '🎨', '🐕',
    '☕', '🍕', '🚌', '🎁', '💼', '🛒', '🏦', '📦'
  ];

  // Common colors for categories
  const commonColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52BE80'
  ];

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await categoryService.getAll();
      setCategories(response.data);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await categoryService.update(editingId, formData);
      } else {
        await categoryService.create(formData);
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', type: 'expense', color: '#FF6B6B', icon: '📦' });
      loadCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Failed to save category');
    }
  };

  const handleEdit = (category) => {
    setFormData({
      name: category.name,
      type: category.type,
      color: category.color || '#FF6B6B',
      icon: category.icon || '📦'
    });
    setEditingId(category.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this category? This will fail if the category has associated transactions.')) {
      try {
        await categoryService.delete(id);
        loadCategories();
      } catch (error) {
        console.error('Error deleting category:', error);
        alert('Failed to delete category. It may have associated transactions or budgets.');
      }
    }
  };

  const expenseCategories = categories.filter(c => c.type === 'expense');
  const incomeCategories = categories.filter(c => c.type === 'income');

  if (loading) {
    return <div className="loading">Loading categories...</div>;
  }

  return (
    <div className="categories-page">
      <div className="container">
        <div className="page-header">
          <h1>Categories</h1>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingId(null);
              setFormData({ name: '', type: 'expense', color: '#FF6B6B', icon: '📦' });
            }}
            className="btn btn-primary"
          >
            {showForm ? 'Cancel' : '+ Add Category'}
          </button>
        </div>

        {showForm && (
          <div className="card mb-2">
            <div className="card-header">
              {editingId ? 'Edit Category' : 'New Category'}
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Category Name *</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g., Groceries, Salary, etc."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Type *</label>
                <select
                  className="form-control"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  required
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Icon</label>
                <div className="icon-picker">
                  {commonIcons.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className={`icon-option ${formData.icon === emoji ? 'selected' : ''}`}
                      onClick={() => setFormData({ ...formData, icon: emoji })}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  className="form-control mt-1"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="Or enter custom emoji"
                  maxLength="2"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Color</label>
                <div className="color-picker">
                  {commonColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`color-option ${formData.color === color ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({ ...formData, color: color })}
                    />
                  ))}
                </div>
                <input
                  type="color"
                  className="form-control mt-1"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                />
              </div>

              <button type="submit" className="btn btn-primary">
                {editingId ? 'Update' : 'Create'} Category
              </button>
            </form>
          </div>
        )}

        <div className="categories-section">
          <h2 className="section-title">
            <span className="type-badge expense">Expense Categories</span>
            <span className="count">{expenseCategories.length}</span>
          </h2>
          {expenseCategories.length === 0 ? (
            <div className="card">
              <p className="text-center">No expense categories yet.</p>
            </div>
          ) : (
            <div className="categories-grid">
              {expenseCategories.map((category) => (
                <div
                  key={category.id}
                  className="category-card"
                  style={{ borderLeftColor: category.color }}
                >
                  <div className="category-icon" style={{ backgroundColor: `${category.color}20` }}>
                    {category.icon || '📦'}
                  </div>
                  <div className="category-info">
                    <h3>{category.name}</h3>
                    <div className="category-meta">
                      <span className="color-dot" style={{ backgroundColor: category.color }}></span>
                      <span className="color-code">{category.color}</span>
                    </div>
                  </div>
                  <div className="category-actions">
                    <button
                      onClick={() => handleEdit(category)}
                      className="btn btn-secondary btn-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="btn btn-danger btn-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="categories-section mt-3">
          <h2 className="section-title">
            <span className="type-badge income">Income Categories</span>
            <span className="count">{incomeCategories.length}</span>
          </h2>
          {incomeCategories.length === 0 ? (
            <div className="card">
              <p className="text-center">No income categories yet.</p>
            </div>
          ) : (
            <div className="categories-grid">
              {incomeCategories.map((category) => (
                <div
                  key={category.id}
                  className="category-card"
                  style={{ borderLeftColor: category.color }}
                >
                  <div className="category-icon" style={{ backgroundColor: `${category.color}20` }}>
                    {category.icon || '💰'}
                  </div>
                  <div className="category-info">
                    <h3>{category.name}</h3>
                    <div className="category-meta">
                      <span className="color-dot" style={{ backgroundColor: category.color }}></span>
                      <span className="color-code">{category.color}</span>
                    </div>
                  </div>
                  <div className="category-actions">
                    <button
                      onClick={() => handleEdit(category)}
                      className="btn btn-secondary btn-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="btn btn-danger btn-sm"
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
    </div>
  );
};

export default Categories;
