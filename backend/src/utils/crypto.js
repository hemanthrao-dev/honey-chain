import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;

export function hashString(str) {
  return crypto.createHash('sha256').update(String(str)).digest('hex');
}

export function generateLabCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(8);
  let seg1 = '';
  let seg2 = '';
  for (let i = 0; i < 4; i++) {
    seg1 += chars[bytes[i] % chars.length];
    seg2 += chars[bytes[i + 4] % chars.length];
  }
  return `KVIC-${seg1}-${seg2}`;
}

export function hashLabCode(code) {
  const normalized = String(code || '').trim().toUpperCase();
  return crypto.createHash('sha256').update(`KVIC_SALT_${normalized}`).digest('hex');
}

export function verifyLabCode(inputCode, storedHash) {
  if (!inputCode || !storedHash) return false;
  const computedHash = hashLabCode(inputCode);
  
  const hashBuffer = Buffer.from(computedHash, 'hex');
  const storedBuffer = Buffer.from(storedHash, 'hex');

  if (hashBuffer.length !== storedBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(hashBuffer, storedBuffer);
}

export async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

export async function comparePassword(plainPassword, hashedPassword) {
  return bcrypt.compare(plainPassword, hashedPassword);
}

export function generateBatchId(beekeeperId = 'BK001', hiveId = 'HIVE001') {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `HB-${beekeeperId}-${hiveId}-${timestamp}-${randomSuffix}`;
}
