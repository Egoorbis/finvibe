import express from 'express';
import { accountController } from '../controllers/accountController.js';

const router = express.Router();

router.get('/', accountController.getAll);
router.get('/:id', accountController.getById);
router.post('/', accountController.create);
router.put('/:id', accountController.update);
router.delete('/:id', accountController.delete);

export default router;
