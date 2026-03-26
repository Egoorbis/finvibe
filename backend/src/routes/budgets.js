import express from 'express';
import { budgetController } from '../controllers/budgetController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/', budgetController.getAll);
router.get('/active', budgetController.getActive);
router.get('/progress', budgetController.getAllProgress);
router.get('/:id', budgetController.getById);
router.get('/:id/progress', budgetController.getProgress);
router.post('/', budgetController.create);
router.put('/:id', budgetController.update);
router.delete('/:id', budgetController.delete);

export default router;
