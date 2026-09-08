const STORAGE_KEY = 'honey_lab_certificates';
const CODE_PATTERN = /^KVIC-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

function getCertificates() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('Error loading lab certificates:', error);
    return [];
  }
}

function saveCertificates(certificates) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(certificates));
  } catch (error) {
    console.error('Error saving lab certificates:', error);
  }
  return certificates;
}

function randomSegment(length) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}

function generateUniqueCode(existingCodes) {
  let code = '';
  do {
    code = `KVIC-${randomSegment(4)}-${randomSegment(4)}`;
  } while (existingCodes.includes(code));
  return code;
}

export function getCertificateForBatch(batchId) {
  return getCertificates().find(cert => cert.batchId === batchId);
}

export function issueLabCertificate(batchId, beekeeperId, beekeeperName) {
  const certificates = getCertificates();
  if (certificates.some(cert => cert.batchId === batchId)) {
    return { ok: false, error: 'A Lab Certificate code has already been issued for this batch.' };
  }

  const code = generateUniqueCode(certificates.map(cert => cert.code));
  certificates.push({
    batchId,
    beekeeperId,
    beekeeperName: beekeeperName || '',
    code,
    issuedAt: new Date().toISOString(),
    usedAt: null,
  });
  saveCertificates(certificates);
  return { ok: true, code };
}

export function applyLabCode(batchId, beekeeperId, code) {
  const certificates = getCertificates();
  const certificate = certificates.find(cert => cert.batchId === batchId);

  if (!certificate) {
    return { ok: false, error: 'No Lab Certificate issued for this batch yet. Wait for KVIC Admin approval.' };
  }

  if (certificate.beekeeperId !== beekeeperId) {
    return { ok: false, error: 'This Lab Certificate belongs to a different beekeeper profile.' };
  }

  const normalizedCode = String(code || '').trim().toUpperCase();
  if (!CODE_PATTERN.test(normalizedCode)) {
    return { ok: false, error: 'Invalid code format. Expected format: KVIC-XXXX-XXXX' };
  }
  if (normalizedCode !== certificate.code) {
    return { ok: false, error: 'Invalid Lab Certificate Verification Code. Check with KVIC Admin.' };
  }
  if (certificate.usedAt) {
    return { ok: false, error: 'This Lab Certificate code has already been used for this batch.' };
  }

  certificate.usedAt = new Date().toISOString();
  saveCertificates(certificates);
  return { ok: true };
}

export function isLabCertified(block) {
  return getBatchLabStatus(block) === 'certified';
}

export function getBatchLabStatus(block) {
  if (!block || !block.data) return 'pending';
  if (block.data.labTested) return 'certified';

  const certificate = getCertificateForBatch(block.data.batchId);
  if (!certificate) return 'pending';
  if (certificate.usedAt) return 'certified';
  return 'issued';
}