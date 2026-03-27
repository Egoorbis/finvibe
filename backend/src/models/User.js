import db from '../db/database.js';
import bcrypt from 'bcryptjs';

export const User = {
  // Get all users (admin only - for future use)
  async getAll() {
    const users = await db.all('SELECT id, username, email, created_at, updated_at FROM users ORDER BY created_at DESC');
    return users;
  },

  // Get user by ID
  async getById(id) {
    return await db.get('SELECT id, username, email, created_at, updated_at FROM users WHERE id = $1', [id]);
  },

  // Get user by email (for authentication)
  async getByEmail(email) {
    return await db.get('SELECT * FROM users WHERE email = $1', [email]);
  },

  // Get user by username (for authentication)
  async getByUsername(username) {
    return await db.get('SELECT * FROM users WHERE username = $1', [username]);
  },

  // Check if email already exists
  async emailExists(email) {
    const result = await db.get('SELECT id FROM users WHERE email = $1', [email]);
    return !!result;
  },

  // Check if username already exists
  async usernameExists(username) {
    const result = await db.get('SELECT id FROM users WHERE username = $1', [username]);
    return !!result;
  },

  // Create new user
  async create(user) {
    const { username, email, password } = user;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.run(
      `INSERT INTO users (username, email, password)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [username, email, hashedPassword]
    );

    const id = result.lastInsertRowid || result.rows[0]?.id;
    return await this.getById(id);
  },

  // Update user
  async update(id, user) {
    const { username, email } = user;

    await db.run(
      `UPDATE users
       SET username = $1, email = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [username, email, id]
    );

    return await this.getById(id);
  },

  // Update user password
  async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.run(
      `UPDATE users
       SET password = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [hashedPassword, id]
    );

    return await this.getById(id);
  },

  // Delete user
  async delete(id) {
    return await db.run('DELETE FROM users WHERE id = $1', [id]);
  },

  // Verify password
  async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  },

  // Authenticate user
  async authenticate(emailOrUsername, password) {
    // Try to find user by email or username
    let user = await this.getByEmail(emailOrUsername);
    if (!user) {
      user = await this.getByUsername(emailOrUsername);
    }

    if (!user) {
      return null;
    }

    const isValid = await this.verifyPassword(password, user.password);
    if (!isValid) {
      return null;
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },

  // Set password reset token
  async setResetToken(id, token, expires) {
    await db.run(
      `UPDATE users
       SET reset_token = $1, reset_token_expires = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [token, expires, id]
    );
  },

  // Get user by reset token
  async getByResetToken(token) {
    return await db.get(
      'SELECT * FROM users WHERE reset_token = $1',
      [token]
    );
  },

  // Clear reset token
  async clearResetToken(id) {
    await db.run(
      `UPDATE users
       SET reset_token = NULL, reset_token_expires = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id]
    );
  },

  // Set verification token
  async setVerificationToken(id, token, expires) {
    await db.run(
      `UPDATE users
       SET verification_token = $1, verification_token_expires = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [token, expires, id]
    );
  },

  // Get user by verification token
  async getByVerificationToken(token) {
    return await db.get(
      'SELECT * FROM users WHERE verification_token = $1',
      [token]
    );
  },

  // Verify email
  async verifyEmail(id) {
    await db.run(
      `UPDATE users
       SET email_verified = 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id]
    );
  },

  // Clear verification token
  async clearVerificationToken(id) {
    await db.run(
      `UPDATE users
       SET verification_token = NULL, verification_token_expires = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id]
    );
  }
};
