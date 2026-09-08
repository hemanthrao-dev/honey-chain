import { db } from '../db/index.js';
import { generateLabCode, hashLabCode, verifyLabCode, generateBatchId } from '../utils/crypto.js';
import {
  appendBatchBlock,
  getBlockByBatchId,
  validateChainIntegrity,
  tamperBlockForDemo,
  restoreChainIntegrity,
} from '../utils/blockchain.js';

export function getBatches(req, res, next) {
  try {
    const { beekeeperId, status } = req.query;

    let queryStr = 'SELECT * FROM batches WHERE block_index > 0';
    const params = [];

    if (beekeeperId) {
      queryStr += ' AND beekeeper_id = ?';
      params.push(beekeeperId);
    }
    if (status) {
      queryStr += ' AND status = ?';
      params.push(status);
    }

    queryStr += ' ORDER BY block_index DESC';

    const batches = db.prepare(queryStr).all(...params);

    // Attach lab certificate metadata (whether code is issued/ready for beekeeper)
    const enrichedBatches = batches.map(b => {
      const cert = db.prepare('SELECT id, expires_at, is_used, issued_at, plain_code_demo FROM lab_certificates WHERE batch_id = ?').get(b.batch_id);
      
      let labStatus = 'pending';
      if (b.lab_tested === 1 || b.status === 'KVIC Verified & Lab Tested') {
        labStatus = 'certified';
      } else if (cert && cert.is_used === 0) {
        labStatus = 'issued';
      }

      return {
        ...b,
        labStatus,
        hasCodeReady: cert ? (cert.is_used === 0) : false,
        // For Hackathon demo transparency, Admin and issuing officer can view the generated verification code
        demoCode: (req.user?.role === 'admin' && cert) ? cert.plain_code_demo : undefined,
      };
    });

    return res.status(200).json({
      success: true,
      data: enrichedBatches,
    });
  } catch (error) {
    next(error);
  }
}

export function getPendingBatches(req, res, next) {
  try {
    const pending = db.prepare(`
      SELECT b.*, c.plain_code_demo, c.is_used, c.issued_at
      FROM batches b
      LEFT JOIN lab_certificates c ON b.batch_id = c.batch_id
      WHERE b.block_index > 0 AND (b.status = 'pending_review' OR b.status = 'approved' OR b.lab_tested = 0)
      ORDER BY b.block_index DESC
    `).all();

    return res.status(200).json({
      success: true,
      data: pending,
    });
  } catch (error) {
    next(error);
  }
}

export function createBatch(req, res, next) {
  try {
    const { beekeeperId, hiveId, quantity, floralSource, notes } = req.body;

    // 1. Verify Beekeeper exists
    const bk = db.prepare('SELECT * FROM beekeepers WHERE id = ?').get(beekeeperId);
    if (!bk) {
      return res.status(404).json({
        success: false,
        error: `Beekeeper with ID ${beekeeperId} is not registered. Only KVIC Admin can register beekeepers.`,
      });
    }

    // 2. Verify Hive ID is assigned to this Beekeeper (Security rule: Beekeepers cannot self-register an unassigned Hive)
    let assignedHives = [];
    try {
      assignedHives = JSON.parse(bk.hives);
    } catch {
      assignedHives = typeof bk.hives === 'string' ? bk.hives.split(',').map(s => s.trim()).filter(Boolean) : [];
    }

    if (!assignedHives.includes(hiveId)) {
      return res.status(403).json({
        success: false,
        error: `Unauthorized Hive ID: "${hiveId}" is not assigned to beekeeper ${bk.name} (${bk.id}). Assigned hives: [${assignedHives.join(', ')}].`,
      });
    }

    const batchId = generateBatchId(bk.id, hiveId);
    const harvestDate = new Date().toISOString();

    // 3. Append to server-side cryptographic hash chain
    const newBlock = appendBatchBlock({
      batch_id: batchId,
      beekeeper_id: bk.id,
      beekeeper_name: bk.name,
      hive_id: hiveId,
      quantity: parseFloat(quantity),
      floral_source: floralSource.trim(),
      location: bk.location,
      harvest_date: harvestDate,
      notes: (notes || '').trim(),
      status: 'pending_review',
      lab_tested: 0,
    });

    // 4. Audit Log
    db.prepare('INSERT INTO audit_logs (action, actor_role, actor_id, target_id, details) VALUES (?, ?, ?, ?, ?)').run(
      'BATCH_REGISTERED',
      'beekeeper',
      bk.id,
      batchId,
      `Batch ${batchId} (${quantity}kg, ${floralSource}) registered and appended to SHA-256 ledger`
    );

    return res.status(201).json({
      success: true,
      message: `Batch ${batchId} created and appended to SHA-256 blockchain with status "pending_review".`,
      data: newBlock,
    });
  } catch (error) {
    next(error);
  }
}

