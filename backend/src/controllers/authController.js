import { User } from '../models/User.js';
import { generateToken } from '../middleware/auth.js';
import { sendPasswordResetEmail, sendVerificationEmail, sendWelcomeEmail } from '../services/emailService.js';
import crypto from 'crypto';

// Register a new user
export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validation - only email and password are required
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Password validation - minimum 8 characters for better security
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Username validation (optional, only if provided)
    if (username) {
      const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
      if (!usernameRegex.test(username)) {
        return res.status(400).json({ error: 'Username must be 3-20 characters (letters, numbers, underscores only)' });
      }

      // Check if username already exists
      if (await User.usernameExists(username)) {
        return res.status(409).json({ error: 'Username already taken' });
      }
    }

    // Check if email already exists
    if (await User.emailExists(email)) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Create user
    const user = await User.create({ username, email, password });

    // Generate token
    const token = generateToken(user);

    res.status(201).json({
      message: 'User registered successfully',
      user,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
};

// Login user
export const login = async (req, res) => {
  try {
    // Accept both 'email' and 'emailOrUsername' for flexibility
    const { email, emailOrUsername, password } = req.body;
    const loginIdentifier = email || emailOrUsername;

    // Validation
    if (!loginIdentifier || !password) {
      return res.status(400).json({ error: 'Email/username and password are required' });
    }

    // Authenticate user
    const user = await User.authenticate(loginIdentifier, password);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user);

    res.json({
      message: 'Login successful',
      user,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
};

// Get current user profile
export const getProfile = async (req, res) => {
  try {
    const user = await User.getById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const { username, email } = req.body;

    // Validation
    if (!username && !email) {
      return res.status(400).json({ error: 'At least one field (username or email) is required' });
    }

    // Get current user
    const currentUser = await User.getById(req.user.id);

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if new email already exists (if changing email)
    if (email && email !== currentUser.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      if (await User.emailExists(email)) {
        return res.status(409).json({ error: 'Email already in use' });
      }
    }

    // Check if new username already exists (if changing username)
    if (username && username !== currentUser.username) {
      const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
      if (!usernameRegex.test(username)) {
        return res.status(400).json({ error: 'Username must be 3-20 characters (letters, numbers, underscores only)' });
      }

      if (await User.usernameExists(username)) {
        return res.status(409).json({ error: 'Username already taken' });
      }
    }

    // Update user
    const user = await User.update(req.user.id, {
      username: username || currentUser.username,
      email: email || currentUser.email
    });

    // Generate new token with updated info
    const token = generateToken(user);

    res.json({
      message: 'Profile updated successfully',
      user,
      token
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// Change password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }

    // Get current user with password
    const user = await User.getByEmail(req.user.email);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValid = await User.verifyPassword(currentPassword, user.password);

    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Update password
    await User.updatePassword(req.user.id, newPassword);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
};

// Logout (client-side token removal, but we can add blacklisting later)
export const logout = async (req, res) => {
  try {
    // For now, logout is handled client-side by removing the token
    // In future, we can implement token blacklisting with Redis
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Failed to logout' });
  }
};

// Request password reset
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    // Validation
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Get user by email
    const user = await User.getByEmail(email);

    // Always return success (security best practice - don't reveal if email exists)
    // But only send email if user exists
    if (user) {
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour from now

      // Save reset token to database
      await User.setResetToken(user.id, resetToken, resetTokenExpires);

      // Send reset email
      try {
        await sendPasswordResetEmail(user.email, resetToken, user.username);
      } catch (emailError) {
        console.error('Failed to send reset email:', emailError);
        return res.status(500).json({ error: 'Failed to send password reset email' });
      }
    }

    res.json({ message: 'If the email exists, a password reset link has been sent' });
  } catch (error) {
    console.error('Request password reset error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
};

// Reset password with token
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Validation
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    // Find user by reset token
    const user = await User.getByResetToken(token);

    // Use constant-time comparison to prevent timing attacks
    // Check both validity and expiry before responding to avoid timing differences
    const isTokenValid = user && user.reset_token;
    const isTokenExpired = user ? new Date() > new Date(user.reset_token_expires) : true;

    // If either invalid or expired, return the same error message
    if (!isTokenValid || isTokenExpired) {
      // Use constant-time comparison even for the token itself
      if (isTokenValid && user.reset_token) {
        // Perform a dummy comparison to maintain constant timing
        crypto.timingSafeEqual(
          Buffer.from(token.padEnd(64, '0')),
          Buffer.from(user.reset_token.padEnd(64, '0'))
        );
      }
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Verify token with constant-time comparison
    const tokenBuffer = Buffer.from(token);
    const storedTokenBuffer = Buffer.from(user.reset_token);

    if (tokenBuffer.length !== storedTokenBuffer.length ||
        !crypto.timingSafeEqual(tokenBuffer, storedTokenBuffer)) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Update password and clear reset token
    await User.updatePassword(user.id, newPassword);
    await User.clearResetToken(user.id);

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

// Send verification email
export const sendVerification = async (req, res) => {
  try {
    const user = await User.getById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.email_verified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 86400000); // 24 hours

    // Save verification token
    await User.setVerificationToken(user.id, verificationToken, verificationTokenExpires);

    // Send verification email
    try {
      await sendVerificationEmail(user.email, verificationToken, user.username);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      return res.status(500).json({ error: 'Failed to send verification email' });
    }

    res.json({ message: 'Verification email sent successfully' });
  } catch (error) {
    console.error('Send verification error:', error);
    res.status(500).json({ error: 'Failed to send verification email' });
  }
};

// Verify email with token
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    // Validation
    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    // Find user by verification token
    const user = await User.getByVerificationToken(token);

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    // Check if token is expired
    if (new Date() > new Date(user.verification_token_expires)) {
      return res.status(400).json({ error: 'Verification token has expired' });
    }

    // Mark email as verified and clear token
    await User.verifyEmail(user.id);
    await User.clearVerificationToken(user.id);

    // Send welcome email (non-blocking)
    sendWelcomeEmail(user.email, user.username).catch(err =>
      console.error('Failed to send welcome email:', err)
    );

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
};
