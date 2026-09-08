import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from closest .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const dbPath = process.env.DB_PATH 
  ? path.resolve(process.cwd(), process.env.DB_PATH)
  : path.resolve(__dirname, '../../data/honey_chain.db');

// Ensure directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function calculateBlockHash(index, prevHash, timestamp, data, nonce = 0) {
  return crypto
    .createHash('sha256')
    .update(index + prevHash + timestamp + JSON.stringify(data) + nonce)
    .digest('hex');
}

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      identifier TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'beekeeper', 'consumer')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS beekeepers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      hives TEXT NOT NULL DEFAULT '[]',
      registration_date TEXT NOT NULL,
      total_batches INTEGER DEFAULT 0,
      rating REAL DEFAULT 4.5,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id TEXT UNIQUE NOT NULL,
      beekeeper_id TEXT NOT NULL,
      beekeeper_name TEXT NOT NULL,
      hive_id TEXT NOT NULL,
      quantity REAL NOT NULL,
      floral_source TEXT NOT NULL,
      location TEXT NOT NULL,
      harvest_date TEXT NOT NULL,
      notes TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending_review',
      lab_tested INTEGER DEFAULT 0,
      block_index INTEGER NOT NULL,
      timestamp INTEGER NOT NULL,
      prev_hash TEXT NOT NULL,
      hash TEXT NOT NULL,
      nonce INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS lab_certificates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id TEXT UNIQUE NOT NULL,
      beekeeper_id TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      plain_code_demo TEXT,
      expires_at TEXT NOT NULL,
      is_used INTEGER DEFAULT 0,
      used_at TEXT,
      issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      actor_role TEXT,
      actor_id TEXT,
      target_id TEXT,
      ip_address TEXT,
      details TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  seedDefaultData();
}

