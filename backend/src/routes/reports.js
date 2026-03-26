import express from 'express';
import { reportController } from '../controllers/reportController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/summary', reportController.getSummary);
router.get('/by-category', reportController.getByCategory);

export default router;
