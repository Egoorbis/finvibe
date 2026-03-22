import express from 'express';
import { transactionController } from '../controllers/transactionController.js';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, join(__dirname, '../../uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed.'));
    }
  }
});

router.get('/', transactionController.getAll);
router.get('/:id', transactionController.getById);
router.post('/', upload.single('attachment'), (req, res) => {
  if (req.file) {
    req.body.attachment_path = req.file.path;
  }
  transactionController.create(req, res);
});
router.put('/:id', upload.single('attachment'), (req, res) => {
  if (req.file) {
    req.body.attachment_path = req.file.path;
  }
  transactionController.update(req, res);
});
router.delete('/:id', transactionController.delete);

export default router;
