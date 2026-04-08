import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../test/utils';
import Register from './Register';
import { AuthProvider } from '../context/AuthContext';
import { BrowserRouter } from 'react-router-dom';

// Mock the navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Helper to render with necessary providers
const renderRegister = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <Register />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Register Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render registration form', () => {
    renderRegister();

    expect(screen.getByText('Create Account')).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
  });

  it('should show correct password requirement in placeholder', () => {
    renderRegister();

    const passwordInput = screen.getByPlaceholderText(/min 8 characters/i);
    expect(passwordInput).toBeInTheDocument();
  });

  it('should display error for empty fields', async () => {
    renderRegister();

    const submitButton = screen.getByRole('button', { name: /sign up/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/please fill in all fields/i)).toBeInTheDocument();
    });
  });

  it('should validate username length (minimum 3 characters)', async () => {
    renderRegister();

    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'ab' }, // Only 2 characters
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'password123' },
    });

    const submitButton = screen.getByRole('button', { name: /sign up/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/username must be between 3 and 20 characters/i)).toBeInTheDocument();
    });
  });

  it('should validate username length (maximum 20 characters)', async () => {
    renderRegister();

    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'a'.repeat(21) }, // 21 characters
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'password123' },
    });

    const submitButton = screen.getByRole('button', { name: /sign up/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/username must be between 3 and 20 characters/i)).toBeInTheDocument();
    });
  });

  it('should validate username format (alphanumeric and underscores only)', async () => {
    renderRegister();

    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'test-user!' }, // Contains invalid characters
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'password123' },
    });

    const submitButton = screen.getByRole('button', { name: /sign up/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/username can only contain letters, numbers, and underscores/i)).toBeInTheDocument();
    });
  });

  it('should validate email format', async () => {
    renderRegister();

    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'testuser' },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'invalid-email' }, // Invalid email format
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'password123' },
    });

    const submitButton = screen.getByRole('button', { name: /sign up/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    });
  });

  it('should reject password shorter than 8 characters', async () => {
    renderRegister();

    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'testuser' },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'pass123' }, // Only 7 characters - should fail
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'pass123' },
    });

    const submitButton = screen.getByRole('button', { name: /sign up/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters long/i)).toBeInTheDocument();
    });
  });

  it('should accept password with exactly 8 characters', async () => {
    renderRegister();

    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'testuser' },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'pass1234' }, // Exactly 8 characters
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'pass1234' },
    });

    const submitButton = screen.getByRole('button', { name: /sign up/i });
    fireEvent.click(submitButton);

    // Should not show password length error
    await waitFor(() => {
      const errorElement = screen.queryByText(/password must be at least 8 characters long/i);
      expect(errorElement).not.toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('should reject password with only 6 characters', async () => {
    renderRegister();

    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'testuser' },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'pass12' }, // Only 6 characters - should fail
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'pass12' },
    });

    const submitButton = screen.getByRole('button', { name: /sign up/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters long/i)).toBeInTheDocument();
    });
  });

  it('should validate password confirmation match', async () => {
    renderRegister();

    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'testuser' },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'password456' }, // Different password
    });

    const submitButton = screen.getByRole('button', { name: /sign up/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  it('should clear error when user starts typing', async () => {
    renderRegister();

    // Trigger an error first
    const submitButton = screen.getByRole('button', { name: /sign up/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/please fill in all fields/i)).toBeInTheDocument();
    });

    // Start typing in username field
    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 't' },
    });

    // Error should be cleared
    await waitFor(() => {
      expect(screen.queryByText(/please fill in all fields/i)).not.toBeInTheDocument();
    });
  });

  it('should show loading state during submission', async () => {
    renderRegister();

    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'testuser' },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'password123' },
    });

    const submitButton = screen.getByRole('button', { name: /sign up/i });
    fireEvent.click(submitButton);

    // Check for loading state (button should be disabled and text should change)
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });
  });

  it('should have a link to login page', () => {
    renderRegister();

    const loginLink = screen.getByText(/sign in/i);
    expect(loginLink).toBeInTheDocument();
    expect(loginLink.closest('a')).toHaveAttribute('href', '/login');
  });

  it('should accept valid registration data', async () => {
    renderRegister();

    // Fill in valid data
    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'validuser' },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'valid@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'validpassword123' },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'validpassword123' },
    });

    const submitButton = screen.getByRole('button', { name: /sign up/i });
    fireEvent.click(submitButton);

    // Should not show validation errors
    await waitFor(() => {
      expect(screen.queryByText(/password must be at least 8 characters long/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/passwords do not match/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/please enter a valid email address/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/username must be between 3 and 20 characters/i)).not.toBeInTheDocument();
    }, { timeout: 1000 });
  });
});