export function approveBatch(req, res, next) {
  try {
    const { batchId } = req.params;

    const batch = getBlockByBatchId(batchId);
    if (!batch) {
      return res.status(404).json({
        success: false,
        error: `Batch ${batchId} not found on blockchain ledger.`,
      });
    }

    // Check if certificate already exists
    const existingCert = db.prepare('SELECT * FROM lab_certificates WHERE batch_id = ?').get(batchId);
    if (existingCert) {
      return res.status(400).json({
        success: false,
        error: 'A Lab Certificate verification code has already been issued for this batch.',
        code: existingCert.plain_code_demo,
      });
    }

    // Generate secure unique cryptographic code (format: KVIC-XXXX-XXXX)
    const rawCode = generateLabCode();
    const codeHash = hashLabCode(rawCode);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    db.prepare(`
      INSERT INTO lab_certificates (batch_id, beekeeper_id, code_hash, plain_code_demo, expires_at, is_used)
      VALUES (?, ?, ?, ?, ?, 0)
    `).run(batchId, batch.beekeeper_id, codeHash, rawCode, expiresAt);

    // Update batch status to 'approved' (ready for beekeeper code verification)
    db.prepare("UPDATE batches SET status = 'approved' WHERE batch_id = ?").run(batchId);

    db.prepare('INSERT INTO audit_logs (action, actor_role, actor_id, target_id, details) VALUES (?, ?, ?, ?, ?)').run(
      'ADMIN_APPROVE_BATCH',
      'admin',
      String(req.user?.id || 'admin'),
      batchId,
      `KVIC Admin approved batch ${batchId} & issued single-use cryptographic lab verification code.`
    );

    return res.status(200).json({
      success: true,
      message: `Batch ${batchId} approved. Lab Certificate Verification Code issued.`,
      batchId,
      beekeeperId: batch.beekeeper_id,
      verificationCode: rawCode,
      expiresAt,
    });
  } catch (error) {
    next(error);
  }
}

export function rejectBatch(req, res, next) {
  try {
    const { batchId } = req.params;
    const { reason } = req.body;

    const batch = getBlockByBatchId(batchId);
    if (!batch) {
      return res.status(404).json({
        success: false,
        error: `Batch ${batchId} not found.`,
      });
    }

    db.prepare("UPDATE batches SET status = 'rejected' WHERE batch_id = ?").run(batchId);

    db.prepare('INSERT INTO audit_logs (action, actor_role, actor_id, target_id, details) VALUES (?, ?, ?, ?, ?)').run(
      'ADMIN_REJECT_BATCH',
      'admin',
      String(req.user?.id || 'admin'),
      batchId,
      `Batch ${batchId} rejected by Admin. Reason: ${reason || 'Failed quality/purity parameters'}`
    );

    return res.status(200).json({
      success: true,
      message: `Batch ${batchId} rejected.`,
    });
  } catch (error) {
    next(error);
  }
}

export function verifyLabCodeForBatch(req, res, next) {
  try {
    const { batchId } = req.params;
    const { code } = req.body;

    const batch = getBlockByBatchId(batchId);
    if (!batch) {
      return res.status(404).json({
        success: false,
        error: `Batch ${batchId} not found.`,
      });
    }

    const cert = db.prepare('SELECT * FROM lab_certificates WHERE batch_id = ?').get(batchId);
    if (!cert) {
      return res.status(400).json({
        success: false,
        error: 'No Lab Certificate verification code has been issued for this batch yet. Await KVIC Admin approval.',
      });
    }

    if (cert.is_used === 1) {
      return res.status(400).json({
        success: false,
        error: 'This Lab Certificate Verification Code has already been used and is now invalidated.',
      });
    }

    // Check expiration
    if (new Date(cert.expires_at) < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'This Lab Certificate Verification Code has expired. Please contact KVIC Admin for re-issuance.',
      });
    }

    // Single-use, batch-specific cryptographic comparison
    const isValid = verifyLabCode(code, cert.code_hash);

    if (!isValid) {
      // Log failed attempt
      db.prepare('INSERT INTO audit_logs (action, actor_role, actor_id, target_id, details) VALUES (?, ?, ?, ?, ?)').run(
        'CODE_VERIFY_FAILED',
        req.user?.role || 'beekeeper',
        String(req.user?.id || 'unknown'),
        batchId,
        `Invalid code submission for batch ${batchId}`
      );

      return res.status(400).json({
        success: false,
        error: 'Invalid Lab Certificate Verification Code. Verification code does not match this batch.',
      });
    }

    // Mark certificate as used (single-use enforcement)
    const nowIso = new Date().toISOString();
    db.prepare('UPDATE lab_certificates SET is_used = 1, used_at = ? WHERE id = ?').run(nowIso, cert.id);

    // Upgrade batch status to verified & lab tested
    db.prepare("UPDATE batches SET status = 'KVIC Verified & Lab Tested', lab_tested = 1 WHERE batch_id = ?").run(batchId);

    // Maintain cryptographic integrity of the updated block
    restoreChainIntegrity();

    db.prepare('INSERT INTO audit_logs (action, actor_role, actor_id, target_id, details) VALUES (?, ?, ?, ?, ?)').run(
      'CODE_VERIFY_SUCCESS',
      req.user?.role || 'beekeeper',
      String(req.user?.id || 'beekeeper'),
      batchId,
      `Batch ${batchId} verified with single-use lab certificate code. Status updated to KVIC Verified & Lab Tested.`
    );

    return res.status(200).json({
      success: true,
      message: `Batch ${batchId} successfully verified! Status upgraded to "KVIC Verified & Lab Tested".`,
      batchId,
      status: 'KVIC Verified & Lab Tested',
      labTested: true,
    });
  } catch (error) {
    next(error);
  }
}

