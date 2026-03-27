import { describe, it, expect } from 'vitest';
import { render, screen } from '../test/utils';
import Header from './Header';

describe('Header Component', () => {
  it('should render the FinVibe logo', () => {
    render(<Header />);

    expect(screen.getByText('FinVibe')).toBeInTheDocument();
    expect(screen.getByText('💰')).toBeInTheDocument();
  });

  it('should render all navigation links', () => {
    render(<Header />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Transactions')).toBeInTheDocument();
    expect(screen.getByText('Accounts')).toBeInTheDocument();
    expect(screen.getByText('Categories')).toBeInTheDocument();
    expect(screen.getByText('Budgets')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
  });

  it('should have correct link hrefs', () => {
    render(<Header />);

    expect(screen.getByText('Dashboard').closest('a')).toHaveAttribute('href', '/');
    expect(screen.getByText('Transactions').closest('a')).toHaveAttribute('href', '/transactions');
    expect(screen.getByText('Accounts').closest('a')).toHaveAttribute('href', '/accounts');
    expect(screen.getByText('Categories').closest('a')).toHaveAttribute('href', '/categories');
    expect(screen.getByText('Budgets').closest('a')).toHaveAttribute('href', '/budgets');
    expect(screen.getByText('Reports').closest('a')).toHaveAttribute('href', '/reports');
  });

  it('should render header with correct class', () => {
    const { container } = render(<Header />);

    expect(container.querySelector('.header')).toBeInTheDocument();
    expect(container.querySelector('.header-container')).toBeInTheDocument();
  });
});
