import express from 'express';
import {
  getBeekeepers,
  getBeekeeperById,
  createBeekeeper,
  updateBeekeeper,
  deleteBeekeeper,
} from '../controllers/beekeeperController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { validateBeekeeper } from '../middleware/validator.js';

const router = express.Router();

router.get('/', getBeekeepers);
router.get('/:id', getBeekeeperById);
router.post('/', authenticateToken, requireRole(['admin']), validateBeekeeper, createBeekeeper);
router.put('/:id', authenticateToken, requireRole(['admin']), validateBeekeeper, updateBeekeeper);
router.delete('/:id', authenticateToken, requireRole(['admin']), deleteBeekeeper);

export default router;
