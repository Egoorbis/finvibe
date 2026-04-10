import { jest } from '@jest/globals';
import { setupTestDatabase, teardownTestDatabase, clearTestData } from '../utils/testDb.js';
import bcrypt from 'bcryptjs';

let testDb;
let User;

beforeAll(async () => {
  testDb = await setupTestDatabase();

  jest.unstable_mockModule('../../src/db/database.js', () => ({
    default: testDb
  }));

  const userModule = await import('../../src/models/User.js');
  User = userModule.User;
});

afterAll(async () => {
  await teardownTestDatabase(testDb);
});

beforeEach(async () => {
  await clearTestData(testDb);
});

describe('User Model', () => {
  describe('create', () => {
    it('should create a user with hashed password', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      const user = await User.create(userData);

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
      expect(user.password).toBeUndefined(); // Password should not be returned
    });

    it('should hash the password', async () => {
      const plainPassword = 'mySecurePassword';
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: plainPassword
      });

      // Get the user with password from DB
      const userWithPassword = await User.getByEmail('test@example.com');

      expect(userWithPassword.password).toBeDefined();
      expect(userWithPassword.password).not.toBe(plainPassword);

      // Verify the hash is valid
      const isValid = await bcrypt.compare(plainPassword, userWithPassword.password);
      expect(isValid).toBe(true);
    });

    it('should enforce unique email constraint', async () => {
      await User.create({
        username: 'user1',
        email: 'test@example.com',
        password: 'password123'
      });

      // Attempting to create user with same email should fail
      await expect(
        User.create({
          username: 'user2',
          email: 'test@example.com',
          password: 'password456'
        })
      ).rejects.toThrow();
    });

    it('should enforce unique username constraint', async () => {
      await User.create({
        username: 'testuser',
        email: 'test1@example.com',
        password: 'password123'
      });

      // Attempting to create user with same username should fail
      await expect(
        User.create({
          username: 'testuser',
          email: 'test2@example.com',
          password: 'password456'
        })
      ).rejects.toThrow();
    });
  });

  describe('getById', () => {
    it('should retrieve user by ID without password', async () => {
      const created = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      });

      const user = await User.getById(created.id);

      expect(user).toBeDefined();
      expect(user.id).toBe(created.id);
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
      expect(user.password).toBeUndefined();
    });

    it('should return undefined for non-existent user', async () => {
      const user = await User.getById(999);
      expect(user).toBeUndefined();
    });
  });

  describe('getByEmail', () => {
    it('should retrieve user by email with password', async () => {
      await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      });

      const user = await User.getByEmail('test@example.com');

      expect(user).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.username).toBe('testuser');
      expect(user.password).toBeDefined(); // Password included for authentication
    });

    it('should return undefined for non-existent email', async () => {
      const user = await User.getByEmail('nonexistent@example.com');
      expect(user).toBeUndefined();
    });
  });

  describe('getByUsername', () => {
    it('should retrieve user by username', async () => {
      await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      });

      const user = await User.getByUsername('testuser');

      expect(user).toBeDefined();
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
    });

    it('should return undefined for non-existent username', async () => {
      const user = await User.getByUsername('nonexistent');
      expect(user).toBeUndefined();
    });
  });

  describe('emailExists', () => {
    it('should return true for existing email', async () => {
      await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      });

      const exists = await User.emailExists('test@example.com');
      expect(exists).toBe(true);
    });

    it('should return false for non-existent email', async () => {
      const exists = await User.emailExists('nonexistent@example.com');
      expect(exists).toBe(false);
    });
  });

  describe('usernameExists', () => {
    it('should return true for existing username', async () => {
      await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      });

      const exists = await User.usernameExists('testuser');
      expect(exists).toBe(true);
    });

    it('should return false for non-existent username', async () => {
      const exists = await User.usernameExists('nonexistent');
      expect(exists).toBe(false);
    });
  });

  describe('verifyPassword', () => {
    it('should return true for correct password', async () => {
      const password = 'mySecurePassword';
      await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: password
      });

      const user = await User.getByEmail('test@example.com');
      const isValid = await User.verifyPassword(password, user.password);

      expect(isValid).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'correctPassword'
      });

      const user = await User.getByEmail('test@example.com');
      const isValid = await User.verifyPassword('wrongPassword', user.password);

      expect(isValid).toBe(false);
    });
  });

  describe('authenticate', () => {
    beforeEach(async () => {
      await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      });
    });

    it('should authenticate with valid email and password', async () => {
      const user = await User.authenticate('test@example.com', 'password123');

      expect(user).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.username).toBe('testuser');
      expect(user.password).toBeUndefined(); // Password should not be returned
    });

    it('should authenticate with valid username and password', async () => {
      const user = await User.authenticate('testuser', 'password123');

      expect(user).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.username).toBe('testuser');
      expect(user.password).toBeUndefined();
    });

    it('should return null for invalid email', async () => {
      const user = await User.authenticate('wrong@example.com', 'password123');
      expect(user).toBeNull();
    });

    it('should return null for invalid username', async () => {
      const user = await User.authenticate('wronguser', 'password123');
      expect(user).toBeNull();
    });

    it('should return null for invalid password', async () => {
      const user = await User.authenticate('test@example.com', 'wrongpassword');
      expect(user).toBeNull();
    });
  });

  describe('update', () => {
    it('should update user information', async () => {
      const user = await User.create({
        username: 'oldusername',
        email: 'old@example.com',
        password: 'password123'
      });

      const updated = await User.update(user.id, {
        username: 'newusername',
        email: 'new@example.com'
      });

      expect(updated.username).toBe('newusername');
      expect(updated.email).toBe('new@example.com');
      expect(updated.password).toBeUndefined();
    });
  });

  describe('updatePassword', () => {
    it('should update user password with new hash', async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'oldPassword123'
      });

      await User.updatePassword(user.id, 'newPassword456');

      // Verify old password no longer works
      const authWithOld = await User.authenticate('test@example.com', 'oldPassword123');
      expect(authWithOld).toBeNull();

      // Verify new password works
      const authWithNew = await User.authenticate('test@example.com', 'newPassword456');
      expect(authWithNew).toBeDefined();
      expect(authWithNew.id).toBe(user.id);
    });
  });

  describe('delete', () => {
    it('should delete user', async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      });

      await User.delete(user.id);

      const deleted = await User.getById(user.id);
      expect(deleted).toBeUndefined();
    });
  });
});
