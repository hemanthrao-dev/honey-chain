import express from 'express';
import {
  getBatches,
  getPendingBatches,
  createBatch,
  approveBatch,
  rejectBatch,
  verifyLabCodeForBatch,
  getReadyCodes,
  verifyBatchPublic,
  getChainStatus,
  tamperBatchDemo,
  restoreChainDemo,
  deleteBatch,
} from '../controllers/batchController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { batchCreateLimiter, codeVerifyLimiter } from '../middleware/rateLimiter.js';
import { validateBatch, validateCodeVerification } from '../middleware/validator.js';

const router = express.Router();

// Public / Consumer verification routes
router.get('/chain-status', getChainStatus);
router.get('/verify/:batchId', verifyBatchPublic);

// Listing batches
router.get('/', getBatches);
router.get('/pending', authenticateToken, requireRole(['admin']), getPendingBatches);
router.get('/ready-codes/:beekeeperId', authenticateToken, getReadyCodes);

// Beekeeper actions
router.post('/', authenticateToken, requireRole(['beekeeper', 'admin']), batchCreateLimiter, validateBatch, createBatch);
router.post('/:batchId/verify-code', authenticateToken, codeVerifyLimiter, validateCodeVerification, verifyLabCodeForBatch);

// Admin actions
router.post('/:batchId/approve', authenticateToken, requireRole(['admin']), approveBatch);
router.post('/:batchId/reject', authenticateToken, requireRole(['admin']), rejectBatch);
router.delete('/:batchId', authenticateToken, requireRole(['admin']), deleteBatch);

// Demo & Integrity Inspection routes
router.post('/:batchId/tamper-demo', tamperBatchDemo);
router.post('/restore-demo', restoreChainDemo);

export default router;
