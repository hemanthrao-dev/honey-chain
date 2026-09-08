import { body, param, validationResult } from 'express-validator';

export function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorList = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value,
    }));

    return res.status(400).json({
      success: false,
      error: errorList[0].message,
      errors: errorList,
    });
  }
  next();
}

export const validateRegister = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s.-]+$/).withMessage('Name must contain only alphabets and basic punctuation'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email address format')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),

  body('role')
    .notEmpty().withMessage('Role is required')
    .isIn(['admin', 'beekeeper', 'consumer']).withMessage('Role must be one of: admin, beekeeper, consumer'),

  body('identifier')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 }).withMessage('Identifier must be 3-50 characters'),

  handleValidationErrors,
];

export const validateLogin = [
  body('identifier')
    .trim()
    .notEmpty().withMessage('Identifier, Email or Beekeeper ID is required'),

  body('password')
    .optional()
    .isString().withMessage('Password must be a string'),

  body('authMethod')
    .optional()
    .isIn(['password', 'otp']).withMessage('Auth method must be password or otp'),

  body('otp')
    .optional()
    .trim(),

  handleValidationErrors,
];

export const validateBeekeeper = [
  body('name')
    .trim()
    .notEmpty().withMessage('Beekeeper name is required')
    .matches(/^[a-zA-Z\s]+$/).withMessage('Beekeeper name must contain only alphabets and spaces'),

  body('location')
    .trim()
    .notEmpty().withMessage('Location is required')
    .isLength({ min: 3, max: 200 }).withMessage('Location must be between 3 and 200 characters'),

  body('hives')
    .custom((value) => {
      const hives = Array.isArray(value)
        ? value
        : typeof value === 'string'
          ? value.split(',').map(h => h.trim()).filter(Boolean)
          : [];

      for (const h of hives) {
        if (!/^HIVE\d{3}$/.test(h)) {
          throw new Error(`Invalid Hive ID format "${h}". Must be in format HIVE001-HIVE999`);
        }
      }
      return true;
    }),

  body('rating')
    .optional()
    .isFloat({ min: 1, max: 5 }).withMessage('Rating must be between 1.0 and 5.0'),

  body('registrationDate')
    .optional()
    .isISO8601().withMessage('Registration date must be a valid date'),

  handleValidationErrors,
];

export const validateBatch = [
  body('beekeeperId')
    .trim()
    .notEmpty().withMessage('Beekeeper ID is required'),

  body('hiveId')
    .trim()
    .notEmpty().withMessage('Hive ID is required')
    .matches(/^HIVE\d{3}$/).withMessage('Invalid Hive ID format (e.g. HIVE001)'),

  body('quantity')
    .notEmpty().withMessage('Quantity is required')
    .isFloat({ gt: 0, lte: 1000 }).withMessage('Quantity must be a positive number up to 1000 kg'),

  body('floralSource')
    .trim()
    .notEmpty().withMessage('Floral source is required')
    .isLength({ min: 2, max: 100 }).withMessage('Floral source must be between 2 and 100 characters'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),

  handleValidationErrors,
];

export const validateCodeVerification = [
  param('batchId')
    .trim()
    .notEmpty().withMessage('Batch ID parameter is required'),

  body('code')
    .trim()
    .notEmpty().withMessage('Verification code is required')
    .matches(/^KVIC-[A-Z0-9]{4}-[A-Z0-9]{4}$/).withMessage('Invalid verification code format (expected KVIC-XXXX-XXXX)'),

  handleValidationErrors,
];
