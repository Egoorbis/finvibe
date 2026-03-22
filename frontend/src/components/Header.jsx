import React from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

const Header = () => {
  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo">
          <span className="logo-icon">💰</span>
          <span className="logo-text">FinVibe</span>
        </Link>

        <nav className="nav">
          <Link to="/" className="nav-link">Dashboard</Link>
          <Link to="/transactions" className="nav-link">Transactions</Link>
          <Link to="/accounts" className="nav-link">Accounts</Link>
          <Link to="/categories" className="nav-link">Categories</Link>
          <Link to="/budgets" className="nav-link">Budgets</Link>
          <Link to="/reports" className="nav-link">Reports</Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;
