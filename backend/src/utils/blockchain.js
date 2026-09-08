import crypto from 'crypto';
import { db } from '../db/index.js';

export function calculateBlockHash(index, prevHash, timestamp, data, nonce = 0) {
  return crypto
    .createHash('sha256')
    .update(index + prevHash + timestamp + JSON.stringify(data) + nonce)
    .digest('hex');
}

export function getLatestBlock() {
  return db.prepare('SELECT * FROM batches ORDER BY block_index DESC LIMIT 1').get();
}

export function getBlockByBatchId(batchId) {
  return db.prepare('SELECT * FROM batches WHERE batch_id = ?').get(batchId);
}

export function getAllBatches() {
  return db.prepare('SELECT * FROM batches WHERE block_index > 0 ORDER BY block_index DESC').all();
}

export function getBatchesByBeekeeper(beekeeperId) {
  return db.prepare('SELECT * FROM batches WHERE beekeeper_id = ? AND block_index > 0 ORDER BY block_index DESC').all(beekeeperId);
}

export function appendBatchBlock(batchData) {
  const latest = getLatestBlock();
  const nextIndex = latest ? latest.block_index + 1 : 0;
  const prevHash = latest ? latest.hash : '0';
  const timestamp = Date.now();

  const blockPayload = {
    type: 'honey_batch',
    batchId: batchData.batch_id,
    beekeeperId: batchData.beekeeper_id,
    beekeeper: batchData.beekeeper_name,
    hiveId: batchData.hive_id,
    quantity: Number(batchData.quantity),
    floralSource: batchData.floral_source,
    location: batchData.location,
    harvestDate: batchData.harvest_date,
    labTested: Boolean(batchData.lab_tested),
    notes: batchData.notes || '',
    status: batchData.status || 'pending_review',
  };

  const hash = calculateBlockHash(nextIndex, prevHash, timestamp, blockPayload, 0);

  const insert = db.prepare(`
    INSERT INTO batches (
      batch_id, beekeeper_id, beekeeper_name, hive_id, quantity, floral_source,
      location, harvest_date, notes, status, lab_tested, block_index, timestamp,
      prev_hash, hash, nonce
    ) VALUES (
      @batch_id, @beekeeper_id, @beekeeper_name, @hive_id, @quantity, @floral_source,
      @location, @harvest_date, @notes, @status, @lab_tested, @block_index, @timestamp,
      @prev_hash, @hash, @nonce
    )
  `);

  insert.run({
    batch_id: batchData.batch_id,
    beekeeper_id: batchData.beekeeper_id,
    beekeeper_name: batchData.beekeeper_name,
    hive_id: batchData.hive_id,
    quantity: Number(batchData.quantity),
    floral_source: batchData.floral_source,
    location: batchData.location,
    harvest_date: batchData.harvest_date,
    notes: batchData.notes || '',
    status: batchData.status || 'pending_review',
    lab_tested: batchData.lab_tested ? 1 : 0,
    block_index: nextIndex,
    timestamp,
    prev_hash: prevHash,
    hash,
    nonce: 0,
  });

  // Increment total_batches on beekeeper record
  db.prepare('UPDATE beekeepers SET total_batches = total_batches + 1 WHERE id = ?').run(batchData.beekeeper_id);

  return getBlockByBatchId(batchData.batch_id);
}

export function validateChainIntegrity() {
  const blocks = db.prepare('SELECT * FROM batches ORDER BY block_index ASC').all();

  if (blocks.length === 0) {
    return { valid: true, blockCount: 0 };
  }

  for (let i = 0; i < blocks.length; i++) {
    const current = blocks[i];

    // Genesis Block check
    if (i === 0) {
      if (current.prev_hash !== '0') {
        return { valid: false, tamperedIndex: 0, reason: 'Genesis block prev_hash must be 0' };
      }
      continue;
    }

    const previous = blocks[i - 1];

    // Check Previous Hash Link
    if (current.prev_hash !== previous.hash) {
      return {
        valid: false,
        tamperedIndex: current.block_index,
        batchId: current.batch_id,
        reason: `Previous hash mismatch: expected ${previous.hash.substring(0, 10)}..., found ${current.prev_hash.substring(0, 10)}...`,
      };
    }

    // Recompute Hash to detect tampering
    const blockPayload = {
      type: current.block_index === 0 ? 'genesis' : 'honey_batch',
      batchId: current.batch_id,
      beekeeperId: current.beekeeper_id,
      beekeeper: current.beekeeper_name,
      hiveId: current.hive_id,
      quantity: Number(current.quantity),
      floralSource: current.floral_source,
      location: current.location,
      harvestDate: current.harvest_date,
      labTested: Boolean(current.lab_tested),
      notes: current.notes || '',
      status: current.status,
    };

    const calculatedHash = calculateBlockHash(
      current.block_index,
      current.prev_hash,
      current.timestamp,
      blockPayload,
      current.nonce || 0
    );

    if (current.hash !== calculatedHash) {
      return {
        valid: false,
        tamperedIndex: current.block_index,
        batchId: current.batch_id,
        reason: `Data tampering detected: block hash ${current.hash.substring(0, 10)}... differs from computed hash ${calculatedHash.substring(0, 10)}...`,
      };
    }
  }

  return { valid: true, blockCount: blocks.length };
}

export function tamperBlockForDemo(batchId, tamperedData) {
  const block = getBlockByBatchId(batchId);
  if (!block) return false;

  // Intentionally alter data in the database WITHOUT updating the SHA-256 hash
  // This simulates a malicious database modification or man-in-the-middle tampering
  const updates = [];
  const params = { batchId };

  if (tamperedData.quantity !== undefined) {
    updates.push('quantity = @quantity');
    params.quantity = Number(tamperedData.quantity);
  }
  if (tamperedData.floral_source !== undefined) {
    updates.push('floral_source = @floral_source');
    params.floral_source = String(tamperedData.floral_source);
  }
  if (tamperedData.notes !== undefined) {
    updates.push('notes = @notes');
    params.notes = String(tamperedData.notes);
  }

  if (updates.length === 0) return false;

  const stmt = db.prepare(`UPDATE batches SET ${updates.join(', ')} WHERE batch_id = @batchId`);
  stmt.run(params);
  return true;
}

export function restoreChainIntegrity() {
  const blocks = db.prepare('SELECT * FROM batches ORDER BY block_index ASC').all();
  
  for (let i = 0; i < blocks.length; i++) {
    const current = blocks[i];
    const prevHash = i === 0 ? '0' : blocks[i - 1].hash;

    const blockPayload = current.block_index === 0
      ? { type: 'genesis', message: 'KVIC Honey Mission — Genesis Block' }
      : {
          type: 'honey_batch',
          batchId: current.batch_id,
          beekeeperId: current.beekeeper_id,
          beekeeper: current.beekeeper_name,
          hiveId: current.hive_id,
          quantity: Number(current.quantity),
          floralSource: current.floral_source,
          location: current.location,
          harvestDate: current.harvest_date,
          labTested: Boolean(current.lab_tested),
          notes: current.notes || '',
          status: current.status,
        };

    const validHash = calculateBlockHash(
      current.block_index,
      prevHash,
      current.timestamp,
      blockPayload,
      current.nonce || 0
    );

    db.prepare('UPDATE batches SET prev_hash = ?, hash = ? WHERE id = ?').run(prevHash, validHash, current.id);
    blocks[i].prev_hash = prevHash;
    blocks[i].hash = validHash;
  }
  return true;
}
