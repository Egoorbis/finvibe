import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '../test/utils';
import Dashboard from './Dashboard';
import * as services from '../services';

// Mock services
vi.mock('../services', () => ({
  reportService: {
    getSummary: vi.fn(),
  },
  transactionService: {
    getAll: vi.fn(),
  },
  accountService: {
    getAll: vi.fn(),
  },
  budgetService: {
    getAllProgress: vi.fn(),
  },
}));

// Mock helpers
vi.mock('../utils/helpers', () => ({
  formatCurrency: (amount) => `$${amount}`,
  formatDisplayDate: (date) => date,
  getDateRange: () => ({ start_date: '2026-03-01', end_date: '2026-03-31' }),
}));

describe('Dashboard Component', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Set up default mock responses
    services.reportService.getSummary.mockResolvedValue({
      data: {
        income: { total: 5000, count: 2 },
        expense: { total: 3000, count: 5 },
        netIncome: 2000
      }
    });

    services.transactionService.getAll.mockResolvedValue({
      data: []
    });

    services.accountService.getAll.mockResolvedValue({
      data: [
        { id: 1, name: 'Checking', balance: 1000, type: 'bank' },
        { id: 2, name: 'Savings', balance: 5000, type: 'bank' }
      ]
    });

    services.budgetService.getAllProgress.mockResolvedValue({
      data: []
    });
  });

  it('should show loading state initially', () => {
    render(<Dashboard />);

    expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
  });

  it('should load and display dashboard data', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByText('Loading dashboard...')).not.toBeInTheDocument();
    });

    // Verify services were called
    expect(services.reportService.getSummary).toHaveBeenCalled();
    expect(services.transactionService.getAll).toHaveBeenCalled();
    expect(services.accountService.getAll).toHaveBeenCalled();
    expect(services.budgetService.getAllProgress).toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    services.reportService.getSummary.mockRejectedValue(new Error('API Error'));

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByText('Loading dashboard...')).not.toBeInTheDocument();
    });

    expect(consoleError).toHaveBeenCalledWith(
      'Error loading dashboard:',
      expect.any(Error)
    );

    consoleError.mockRestore();
  });
});
