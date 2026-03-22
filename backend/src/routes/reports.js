import express from 'express';
import { reportController } from '../controllers/reportController.js';

const router = express.Router();

router.get('/summary', reportController.getSummary);
router.get('/by-category', reportController.getByCategory);

export default router;
