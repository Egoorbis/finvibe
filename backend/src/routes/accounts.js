import express from 'express';
import { accountController } from '../controllers/accountController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/', accountController.getAll);
router.get('/:id', accountController.getById);
router.post('/', accountController.create);
router.put('/:id', accountController.update);
router.delete('/:id', accountController.delete);

export default router;
