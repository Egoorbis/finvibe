import { jest } from '@jest/globals';
import request from 'supertest';
import { setupTestDatabase, teardownTestDatabase, clearTestData } from '../utils/testDb.js';

let testDb;
let app;
let User;

// Set JWT_SECRET for tests
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.NODE_ENV = 'test';

beforeAll(async () => {
  testDb = await setupTestDatabase();

  jest.unstable_mockModule('../../src/db/database.js', () => ({
    default: testDb
  }));

  const userModule = await import('../../src/models/User.js');
  User = userModule.User;

  const appModule = await import('../../src/index.js');
  app = appModule.default;
});

afterAll(() => {
  teardownTestDatabase(testDb);
});

beforeEach(() => {
  clearTestData(testDb);
});

describe('Auth Controller', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user with valid 8+ character password', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123' // 12 characters - valid
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe('testuser');
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.password).toBeUndefined();
      expect(response.body.token).toBeDefined();
    });

    it('should register with exactly 8 character password', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'pass1234' // Exactly 8 characters
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('User registered successfully');
    });

    it('should reject registration with 7 character password', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'pass123' // Only 7 characters - invalid
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Password must be at least 8 characters long');
    });

    it('should reject registration with 6 character password', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'pass12' // Only 6 characters - invalid
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Password must be at least 8 characters long');
    });

    it('should reject registration without username', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Username, email, and password are required');
    });

    it('should reject registration without email', async () => {
      const userData = {
        username: 'testuser',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Username, email, and password are required');
    });

    it('should reject registration without password', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Username, email, and password are required');
    });

    it('should reject registration with invalid email format', async () => {
      const userData = {
        username: 'testuser',
        email: 'invalid-email',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid email format');
    });

    it('should reject registration with invalid username (too short)', async () => {
      const userData = {
        username: 'ab', // Only 2 characters
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Username must be 3-20 characters (letters, numbers, underscores only)');
    });

    it('should reject registration with invalid username (too long)', async () => {
      const userData = {
        username: 'a'.repeat(21), // 21 characters
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Username must be 3-20 characters (letters, numbers, underscores only)');
    });

    it('should reject registration with invalid username (special characters)', async () => {
      const userData = {
        username: 'test-user!', // Contains hyphen and exclamation
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Username must be 3-20 characters (letters, numbers, underscores only)');
    });

    it('should reject registration with duplicate email', async () => {
      // Create first user
      await User.create({
        username: 'user1',
        email: 'test@example.com',
        password: 'password123'
      });

      // Try to register with same email
      const userData = {
        username: 'user2',
        email: 'test@example.com',
        password: 'password456'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Email already registered');
    });

    it('should reject registration with duplicate username', async () => {
      // Create first user
      await User.create({
        username: 'testuser',
        email: 'test1@example.com',
        password: 'password123'
      });

      // Try to register with same username
      const userData = {
        username: 'testuser',
        email: 'test2@example.com',
        password: 'password456'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Username already taken');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user
      await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      });
    });

    it('should login with valid email and password', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.password).toBeUndefined();
      expect(response.body.token).toBeDefined();
    });

    it('should login with valid username and password (emailOrUsername)', async () => {
      const credentials = {
        emailOrUsername: 'testuser',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.user.username).toBe('testuser');
    });

    it('should reject login with incorrect password', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should reject login with non-existent email', async () => {
      const credentials = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should reject login without credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email/username and password are required');
    });
  });

  describe('GET /api/auth/profile', () => {
    let authToken;
    let testUser;

    beforeEach(async () => {
      // Register a user to get a token
      testUser = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      });

      // Login to get token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      authToken = loginResponse.body.token;
    });

    it('should get profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe('testuser');
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.password).toBeUndefined();
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid token');
    });
  });

  describe('PUT /api/auth/profile', () => {
    let authToken;
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      authToken = loginResponse.body.token;
    });

    it('should update username', async () => {
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          username: 'newusername'
        });

      expect(response.status).toBe(200);
      expect(response.body.user.username).toBe('newusername');
      expect(response.body.token).toBeDefined();
    });

    it('should update email', async () => {
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'newemail@example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body.user.email).toBe('newemail@example.com');
    });

    it('should reject update with existing username', async () => {
      // Create another user
      await User.create({
        username: 'existinguser',
        email: 'other@example.com',
        password: 'password123'
      });

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          username: 'existinguser'
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Username already taken');
    });

    it('should reject update with existing email', async () => {
      // Create another user
      await User.create({
        username: 'otheruser',
        email: 'existing@example.com',
        password: 'password123'
      });

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'existing@example.com'
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Email already in use');
    });
  });

  describe('PUT /api/auth/change-password', () => {
    let authToken;

    beforeEach(async () => {
      await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'oldpassword123'
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'oldpassword123'
        });

      authToken = loginResponse.body.token;
    });

    it('should change password with valid current password', async () => {
      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'oldpassword123',
          newPassword: 'newpassword456'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password changed successfully');

      // Verify new password works
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'newpassword456'
        });

      expect(loginResponse.status).toBe(200);
    });

    it('should reject password change with incorrect current password', async () => {
      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword456'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Current password is incorrect');
    });

    it('should reject new password shorter than 8 characters', async () => {
      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'oldpassword123',
          newPassword: 'short1' // Only 6 characters
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('New password must be at least 8 characters long');
    });

    it('should reject without current password', async () => {
      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          newPassword: 'newpassword456'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Current password and new password are required');
    });
  });

  describe('POST /api/auth/logout', () => {
    let authToken;

    beforeEach(async () => {
      await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      authToken = loginResponse.body.token;
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logout successful');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/auth/logout');

      expect(response.status).toBe(401);
    });
  });
});
