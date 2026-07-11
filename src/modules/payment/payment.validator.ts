import { body, query, ValidationChain } from 'express-validator';

/**
 * Validation rules for creating payment
 */
export const createPaymentValidation: ValidationChain[] = [
  body('orderId')
    .trim()
    .isUUID()
    .withMessage('Invalid order ID'),

  body('method')
    .trim()
    .isIn(['STRIPE'])
    .withMessage('Payment method must be STRIPE'),

  body('currency')
    .optional()
    .trim()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency code must be 3 characters (e.g., USD)'),

  body('successUrl')
    .optional()
    .isURL()
    .withMessage('Success URL must be a valid URL'),

  body('cancelUrl')
    .optional()
    .isURL()
    .withMessage('Cancel URL must be a valid URL'),

  body('failUrl')
    .optional()
    .isURL()
    .withMessage('Fail URL must be a valid URL'),
];

/**
 * Validation rules for confirming payment
 */
export const confirmPaymentValidation: ValidationChain[] = [
  body('paymentId')
    .trim()
    .notEmpty()
    .withMessage('Payment ID is required'),

  body('providerResponse')
    .optional()
    .isObject()
    .withMessage('Provider response must be a valid JSON object'),

  body('mockSuccess')
    .optional()
    .isBoolean()
    .withMessage('mockSuccess must be a boolean'),
];

/**
 * Validation rules for payment query parameters
 */
export const paymentQueryValidation: ValidationChain[] = [
  query('status')
    .optional()
    .trim()
    .isIn(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'])
    .withMessage('Status must be one of: PENDING, COMPLETED, FAILED, REFUNDED'),

  query('method')
    .optional()
    .trim()
    .isIn(['STRIPE'])
    .withMessage('Method must be STRIPE'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page number must be at least 1'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('sortBy')
    .optional()
    .trim()
    .isIn(['createdAt', 'amount', 'status'])
    .withMessage('Sort by must be one of: createdAt, amount, status'),

  query('sortOrder')
    .optional()
    .trim()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be either asc or desc'),
];