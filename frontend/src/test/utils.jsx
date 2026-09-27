import React from 'react';
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { AuthProvider } from '../context/AuthContext';

vi.mock('../router', () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/', state: {} }),
  Navigate: () => null,
}));

export function renderWithRouter(ui, options = {}) {
  return render(<AuthProvider>{ui}</AuthProvider>, options);
}
export * from '@testing-library/react';
export { renderWithRouter as render };
