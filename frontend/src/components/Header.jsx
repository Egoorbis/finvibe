import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Header.css';

const Header = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Don't show navigation on auth pages
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo">
          <span className="logo-icon">💰</span>
          <span className="logo-text">FinVibe</span>
        </Link>

        {isAuthenticated() && !isAuthPage && (
          <>
            <nav className="nav">
              <Link to="/" className="nav-link">Dashboard</Link>
              <Link to="/transactions" className="nav-link">Transactions</Link>
              <Link to="/accounts" className="nav-link">Accounts</Link>
              <Link to="/categories" className="nav-link">Categories</Link>
              <Link to="/budgets" className="nav-link">Budgets</Link>
              <Link to="/reports" className="nav-link">Reports</Link>
            </nav>

            <div className="header-actions">
              <div className="user-info">
                <span className="user-icon">👤</span>
                <span className="user-name">{user?.username || 'User'}</span>
              </div>
              <button onClick={handleLogout} className="btn btn-secondary">
                Logout
              </button>
            </div>
          </>
        )}

        {!isAuthenticated() && !isAuthPage && (
          <div className="header-actions">
            <Link to="/login" className="btn btn-secondary">Login</Link>
            <Link to="/register" className="btn btn-primary">Sign Up</Link>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
