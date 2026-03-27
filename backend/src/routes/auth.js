import express from 'express';
import {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  requestPasswordReset,
  resetPassword,
  sendVerification,
  verifyEmail
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter, passwordResetLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Public routes with stricter rate limiting
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);

// Password reset routes
router.post('/request-password-reset', passwordResetLimiter, requestPasswordReset);
router.post('/reset-password', passwordResetLimiter, resetPassword);

// Email verification routes
router.post('/verify-email', verifyEmail);

// Protected routes (require authentication)
router.post('/logout', authenticate, logout);
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.put('/change-password', authenticate, changePassword);
router.post('/send-verification', authenticate, sendVerification);

export default router;
