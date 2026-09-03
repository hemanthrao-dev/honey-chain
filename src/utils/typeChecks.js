// Type checking utilities for runtime validation

/**
 * Check if value is a valid number within range
 */
export function isValidNumber(value, min = -Infinity, max = Infinity) {
  const num = Number(value);
  return !isNaN(num) && isFinite(num) && num >= min && num <= max;
}

/**
 * Check if value is a valid string with length constraints
 */
export function isValidString(value, minLength = 0, maxLength = Infinity) {
  return typeof value === 'string' &&
         value.length >= minLength &&
         value.length <= maxLength;
}

/**
 * Check if value is a valid date
 */
export function isValidDate(value) {
  const date = new Date(value);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Type-safe object property getter
 */
export function safeGet(obj, path, defaultValue = null) {
  try {
    const keys = path.split('.');
    let result = obj;

    for (const key of keys) {
      if (result === null || result === undefined || typeof result !== 'object') {
        return defaultValue;
      }
      result = result[key];
    }

    return result !== undefined ? result : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Deep clone object safely (prevents prototype pollution)
 */
export function safeClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }

  if (Array.isArray(obj)) {
    return obj.map(item => safeClone(item));
  }

  const cloned = {};
  const dangerousKeys = ['__proto__', 'constructor', 'prototype'];

  for (const [key, value] of Object.entries(obj)) {
    if (!dangerousKeys.includes(key)) {
      cloned[key] = safeClone(value);
    }
  }

  return cloned;
}

/**
 * Validate email format (for future use)
 */
export function isValidEmail(email) {
  if (!isValidString(email, 3, 254)) return false;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number (Indian format)
 */
export function isValidPhone(phone) {
  if (typeof phone !== 'string') return false;

  // Indian phone number: 10 digits, optional +91 prefix
  const phoneRegex = /^(\+91)?[6-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/[\s-]/g, ''));
}

/**
 * Check if array has valid length and all elements pass validator
 */
export function isValidArray(arr, validator, minLength = 0, maxLength = Infinity) {
  if (!Array.isArray(arr)) return false;
  if (arr.length < minLength || arr.length > maxLength) return false;

  if (validator) {
    return arr.every(item => validator(item));
  }

  return true;
}

/**
 * Validate GPS coordinates
 */
export function isValidCoordinates(lat, lng) {
  return isValidNumber(lat, -90, 90) && isValidNumber(lng, -180, 180);
}

/**
 * Ensure value is within allowed enum values
 */
export function isInEnum(value, allowedValues) {
  return allowedValues.includes(value);
}

/**
 * Batch validator - combines multiple validation rules
 */
export function createValidator(rules) {
  return (data) => {
    const errors = [];

    for (const [field, rule] of Object.entries(rules)) {
      const value = data[field];

      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
        continue;
      }

      if (!rule.required && (value === undefined || value === null || value === '')) {
        continue;
      }

      if (rule.type === 'string' && !isValidString(value, rule.minLength, rule.maxLength)) {
        errors.push(`${field} must be a string between ${rule.minLength || 0} and ${rule.maxLength || 'unlimited'} characters`);
      }

      if (rule.type === 'number' && !isValidNumber(value, rule.min, rule.max)) {
        errors.push(`${field} must be a number between ${rule.min || '-∞'} and ${rule.max || '∞'}`);
      }

      if (rule.type === 'date' && !isValidDate(value)) {
        errors.push(`${field} must be a valid date`);
      }

      if (rule.type === 'email' && !isValidEmail(value)) {
        errors.push(`${field} must be a valid email address`);
      }

      if (rule.type === 'phone' && !isValidPhone(value)) {
        errors.push(`${field} must be a valid phone number`);
      }

      if (rule.type === 'array' && !isValidArray(value, rule.itemValidator, rule.minLength, rule.maxLength)) {
        errors.push(`${field} must be a valid array`);
      }

      if (rule.enum && !isInEnum(value, rule.enum)) {
        errors.push(`${field} must be one of: ${rule.enum.join(', ')}`);
      }

      if (rule.custom && !rule.custom(value)) {
        errors.push(rule.customError || `${field} is invalid`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  };
}

// Export a beekeeper data validator as example
export const beekeeperValidator = createValidator({
  id: { required: true, type: 'string', minLength: 3, maxLength: 20 },
  name: { required: true, type: 'string', minLength: 2, maxLength: 100 },
  location: { required: true, type: 'string', minLength: 5, maxLength: 200 },
  hives: {
    required: true,
    type: 'array',
    minLength: 1,
    maxLength: 100,
    itemValidator: (hive) => /^HIVE\d{3}$/.test(hive)
  },
  rating: { required: false, type: 'number', min: 0, max: 5 },
});