export function getReadyCodes(req, res, next) {
  try {
    const { beekeeperId } = req.params;

    const readyCertificates = db.prepare(`
      SELECT c.batch_id, c.beekeeper_id, c.expires_at, c.issued_at, c.is_used, b.floral_source, b.quantity, b.hive_id
      FROM lab_certificates c
      JOIN batches b ON c.batch_id = b.batch_id
      WHERE c.beekeeper_id = ? AND c.is_used = 0
      ORDER BY c.issued_at DESC
    `).all(beekeeperId);

    return res.status(200).json({
      success: true,
      data: readyCertificates,
    });
  } catch (error) {
    next(error);
  }
}

export function verifyBatchPublic(req, res, next) {
  try {
    const { batchId } = req.params;

    const block = getBlockByBatchId(batchId);
    if (!block) {
      return res.status(404).json({
        success: false,
        error: 'Honey batch not found on the KVIC blockchain ledger.',
      });
    }

    const chainValidation = validateChainIntegrity();

    return res.status(200).json({
      success: true,
      data: {
        batchId: block.batch_id,
        beekeeperId: block.beekeeper_id,
        beekeeper: block.beekeeper_name,
        hiveId: block.hive_id,
        quantity: block.quantity,
        floralSource: block.floral_source,
        location: block.location,
        harvestDate: block.harvest_date,
        notes: block.notes,
        status: block.status,
        labTested: Boolean(block.lab_tested),
        blockchain: {
          blockIndex: block.block_index,
          timestamp: block.timestamp,
          hash: block.hash,
          previousHash: block.prev_hash,
          nonce: block.nonce,
        },
        ledgerIntegrity: {
          chainValid: chainValidation.valid,
          tamperedIndex: chainValidation.tamperedIndex,
          reason: chainValidation.reason,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export function getChainStatus(req, res, next) {
  try {
    const validation = validateChainIntegrity();
    const blocks = db.prepare('SELECT block_index, batch_id, hash, prev_hash, status, lab_tested, created_at FROM batches ORDER BY block_index ASC').all();

    return res.status(200).json({
      success: true,
      data: {
        valid: validation.valid,
        tamperedIndex: validation.tamperedIndex,
        reason: validation.reason,
        totalBlocks: blocks.length,
        blocks,
      },
    });
  } catch (error) {
    next(error);
  }
}

export function tamperBatchDemo(req, res, next) {
  try {
    const { batchId } = req.params;
    const { quantity, floral_source, notes } = req.body;

    const result = tamperBlockForDemo(batchId, { quantity, floral_source, notes });
    if (!result) {
      return res.status(404).json({
        success: false,
        error: `Could not tamper with batch ${batchId}. Batch not found.`,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Simulated unauthorized tamper applied to batch ${batchId}. Blockchain hash was intentionally NOT updated to demonstrate cryptographic tamper detection.`,
    });
  } catch (error) {
    next(error);
  }
}

export function restoreChainDemo(req, res, next) {
  try {
    restoreChainIntegrity();
    return res.status(200).json({
      success: true,
      message: 'Blockchain cryptographic ledger successfully restored and re-anchored to Genesis block.',
    });
  } catch (error) {
    next(error);
  }
}

export function deleteBatch(req, res, next) {
  try {
    const { batchId } = req.params;
    const batch = getBlockByBatchId(batchId);
    if (!batch) {
      return res.status(404).json({
        success: false,
        error: `Batch ${batchId} not found.`,
      });
    }

    db.prepare('DELETE FROM lab_certificates WHERE batch_id = ?').run(batchId);
    db.prepare('DELETE FROM batches WHERE batch_id = ?').run(batchId);
    restoreChainIntegrity();

    return res.status(200).json({
      success: true,
      message: `Batch ${batchId} deleted and blockchain re-indexed.`,
    });
  } catch (error) {
    next(error);
  }
}
