import { body, query, ValidationChain } from 'express-validator';

/**
 * Validation rules for creating a rental order
 */
export const createRentalValidation: ValidationChain[] = [
  body('items')
    .isArray({ min: 1, max: 20 })
    .withMessage('Items must be an array with 1 to 20 gear items'),

  body('items.*.gearId')
    .trim()
    .isUUID()
    .withMessage('Each item must have a valid gear ID'),

  body('items.*.quantity')
    .isInt({ min: 1, max: 10 })
    .withMessage('Quantity must be between 1 and 10 for each item'),

  body('startDate')
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date')
    .custom((value) => {
      const startDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (startDate < today) {
        throw new Error('Start date cannot be in the past');
      }
      return true;
    }),

  body('endDate')
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      const endDate = new Date(value);
      const startDate = new Date(req.body.startDate);
      if (endDate <= startDate) {
        throw new Error('End date must be after start date');
      }
      // Maximum rental period of 30 days
      const maxEndDate = new Date(startDate);
      maxEndDate.setDate(maxEndDate.getDate() + 30);
      if (endDate > maxEndDate) {
        throw new Error('Rental period cannot exceed 30 days');
      }
      return true;
    }),

  body('pickupAddress')
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Pickup address must be between 10 and 500 characters'),

  body('returnAddress')
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Return address must be between 10 and 500 characters'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must not exceed 1000 characters'),
];

/**
 * Validation rules for updating rental order status
 */
export const updateOrderStatusValidation: ValidationChain[] = [
  body('status')
    .trim()
    .isIn(['CONFIRMED', 'PAID', 'PICKED_UP', 'RETURNED', 'CANCELLED'])
    .withMessage('Status must be one of: CONFIRMED, PAID, PICKED_UP, RETURNED, CANCELLED'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must not exceed 1000 characters'),
];

/**
 * Validation rules for rental query parameters
 */
export const rentalQueryValidation: ValidationChain[] = [
  query('status')
    .optional()
    .trim()
    .isIn(['PLACED', 'CONFIRMED', 'PAID', 'PICKED_UP', 'RETURNED', 'CANCELLED'])
    .withMessage('Status filter must be a valid order status'),

  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date filter must be a valid ISO 8601 date'),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date filter must be a valid ISO 8601 date'),

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
    .isIn(['createdAt', 'startDate', 'totalAmount', 'status'])
    .withMessage('Sort by must be one of: createdAt, startDate, totalAmount, status'),

  query('sortOrder')
    .optional()
    .trim()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be either asc or desc'),
];