function seedDefaultData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;
    const adminPass = bcrypt.hashSync('AdminPassword123!', saltRounds);
    const bkPass = bcrypt.hashSync('Beekeeper123!', saltRounds);
    const consumerPass = bcrypt.hashSync('Consumer123!', saltRounds);

    const insertUser = db.prepare(`
      INSERT INTO users (name, email, identifier, password_hash, role)
      VALUES (@name, @email, @identifier, @password_hash, @role)
    `);

    insertUser.run({
      name: 'KVIC National Mission Officer',
      email: 'admin@kvic.gov.in',
      identifier: 'KVIC-ADMIN-01',
      password_hash: adminPass,
      role: 'admin',
    });

    insertUser.run({
      name: 'Rameshwar Patel',
      email: 'beekeeper@honeychain.in',
      identifier: 'BK001',
      password_hash: bkPass,
      role: 'beekeeper',
    });

    insertUser.run({
      name: 'Aditi Sharma',
      email: 'consumer@honeychain.in',
      identifier: 'consumer@honeychain.in',
      password_hash: consumerPass,
      role: 'consumer',
    });
  }

  const beekeeperCount = db.prepare('SELECT COUNT(*) as count FROM beekeepers').get().count;
  if (beekeeperCount === 0) {
    const insertBk = db.prepare(`
      INSERT INTO beekeepers (id, name, location, hives, registration_date, total_batches, rating)
      VALUES (@id, @name, @location, @hives, @registration_date, @total_batches, @rating)
    `);

    insertBk.run({
      id: 'BK001',
      name: 'Rameshwar Patel',
      location: 'Sunderbans Apiary Cluster, South 24 Parganas, West Bengal',
      hives: JSON.stringify(['HIVE001', 'HIVE002', 'HIVE003']),
      registration_date: '2026-01-15',
      total_batches: 2,
      rating: 4.9,
    });

    insertBk.run({
      id: 'BK002',
      name: 'Gurpreet Singh',
      location: 'Mustard Valley, Bathinda, Punjab',
      hives: JSON.stringify(['HIVE004', 'HIVE005']),
      registration_date: '2026-02-10',
      total_batches: 1,
      rating: 4.8,
    });
  }

  const batchCount = db.prepare('SELECT COUNT(*) as count FROM batches').get().count;
  if (batchCount === 0) {
    // 1. Genesis Block (Index 0)
    const genesisTime = 1770000000000;
    const genesisData = { type: 'genesis', message: 'KVIC Honey Mission — Genesis Block' };
    const genesisHash = calculateBlockHash(0, '0', genesisTime, genesisData, 0);

    const insertBatch = db.prepare(`
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

    insertBatch.run({
      batch_id: 'GENESIS-BLOCK-000',
      beekeeper_id: 'SYSTEM',
      beekeeper_name: 'KVIC Genesis Authority',
      hive_id: 'HIVE-000',
      quantity: 0,
      floral_source: 'Genesis Flora',
      location: 'New Delhi, India',
      harvest_date: new Date(genesisTime).toISOString(),
      notes: 'Initial Proof of Trust Genesis Block for KVIC Honey Mission Ledger',
      status: 'verified',
      lab_tested: 1,
      block_index: 0,
      timestamp: genesisTime,
      prev_hash: '0',
      hash: genesisHash,
      nonce: 0,
    });

    // 2. Demo Batch 1
    const b1Time = genesisTime + 86400000 * 5;
    const b1Data = {
      type: 'honey_batch',
      batchId: 'HB-DEMO-BK001-HIVE001',
      beekeeperId: 'BK001',
      beekeeper: 'Rameshwar Patel',
      hiveId: 'HIVE001',
      quantity: 24.5,
      floralSource: 'Wild Forest',
      location: 'Sunderbans Apiary Cluster, South 24 Parganas, West Bengal',
      harvestDate: new Date(b1Time).toISOString(),
      labTested: true,
      notes: 'Harvest from Rameshwar Patel apiary at HIVE001.',
      status: 'KVIC Verified & Lab Tested',
    };
    const b1Hash = calculateBlockHash(1, genesisHash, b1Time, b1Data, 0);

    insertBatch.run({
      batch_id: 'HB-DEMO-BK001-HIVE001',
      beekeeper_id: 'BK001',
      beekeeper_name: 'Rameshwar Patel',
      hive_id: 'HIVE001',
      quantity: 24.5,
      floral_source: 'Wild Forest',
      location: 'Sunderbans Apiary Cluster, South 24 Parganas, West Bengal',
      harvest_date: new Date(b1Time).toISOString(),
      notes: 'Harvest from Rameshwar Patel apiary at HIVE001.',
      status: 'KVIC Verified & Lab Tested',
      lab_tested: 1,
      block_index: 1,
      timestamp: b1Time,
      prev_hash: genesisHash,
      hash: b1Hash,
      nonce: 0,
    });

    // 3. Demo Batch 2
    const b2Time = b1Time + 86400000 * 3;
    const b2Data = {
      type: 'honey_batch',
      batchId: 'HB-DEMO-BK001-HIVE002',
      beekeeperId: 'BK001',
      beekeeper: 'Rameshwar Patel',
      hiveId: 'HIVE002',
      quantity: 18.0,
      floralSource: 'Multiflora (Mixed)',
      location: 'Sunderbans Apiary Cluster, South 24 Parganas, West Bengal',
      harvestDate: new Date(b2Time).toISOString(),
      labTested: true,
      notes: 'Harvest from Rameshwar Patel apiary at HIVE002.',
      status: 'KVIC Verified & Lab Tested',
    };
    const b2Hash = calculateBlockHash(2, b1Hash, b2Time, b2Data, 0);

    insertBatch.run({
      batch_id: 'HB-DEMO-BK001-HIVE002',
      beekeeper_id: 'BK001',
      beekeeper_name: 'Rameshwar Patel',
      hive_id: 'HIVE002',
      quantity: 18.0,
      floral_source: 'Multiflora (Mixed)',
      location: 'Sunderbans Apiary Cluster, South 24 Parganas, West Bengal',
      harvest_date: new Date(b2Time).toISOString(),
      notes: 'Harvest from Rameshwar Patel apiary at HIVE002.',
      status: 'KVIC Verified & Lab Tested',
      lab_tested: 1,
      block_index: 2,
      timestamp: b2Time,
      prev_hash: b1Hash,
      hash: b2Hash,
      nonce: 0,
    });

    // 4. Demo Batch 3 (Pending review)
    const b3Time = b2Time + 86400000 * 2;
    const b3Data = {
      type: 'honey_batch',
      batchId: 'HB-DEMO-BK002-HIVE004',
      beekeeperId: 'BK002',
      beekeeper: 'Gurpreet Singh',
      hiveId: 'HIVE004',
      quantity: 15.2,
      floralSource: 'Mustard',
      location: 'Mustard Valley, Bathinda, Punjab',
      harvestDate: new Date(b3Time).toISOString(),
      labTested: false,
      notes: 'Fresh mustard blossom harvest awaiting KVIC lab inspection.',
      status: 'pending_review',
    };
    const b3Hash = calculateBlockHash(3, b2Hash, b3Time, b3Data, 0);

    insertBatch.run({
      batch_id: 'HB-DEMO-BK002-HIVE004',
      beekeeper_id: 'BK002',
      beekeeper_name: 'Gurpreet Singh',
      hive_id: 'HIVE004',
      quantity: 15.2,
      floral_source: 'Mustard',
      location: 'Mustard Valley, Bathinda, Punjab',
      harvest_date: new Date(b3Time).toISOString(),
      notes: 'Fresh mustard blossom harvest awaiting KVIC lab inspection.',
      status: 'pending_review',
      lab_tested: 0,
      block_index: 3,
      timestamp: b3Time,
      prev_hash: b2Hash,
      hash: b3Hash,
      nonce: 0,
    });
  }
}
