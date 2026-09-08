// Input validation and sanitization utilities

/**
 * Sanitize string input to prevent XSS attacks
 */
export function sanitizeString(input) {
  if (typeof input !== 'string') return '';

  // Remove any HTML tags and script content
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

/**
 * Validate batch ID format
 */
export function validateBatchId(batchId) {
  if (typeof batchId !== 'string') return false;

  // Batch ID format: HB-{timestamp}-{alphanumeric}
  const batchIdRegex = /^HB-\d{13}-[A-Z0-9]{6}$/;
  return batchIdRegex.test(batchId);
}

/**
 * Validate and sanitize honey batch data
 */
export function validateBatchData(data) {
  const errors = [];

  if (!data.quantity || isNaN(parseFloat(data.quantity))) {
    errors.push('Quantity must be a valid number');
  } else if (parseFloat(data.quantity) <= 0 || parseFloat(data.quantity) > 1000) {
    errors.push('Quantity must be between 0 and 1000 kg');
  }

  if (!data.floralSource || typeof data.floralSource !== 'string') {
    errors.push('Floral source is required');
  } else if (data.floralSource.length > 100) {
    errors.push('Floral source name too long (max 100 characters)');
  }

  if (!data.hiveId || typeof data.hiveId !== 'string') {
    errors.push('Hive ID is required');
  } else if (!/^HIVE\d{3}$/.test(data.hiveId)) {
    errors.push('Invalid hive ID format (expected: HIVE###)');
  }

  if (!data.beekeeper || typeof data.beekeeper !== 'string') {
    errors.push('Beekeeper name is required');
  } else if (data.beekeeper.length > 100) {
    errors.push('Beekeeper name too long (max 100 characters)');
  }

  if (!data.location || typeof data.location !== 'string') {
    errors.push('Location is required');
  } else if (data.location.length > 200) {
    errors.push('Location too long (max 200 characters)');
  }

  if (data.notes && typeof data.notes === 'string' && data.notes.length > 500) {
    errors.push('Notes too long (max 500 characters)');
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: {
      type: 'honey_batch',
      batchId: sanitizeString(data.batchId),
      beekeeperId: sanitizeString(data.beekeeperId),
      beekeeper: sanitizeString(data.beekeeper),
      hiveId: sanitizeString(data.hiveId),
      quantity: parseFloat(data.quantity),
      floralSource: sanitizeString(data.floralSource),
      location: sanitizeString(data.location),
      harvestDate: data.harvestDate instanceof Date ? data.harvestDate.toISOString() : new Date().toISOString(),
      labTested: Boolean(data.labTested),
      notes: data.notes ? sanitizeString(data.notes) : '',
      status: sanitizeString(data.status) || 'registered',
    }
  };
}

/**
 * Validate sensor data
 */
export function validateSensorData(data) {
  if (!data || typeof data !== 'object') return false;

  if (typeof data.temperature !== 'number' || data.temperature < -10 || data.temperature > 60) {
    return false;
  }

  if (typeof data.humidity !== 'number' || data.humidity < 0 || data.humidity > 100) {
    return false;
  }

  if (typeof data.weight !== 'number' || data.weight < 0 || data.weight > 200) {
    return false;
  }

  if (!data.timestamp || isNaN(new Date(data.timestamp).getTime())) {
    return false;
  }

  return true;
}

/**
 * Rate limiting helper for localStorage operations
 */
const rateLimitStore = new Map();

export function checkRateLimit(key, maxRequests = 10, windowMs = 60000) {
  const now = Date.now();
  const record = rateLimitStore.get(key) || { count: 0, resetAt: now + windowMs };

  if (now > record.resetAt) {
    // Reset the window
    record.count = 1;
    record.resetAt = now + windowMs;
    rateLimitStore.set(key, record);
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  rateLimitStore.set(key, record);
  return true;
}

/**
 * Validate block integrity
 */
export function validateBlockStructure(block) {
  if (!block || typeof block !== 'object') return false;

  const requiredFields = ['index', 'timestamp', 'data', 'previousHash', 'hash'];
  for (const field of requiredFields) {
    if (!(field in block)) return false;
  }

  if (typeof block.index !== 'number' || block.index < 0) return false;
  if (typeof block.timestamp !== 'number' || block.timestamp < 0) return false;
  if (typeof block.hash !== 'string' || block.hash.length !== 64) return false;
  if (typeof block.previousHash !== 'string') return false;
  if (!block.data || typeof block.data !== 'object') return false;

  return true;
}

/**
 * Prevent prototype pollution
 */
export function sanitizeObject(obj) {
  if (obj === null || typeof obj !== 'object') return obj;

  // Remove dangerous keys
  const dangerousKeys = ['__proto__', 'constructor', 'prototype'];

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (!dangerousKeys.includes(key)) {
      sanitized[key] = typeof value === 'object' ? sanitizeObject(value) : value;
    }
  }

  return sanitized;
}
