import { User } from '../models/User.js';
import { generateToken } from '../middleware/auth.js';

// Register a new user
export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Username validation (alphanumeric and underscores only)
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({ error: 'Username must be 3-20 characters (letters, numbers, underscores only)' });
    }

    // Check if email already exists
    if (await User.emailExists(email)) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Check if username already exists
    if (await User.usernameExists(username)) {
      return res.status(409).json({ error: 'Username already taken' });
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

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
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
